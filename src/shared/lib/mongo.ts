import { setServers } from 'node:dns';

import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;
/** mongoose.ConnectionStates.connected */
const READY_STATE_CONNECTED = 1;

class MongoClientManager {
  private pending: Promise<void> | null = null;

  /**
   * mongodb+srv:// URIs need a DNS SRV lookup. On some Windows setups Node's resolver falls back to
   * 127.0.0.1 and the lookup fails with "querySrv ECONNREFUSED". MONGO_DNS_SERVERS (comma-separated)
   * pins the resolver, e.g. "192.168.0.1,8.8.8.8". Unset = system default.
   */
  private applyDnsOverride(): void {
    const servers = process.env.MONGO_DNS_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean);
    if (servers?.length) setServers(servers);
  }

  /**
   * The live connection state is the source of truth, never a cached flag: mongoose.connect() resolves
   * immediately when a connect is already in flight, so a flag set by a concurrent caller would claim
   * "connected" while the real attempt is still running, and stay true if that attempt then failed,
   * leaving every query to buffer until it times out. Concurrent callers share one attempt.
   */
  async connect(retries = MAX_RETRIES): Promise<void> {
    if (mongoose.connection.readyState === READY_STATE_CONNECTED) return;
    this.pending ??= this.open(retries).finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async open(retries: number): Promise<void> {
    this.applyDnsOverride();
    for (let attempt = 1; ; attempt++) {
      try {
        await mongoose.connect(process.env.MONGO_URI!);
        if (mongoose.connection.readyState !== READY_STATE_CONNECTED) await mongoose.connection.asPromise();
        console.log('Connected to MongoDB');
        return;
      } catch (error) {
        if (attempt > retries) throw error;
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`MongoDB connection failed (${reason}), retrying... (${attempt}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  async disconnect(): Promise<void> {
    if (mongoose.connection.readyState === READY_STATE_CONNECTED) await mongoose.disconnect();
  }
}

export const mongo = new MongoClientManager();
export { MongoClientManager };

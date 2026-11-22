import { setServers } from 'node:dns';

import mongoose from 'mongoose';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

class MongoClientManager {
  private isConnected = false;

  /**
   * mongodb+srv:// URIs need a DNS SRV lookup. On some Windows setups Node's resolver falls back to
   * 127.0.0.1 and the lookup fails with "querySrv ECONNREFUSED". MONGO_DNS_SERVERS (comma-separated)
   * pins the resolver, e.g. "192.168.0.1,8.8.8.8". Unset = system default.
   */
  private applyDnsOverride(): void {
    const servers = process.env.MONGO_DNS_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean);
    if (servers?.length) setServers(servers);
  }

  async connect(retries = MAX_RETRIES): Promise<void> {
    if (this.isConnected) return;
    this.applyDnsOverride();
    try {
      await mongoose.connect(process.env.MONGO_URI!);
      this.isConnected = true;
      console.log('Connected to MongoDB');
    } catch (error) {
      if (retries <= 0) throw error;
      console.warn(`MongoDB connection failed, retrying... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return this.connect(retries - 1);
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
    }
  }
}

export const mongo = new MongoClientManager();
export { MongoClientManager };

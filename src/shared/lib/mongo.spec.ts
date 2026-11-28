import { setServers } from 'node:dns';

import mongoose from 'mongoose';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:dns', () => {
  const setServers = vi.fn();
  return { setServers, default: { setServers } };
});

const connection = vi.hoisted(() => ({ readyState: 0, asPromise: vi.fn() }));

vi.mock('mongoose', async (importOriginal) => {
  const actual = await importOriginal<typeof mongoose>();
  return {
    default: {
      ...actual,
      connect: vi.fn(),
      disconnect: vi.fn(),
      connection,
    },
  };
});

import { MongoClientManager } from './mongo';

const connectSucceeds = () =>
  vi.mocked(mongoose.connect).mockImplementation(async () => {
    connection.readyState = 1;
    return mongoose;
  });

describe('MongoClientManager', () => {
  let manager: MongoClientManager;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mongoose.connect).mockReset();
    connection.readyState = 0;
    manager = new MongoClientManager();
  });

  it('connects to MongoDB on first call', async () => {
    connectSucceeds();
    await manager.connect();
    expect(mongoose.connect).toHaveBeenCalledOnce();
    expect(mongoose.connect).toHaveBeenCalledWith(process.env.MONGO_URI);
  });

  it('does not reconnect when already connected', async () => {
    connectSucceeds();
    await manager.connect();
    await manager.connect();
    expect(mongoose.connect).toHaveBeenCalledOnce();
  });

  it('shares one attempt between concurrent callers', async () => {
    connectSucceeds();
    await Promise.all([manager.connect(), manager.connect(), manager.connect()]);
    expect(mongoose.connect).toHaveBeenCalledOnce();
  });

  it('waits for the real open when mongoose returns early during an in-flight connect', async () => {
    vi.mocked(mongoose.connect).mockResolvedValueOnce(mongoose);
    connection.asPromise.mockImplementationOnce(async () => {
      connection.readyState = 1;
    });
    await manager.connect();
    expect(connection.asPromise).toHaveBeenCalledOnce();
  });

  it('reconnects when a concurrent caller saw success but the real attempt failed', async () => {
    vi.mocked(mongoose.connect).mockResolvedValueOnce(mongoose);
    connection.asPromise.mockRejectedValueOnce(new Error('querySrv ETIMEOUT'));
    connectSucceeds();
    await manager.connect();
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
    expect(connection.readyState).toBe(1);
  });

  it('reconnects after the connection drops', async () => {
    connectSucceeds();
    await manager.connect();
    connection.readyState = 0;
    await manager.connect();
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });

  it('retries on failure then succeeds', async () => {
    vi.mocked(mongoose.connect).mockRejectedValueOnce(new Error('fail'));
    connectSucceeds();
    await manager.connect();
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries exhausted, and a later call tries again', async () => {
    vi.mocked(mongoose.connect).mockRejectedValue(new Error('always fail'));
    await expect(manager.connect(0)).rejects.toThrow('always fail');
    await expect(manager.connect(0)).rejects.toThrow('always fail');
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });

  it('disconnect calls mongoose.disconnect when connected', async () => {
    connectSucceeds();
    vi.mocked(mongoose.disconnect).mockImplementationOnce(async () => {
      connection.readyState = 0;
    });
    await manager.connect();
    await manager.disconnect();
    expect(mongoose.disconnect).toHaveBeenCalledOnce();
    await manager.connect();
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });

  it('disconnect is a no-op when not connected', async () => {
    vi.mocked(mongoose.disconnect).mockResolvedValueOnce();
    await manager.disconnect();
    expect(mongoose.disconnect).not.toHaveBeenCalled();
  });

  it('pins DNS servers when MONGO_DNS_SERVERS is set', async () => {
    vi.stubEnv('MONGO_DNS_SERVERS', '192.168.0.1, 8.8.8.8');
    connectSucceeds();
    await manager.connect();
    expect(setServers).toHaveBeenCalledWith(['192.168.0.1', '8.8.8.8']);
    vi.unstubAllEnvs();
  });

  it('leaves DNS alone when MONGO_DNS_SERVERS is unset', async () => {
    vi.stubEnv('MONGO_DNS_SERVERS', '');
    connectSucceeds();
    await manager.connect();
    expect(setServers).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});

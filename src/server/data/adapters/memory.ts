import { assertSafeKey, type KeyValueStore, type StoredBytes } from '@/server/data/kv';

interface Entry {
  json?: string;
  bytes?: Buffer;
  contentType?: string;
}

/**
 * In-process store.
 *
 * Correct for tests and for a single-process development server, and honest
 * about what it is not: on a serverless platform each container gets its own
 * copy, so `accountsStatus()` refuses to enable accounts in production while
 * this driver is selected rather than letting people register into a void.
 *
 * The map lives on `globalThis` so Next's dev-mode module reloading does not
 * silently sign everybody out between edits.
 */
const globalKey = '__cineoraMemoryStore';

type GlobalWithStore = typeof globalThis & { [globalKey]?: Map<string, Entry> };

function table(): Map<string, Entry> {
  const scope = globalThis as GlobalWithStore;
  scope[globalKey] ??= new Map<string, Entry>();
  return scope[globalKey];
}

export function createMemoryStore(): KeyValueStore {
  return {
    driver: 'memory',

    async getJson<T>(key: string): Promise<T | null> {
      assertSafeKey(key);
      const raw = table().get(key)?.json;
      if (raw === undefined) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    async setJson(key: string, value: unknown): Promise<void> {
      assertSafeKey(key);
      table().set(key, { json: JSON.stringify(value) });
    },

    async getBytes(key: string): Promise<StoredBytes | null> {
      assertSafeKey(key);
      const entry = table().get(key);
      if (!entry?.bytes) return null;
      return { bytes: entry.bytes, contentType: entry.contentType ?? 'application/octet-stream' };
    },

    async setBytes(key: string, bytes: Buffer, contentType: string): Promise<void> {
      assertSafeKey(key);
      table().set(key, { bytes, contentType });
    },

    async delete(key: string): Promise<void> {
      assertSafeKey(key);
      table().delete(key);
    },

    async list(prefix: string): Promise<string[]> {
      assertSafeKey(prefix.endsWith('/') ? `${prefix}x` : prefix);
      const keys: string[] = [];
      for (const key of table().keys()) {
        if (key.startsWith(prefix)) keys.push(key);
      }
      return keys.sort();
    },
  };
}

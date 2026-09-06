import { assertSafeKey, StorageUnavailableError, type KeyValueStore, type StoredBytes } from '@/server/data/kv';

/**
 * Netlify Blobs store — the production driver on Netlify.
 *
 * Chosen because it needs no provisioning and no connection string: the Next.js
 * runtime injects its credentials into every function, so a fresh deploy has a
 * durable account store with nothing added to the Netlify UI. `get` and `set`
 * are strongly consistent per key, which is what session and token lookups need;
 * `list` is only used for a user's own sessions and events, where a few seconds
 * of lag is invisible.
 *
 * The import is dynamic on purpose. `@netlify/blobs` requires Node 22.12, and
 * nothing should force that floor on someone running the site locally on an
 * older runtime with the filesystem driver.
 */
type BlobStore = {
  get(key: string, options: { type: 'json' }): Promise<unknown>;
  getWithMetadata(
    key: string,
    options: { type: 'arrayBuffer' },
  ): Promise<{ data: ArrayBuffer; metadata: Record<string, unknown> } | null>;
  setJSON(key: string, value: unknown): Promise<unknown>;
  set(key: string, data: Buffer, options?: { metadata?: Record<string, unknown> }): Promise<unknown>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string }): Promise<{ blobs: Array<{ key: string }> }>;
};

let store: BlobStore | undefined;

async function connect(name: string): Promise<BlobStore> {
  if (store) return store;
  try {
    const { getStore } = (await import('@netlify/blobs')) as {
      getStore: (name: string) => unknown;
    };
    store = getStore(name) as BlobStore;
    return store;
  } catch (error) {
    // The usual cause is running outside Netlify, where no blobs context exists.
    // Surfacing that as "unavailable" lets the API answer 503 instead of 500.
    throw new StorageUnavailableError(
      `Netlify Blobs is unavailable: ${error instanceof Error ? error.name : 'unknown error'}`,
    );
  }
}

/** Netlify Blobs raises on a missing context; a missing key simply reads null. */
async function guard<T>(task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    if (error instanceof StorageUnavailableError) throw error;
    const name = error instanceof Error ? error.name : '';
    if (name === 'MissingBlobsEnvironmentError') {
      throw new StorageUnavailableError('Netlify Blobs is not configured for this deploy.');
    }
    throw error;
  }
}

export function createBlobsStore(name: string): KeyValueStore {
  return {
    driver: 'blobs',

    async getJson<T>(key: string): Promise<T | null> {
      assertSafeKey(key);
      return guard(async () => {
        const value = await (await connect(name)).get(key, { type: 'json' });
        return (value ?? null) as T | null;
      });
    },

    async setJson(key: string, value: unknown): Promise<void> {
      assertSafeKey(key);
      await guard(async () => (await connect(name)).setJSON(key, value));
    },

    async getBytes(key: string): Promise<StoredBytes | null> {
      assertSafeKey(key);
      return guard(async () => {
        const result = await (await connect(name)).getWithMetadata(key, { type: 'arrayBuffer' });
        if (!result) return null;
        const contentType = result.metadata?.contentType;
        return {
          bytes: Buffer.from(result.data),
          contentType: typeof contentType === 'string' ? contentType : 'application/octet-stream',
        };
      });
    },

    async setBytes(key: string, bytes: Buffer, contentType: string): Promise<void> {
      assertSafeKey(key);
      await guard(async () => (await connect(name)).set(key, bytes, { metadata: { contentType } }));
    },

    async delete(key: string): Promise<void> {
      assertSafeKey(key);
      await guard(async () => (await connect(name)).delete(key));
    },

    async list(prefix: string): Promise<string[]> {
      const clean = prefix.endsWith('/') ? prefix : `${prefix}/`;
      assertSafeKey(`${clean}x`);
      return guard(async () => {
        const { blobs } = await (await connect(name)).list({ prefix: clean });
        return blobs.map((blob) => blob.key).sort();
      });
    },
  };
}

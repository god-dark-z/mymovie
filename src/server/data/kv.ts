/**
 * The single storage primitive the whole account system is built on.
 *
 * Everything above this file — users, sessions, tokens, security events, rate
 * limit buckets, avatar bytes — is expressed as repositories over this
 * interface, so moving Cineora to Postgres, Supabase or Firebase means writing
 * one adapter with six methods rather than touching any application code.
 *
 * The interface is deliberately narrow: no transactions, no queries, no
 * secondary indexes. Repositories maintain their own index keys instead, which
 * is what keeps the contract portable to a key-value service like Netlify Blobs.
 */
export interface KeyValueStore {
  readonly driver: 'blobs' | 'fs' | 'memory';
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown): Promise<void>;
  getBytes(key: string): Promise<StoredBytes | null>;
  setBytes(key: string, bytes: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** Keys under a prefix, ascending. Prefix must end in `/`. */
  list(prefix: string): Promise<string[]>;
}

export interface StoredBytes {
  bytes: Buffer;
  contentType: string;
}

/**
 * Thrown when the configured driver cannot be reached.
 *
 * The API layer turns this into a 503 rather than a 500: an unreachable store is
 * a deployment problem, and pretending an account does not exist would be worse
 * than saying the service is unavailable.
 */
export class StorageUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageUnavailableError';
  }
}

/** Rejects keys that could escape a prefix or break a filesystem adapter. */
export function assertSafeKey(key: string): void {
  if (key.length === 0 || key.length > 512) throw new Error('Invalid storage key length.');
  if (!/^[A-Za-z0-9._\-/]+$/.test(key)) throw new Error('Invalid storage key characters.');
  if (key.includes('..') || key.startsWith('/') || key.includes('//')) {
    throw new Error('Invalid storage key shape.');
  }
}

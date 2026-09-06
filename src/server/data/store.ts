import { createHmac } from 'node:crypto';
import { serverConfig, sessionSecret } from '@/server/env';
import { createBlobsStore } from '@/server/data/adapters/blobs';
import { createFsStore } from '@/server/data/adapters/fs';
import { createMemoryStore } from '@/server/data/adapters/memory';
import type { KeyValueStore } from '@/server/data/kv';

/**
 * Driver selection, done once per process.
 *
 * Which driver runs is decided by configuration rather than by code paths, so
 * every repository above this file is identical in development and production.
 */
let instance: KeyValueStore | undefined;

export function kv(): KeyValueStore {
  if (instance) return instance;
  const config = serverConfig();
  switch (config.dataDriver) {
    case 'blobs':
      instance = createBlobsStore(config.blobsStore);
      break;
    case 'fs':
      instance = createFsStore(config.dataDir);
      break;
    default:
      instance = createMemoryStore();
  }
  return instance;
}

/**
 * Turns a value into a key-safe digest.
 *
 * Email addresses and IP addresses are indexed by digest rather than in the
 * clear: a key name shows up in storage listings and platform dashboards, and an
 * address is personal data that has no business being visible there. The site
 * secret is the HMAC key, so the digests are not reversible with a rainbow table
 * of common email addresses.
 */
export function indexDigest(value: string): string {
  return createHmac('sha256', sessionSecret()).update(value.toLowerCase()).digest('hex').slice(0, 40);
}

export const keys = {
  user: (id: string) => `user/${id}`,
  emailIndex: (email: string) => `index/email/${indexDigest(email)}`,
  usernameIndex: (username: string) => `index/username/${indexDigest(username)}`,
  session: (id: string) => `session/${id}`,
  userSessions: (userId: string) => `index/user-session/${userId}/`,
  userSession: (userId: string, sessionId: string) => `index/user-session/${userId}/${sessionId}`,
  token: (purpose: string, tokenHash: string) => `token/${purpose}/${tokenHash}`,
  userTokens: (userId: string, purpose: string) => `index/user-token/${userId}/${purpose}/`,
  userToken: (userId: string, purpose: string, tokenHash: string) =>
    `index/user-token/${userId}/${purpose}/${tokenHash}`,
  userEvents: (userId: string) => `event/${userId}/`,
  userEvent: (userId: string, sortKey: string) => `event/${userId}/${sortKey}`,
  rate: (bucket: string) => `rate/${indexDigest(bucket)}`,
  avatar: (userId: string) => `avatar/${userId}`,
} as const;

/**
 * A key that sorts newest-first, so listing a user's security log does not have
 * to read every record to find the last ten.
 */
export function descendingKey(at: number, id: string): string {
  const inverted = (10 ** 14 - at).toString().padStart(15, '0');
  return `${inverted}-${id}`;
}

/** `base64url` digests contain `-` and `_`, which are safe in every driver. */
export { type KeyValueStore } from '@/server/data/kv';

import { hashToken, newId, safeEqual } from '@/server/crypto/tokens';
import { keys, kv } from '@/server/data/store';
import type { TokenPurpose, TokenRecord } from '@/server/data/types';

/** Wrong-code guesses allowed against a single verification record. */
const MAX_ATTEMPTS = 6;

/**
 * Verification and password-reset tokens.
 *
 * The record is keyed by the token's own digest, so redeeming a link is a single
 * direct read with nothing to enumerate. Redemption marks the record used and
 * deletes it, which is what makes these single-use: a replayed link finds
 * nothing rather than finding a used record it might race against.
 */
export const tokens = {
  async issue(input: {
    userId: string;
    purpose: TokenPurpose;
    token: string;
    code?: string;
    ttlSeconds: number;
  }): Promise<TokenRecord> {
    // Issuing a new token retires the previous one, so a forwarded older email
    // cannot be used after someone asks for a fresh link.
    await this.revokeForUser(input.userId, input.purpose);

    const now = Date.now();
    const record: TokenRecord = {
      id: newId(),
      userId: input.userId,
      purpose: input.purpose,
      tokenHash: hashToken(input.token),
      codeHash: input.code ? hashToken(input.code) : undefined,
      createdAt: now,
      expiresAt: now + input.ttlSeconds * 1000,
      attempts: 0,
    };

    const store = kv();
    await store.setJson(keys.token(input.purpose, record.tokenHash), record);
    await store.setJson(keys.userToken(input.userId, input.purpose, record.tokenHash), { at: now });
    return record;
  },

  async findByToken(purpose: TokenPurpose, token: string): Promise<TokenRecord | null> {
    const record = await kv().getJson<TokenRecord>(keys.token(purpose, hashToken(token)));
    if (!record || record.usedAt || record.expiresAt <= Date.now()) return null;
    return record;
  },

  /**
   * Matches a typed code against the user's outstanding record.
   *
   * The comparison is over digests and constant-time, and the attempt counter is
   * persisted before the answer is returned, so guessing costs a write each time
   * and runs out after `MAX_ATTEMPTS`.
   */
  async findByCode(userId: string, purpose: TokenPurpose, code: string): Promise<TokenRecord | null> {
    const record = await this.findLatestForUser(userId, purpose);
    if (!record?.codeHash) return null;
    if (record.attempts >= MAX_ATTEMPTS) return null;

    if (!safeEqual(hashToken(code), record.codeHash)) {
      await kv().setJson(keys.token(purpose, record.tokenHash), {
        ...record,
        attempts: record.attempts + 1,
      });
      return null;
    }
    return record;
  },

  async findLatestForUser(userId: string, purpose: TokenPurpose): Promise<TokenRecord | null> {
    const store = kv();
    const indexKeys = await store.list(keys.userTokens(userId, purpose));
    const candidates = await Promise.all(
      indexKeys.map(async (key) => {
        const hash = key.slice(key.lastIndexOf('/') + 1);
        const record = await store.getJson<TokenRecord>(keys.token(purpose, hash));
        if (!record) {
          await store.delete(key);
          return null;
        }
        return record;
      }),
    );
    const live = candidates.filter(
      (record): record is TokenRecord => record !== null && !record.usedAt && record.expiresAt > Date.now(),
    );
    return live.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  },

  /** Consumes a record. Returns false if something already consumed it. */
  async redeem(record: TokenRecord): Promise<boolean> {
    const store = kv();
    const current = await store.getJson<TokenRecord>(keys.token(record.purpose, record.tokenHash));
    if (!current || current.usedAt) return false;
    await store.delete(keys.token(record.purpose, record.tokenHash));
    await store.delete(keys.userToken(record.userId, record.purpose, record.tokenHash));
    return true;
  },

  async revokeForUser(userId: string, purpose: TokenPurpose): Promise<void> {
    const store = kv();
    for (const key of await store.list(keys.userTokens(userId, purpose))) {
      const hash = key.slice(key.lastIndexOf('/') + 1);
      await store.delete(keys.token(purpose, hash));
      await store.delete(key);
    }
  },

  get maxAttempts(): number {
    return MAX_ATTEMPTS;
  },
};

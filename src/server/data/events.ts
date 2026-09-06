import { newId } from '@/server/crypto/tokens';
import { descendingKey, keys, kv } from '@/server/data/store';
import type { SecurityEventRecord, SecurityEventType } from '@/server/data/types';

/** How much history a user can see, and how much we keep. */
const RETAINED = 50;

/**
 * The security log.
 *
 * What lands here is chosen so a person can answer "was that me?" — sign-ins,
 * password changes, device revocations. What never lands here is a password, a
 * token, a session id or a raw IP address: the log is meant to be readable by
 * the account's owner, so it must not become a second copy of the secrets.
 *
 * Keys sort newest-first, so reading the recent page touches only the records it
 * shows.
 */
export const events = {
  async append(input: {
    userId: string;
    type: SecurityEventType;
    device: string;
    ipHash?: string;
    detail?: string;
  }): Promise<void> {
    const at = Date.now();
    const record: SecurityEventRecord = {
      id: newId(),
      userId: input.userId,
      type: input.type,
      at,
      device: input.device,
      ipHash: input.ipHash,
      detail: input.detail?.slice(0, 120),
    };
    await kv().setJson(keys.userEvent(input.userId, descendingKey(at, record.id)), record);
  },

  async listForUser(userId: string, limit = 20): Promise<SecurityEventRecord[]> {
    const store = kv();
    const all = await store.list(keys.userEvents(userId));
    const wanted = all.slice(0, Math.max(0, limit));
    const records = await Promise.all(wanted.map((key) => store.getJson<SecurityEventRecord>(key)));

    // Trim the tail opportunistically: a read is a natural moment to drop
    // history nobody can see, and it avoids needing a scheduled job.
    if (all.length > RETAINED) {
      await Promise.all(all.slice(RETAINED).map((key) => store.delete(key)));
    }

    return records.filter((record): record is SecurityEventRecord => record !== null);
  },

  async deleteForUser(userId: string): Promise<void> {
    const store = kv();
    await Promise.all((await store.list(keys.userEvents(userId))).map((key) => store.delete(key)));
  },
};

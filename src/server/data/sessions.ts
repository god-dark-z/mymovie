import { keys, kv } from '@/server/data/store';
import type { SessionRecord } from '@/server/data/types';

/**
 * Session records.
 *
 * A session is stored server-side and the browser only ever holds its id, so
 * signing out a device is a delete rather than a hope that a token expires. The
 * per-user index exists so "your devices" reads a handful of keys instead of
 * scanning every session in the store.
 */
export const sessions = {
  async find(id: string): Promise<SessionRecord | null> {
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(id)) return null;
    const record = await kv().getJson<SessionRecord>(keys.session(id));
    if (!record) return null;
    if (record.expiresAt <= Date.now()) {
      await this.revoke(record.userId, id);
      return null;
    }
    return record;
  },

  async create(record: SessionRecord): Promise<SessionRecord> {
    const store = kv();
    await store.setJson(keys.session(record.id), record);
    await store.setJson(keys.userSession(record.userId, record.id), { at: record.createdAt });
    return record;
  },

  /**
   * Records activity and extends a session that is past halfway, so an active
   * device is not signed out mid-session while an abandoned one still expires.
   */
  async touch(record: SessionRecord, ttlSeconds: number): Promise<SessionRecord> {
    const now = Date.now();
    const halfway = record.expiresAt - (ttlSeconds * 1000) / 2;
    const next: SessionRecord = {
      ...record,
      lastActiveAt: now,
      expiresAt: now > halfway ? now + ttlSeconds * 1000 : record.expiresAt,
    };
    // A write per request would be wasteful; a minute of drift on "last active"
    // is invisible in the UI and saves most of them.
    if (next.expiresAt === record.expiresAt && now - record.lastActiveAt < 60_000) return record;
    await kv().setJson(keys.session(record.id), next);
    return next;
  },

  async revoke(userId: string, sessionId: string): Promise<void> {
    const store = kv();
    await store.delete(keys.session(sessionId));
    await store.delete(keys.userSession(userId, sessionId));
  },

  async listForUser(userId: string): Promise<SessionRecord[]> {
    const store = kv();
    const indexKeys = await store.list(keys.userSessions(userId));
    const records = await Promise.all(
      indexKeys.map(async (key) => {
        const id = key.slice(key.lastIndexOf('/') + 1);
        const record = await store.getJson<SessionRecord>(keys.session(id));
        if (!record) {
          // The session expired or was revoked; drop the dangling index entry.
          await store.delete(key);
          return null;
        }
        if (record.expiresAt <= Date.now()) {
          await this.revoke(userId, id);
          return null;
        }
        return record;
      }),
    );
    return records
      .filter((record): record is SessionRecord => record !== null)
      .sort((a, b) => b.lastActiveAt - a.lastActiveAt);
  },

  /** Signs out every device, optionally sparing the one making the request. */
  async revokeAll(userId: string, exceptId?: string): Promise<number> {
    const all = await this.listForUser(userId);
    let revoked = 0;
    for (const record of all) {
      if (record.id === exceptId) continue;
      await this.revoke(userId, record.id);
      revoked += 1;
    }
    return revoked;
  },
};

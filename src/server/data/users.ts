import { newId } from '@/server/crypto/tokens';
import { keys, kv } from '@/server/data/store';
import type { AccountPreferences, UserRecord } from '@/server/data/types';

export const DEFAULT_PREFERENCES: AccountPreferences = {
  appearance: 'dark',
  interfaceLanguage: 'en',
  timezone: 'UTC',
  playback: {
    autoplayNext: true,
    preferredAudio: null,
    preferredSubtitle: null,
    preferredQuality: 'auto',
  },
  notifications: {
    accountActivity: true,
    productUpdates: false,
    emailAnnouncements: false,
  },
  privacy: {
    personalization: true,
    storeSearchHistory: true,
    storeWatchHistory: true,
  },
  accessibility: {
    reduceMotion: false,
    reduceTransparency: false,
    largerText: false,
    highContrast: false,
  },
};

/** Lower-cased and trimmed. Gmail dot-folding is deliberately not applied. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const normalizeUsername = (username: string): string => username.trim().toLowerCase();

export class EmailTakenError extends Error {
  constructor() {
    super('email-taken');
    this.name = 'EmailTakenError';
  }
}

export class UsernameTakenError extends Error {
  constructor() {
    super('username-taken');
    this.name = 'UsernameTakenError';
  }
}

interface IndexEntry {
  userId: string;
}

export interface NewUser {
  email: string;
  passwordHash: string;
  displayName: string;
  username?: string;
}

export const users = {
  async findById(id: string): Promise<UserRecord | null> {
    if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return null;
    const record = await kv().getJson<UserRecord>(keys.user(id));
    if (!record) return null;
    // Records written before a preference was added must still load.
    return { ...record, preferences: mergePreferences(record.preferences) };
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    const entry = await kv().getJson<IndexEntry>(keys.emailIndex(normalizeEmail(email)));
    return entry ? this.findById(entry.userId) : null;
  },

  async findByUsername(username: string): Promise<UserRecord | null> {
    const entry = await kv().getJson<IndexEntry>(keys.usernameIndex(normalizeUsername(username)));
    return entry ? this.findById(entry.userId) : null;
  },

  /**
   * Claims the email index before writing the record, so a duplicate loses on
   * the index rather than on the account. Two registrations for the same address
   * arriving in the same millisecond can still both pass the check — a key-value
   * store has no transaction to prevent it — and the loser then fails to verify
   * because the second index write points at one account only.
   */
  async create(input: NewUser): Promise<UserRecord> {
    const email = normalizeEmail(input.email);
    const username = input.username ? normalizeUsername(input.username) : undefined;
    const store = kv();

    if (await store.getJson<IndexEntry>(keys.emailIndex(email))) throw new EmailTakenError();
    if (username && (await store.getJson<IndexEntry>(keys.usernameIndex(username)))) {
      throw new UsernameTakenError();
    }

    const now = Date.now();
    const record: UserRecord = {
      id: newId(),
      email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      username: input.username?.trim() || undefined,
      emailVerified: false,
      preferences: DEFAULT_PREFERENCES,
      createdAt: now,
      updatedAt: now,
    };

    await store.setJson(keys.emailIndex(email), { userId: record.id });
    if (username) await store.setJson(keys.usernameIndex(username), { userId: record.id });
    await store.setJson(keys.user(record.id), record);
    return record;
  },

  async update(id: string, patch: Partial<Omit<UserRecord, 'id' | 'email' | 'createdAt'>>): Promise<UserRecord | null> {
    const current = await this.findById(id);
    if (!current) return null;

    const nextUsername = patch.username?.trim();
    if (nextUsername !== undefined && normalizeUsername(nextUsername) !== normalizeUsername(current.username ?? '')) {
      const taken = await kv().getJson<IndexEntry>(keys.usernameIndex(nextUsername));
      if (taken && taken.userId !== id) throw new UsernameTakenError();
    }

    const next: UserRecord = { ...current, ...patch, id: current.id, email: current.email, updatedAt: Date.now() };
    await kv().setJson(keys.user(id), next);

    if (nextUsername !== undefined && nextUsername !== current.username) {
      if (current.username) await kv().delete(keys.usernameIndex(current.username));
      if (nextUsername) await kv().setJson(keys.usernameIndex(nextUsername), { userId: id });
    }
    return next;
  },

  async delete(id: string): Promise<void> {
    const current = await this.findById(id);
    if (!current) return;
    const store = kv();
    await store.delete(keys.emailIndex(current.email));
    if (current.username) await store.delete(keys.usernameIndex(current.username));
    await store.delete(keys.avatar(id));
    await store.delete(keys.user(id));
  },
};

/** Fills gaps left by preference fields added after a record was written. */
export function mergePreferences(value: Partial<AccountPreferences> | undefined): AccountPreferences {
  const base = DEFAULT_PREFERENCES;
  return {
    ...base,
    ...value,
    playback: { ...base.playback, ...value?.playback },
    notifications: { ...base.notifications, ...value?.notifications },
    privacy: { ...base.privacy, ...value?.privacy },
    accessibility: { ...base.accessibility, ...value?.accessibility },
  };
}

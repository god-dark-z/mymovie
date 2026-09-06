/**
 * The account data model.
 *
 * These records are the contract between the storage layer and everything above
 * it. They are deliberately plain and free of provider types so the same shapes
 * survive a move from Netlify Blobs to Postgres or Supabase — see
 * `src/server/data/README.md` for what porting involves.
 *
 * Two absences are intentional. No record holds a raw token: verification and
 * reset secrets exist only as SHA-256 digests, so this data cannot be replayed.
 * And no record holds a raw IP address, only a keyed digest, which is enough to
 * tell two sessions apart without keeping a location log.
 */

export type MediaQuality = 'auto' | '480p' | '720p' | '1080p';

export interface PlaybackPreferences {
  autoplayNext: boolean;
  /** ISO 639-1, or null to let the source decide. */
  preferredAudio: string | null;
  preferredSubtitle: string | null;
  preferredQuality: MediaQuality;
}

export interface NotificationPreferences {
  /** Account activity: new sign-ins, profile changes. */
  accountActivity: boolean;
  productUpdates: boolean;
  emailAnnouncements: boolean;
}

export interface PrivacyPreferences {
  personalization: boolean;
  storeSearchHistory: boolean;
  storeWatchHistory: boolean;
}

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  reduceTransparency: boolean;
  largerText: boolean;
  highContrast: boolean;
}

/** Cineora is a dark product; `midnight` is a true-black variant for OLED. */
export type Appearance = 'dark' | 'midnight';

export interface AccountPreferences {
  appearance: Appearance;
  interfaceLanguage: string;
  timezone: string;
  playback: PlaybackPreferences;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  username?: string;
  bio?: string;
  /** Bumped on every avatar write so a cached URL cannot go stale. */
  avatarVersion?: number;
  emailVerified: boolean;
  emailVerifiedAt?: number;
  preferences: AccountPreferences;
  createdAt: number;
  updatedAt: number;
}

export interface SessionRecord {
  id: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
  lastActiveAt: number;
  /** Human label such as "Chrome on Windows". Derived, never authoritative. */
  device: string;
  userAgent: string;
  ipHash?: string;
  remember: boolean;
}

export type TokenPurpose = 'email-verification' | 'password-reset';

export interface TokenRecord {
  id: string;
  userId: string;
  purpose: TokenPurpose;
  /** SHA-256 of the link token. Also this record's storage key. */
  tokenHash: string;
  /** SHA-256 of the typeable code, when the flow offers one. */
  codeHash?: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  /** Wrong-code attempts, so a code cannot be brute forced record-side. */
  attempts: number;
}

export type SecurityEventType =
  | 'account.created'
  | 'account.deleted'
  | 'email.verified'
  | 'email.verification-sent'
  | 'login.success'
  | 'login.failed'
  | 'logout'
  | 'password.changed'
  | 'password.reset'
  | 'password.reset-requested'
  | 'profile.updated'
  | 'preferences.updated'
  | 'session.revoked'
  | 'sessions.revoked-others'
  | 'download.authorized';

export interface SecurityEventRecord {
  id: string;
  userId: string;
  type: SecurityEventType;
  at: number;
  device: string;
  ipHash?: string;
  /** Short, non-sensitive context, e.g. "display name". */
  detail?: string;
}

export interface RateBucketRecord {
  hits: number[];
  blockedUntil?: number;
  /** Consecutive block count, used for progressive backoff. */
  strikes: number;
}

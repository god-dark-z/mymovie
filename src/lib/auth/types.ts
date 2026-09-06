import type {
  AccountPreferences,
  SecurityEventType,
} from '@/server/data/types';

/**
 * The shapes that cross the wire.
 *
 * Only `AccountPreferences` and `SecurityEventType` are borrowed from the storage
 * model — both are plain unions and contain nothing private. Everything else is
 * declared here, and the omissions are the point: no password hash, no session
 * secret, no raw IP address, no token has a field to travel in.
 *
 * This file is imported by client components. Type-only imports disappear at
 * compile time, so nothing from `src/server` ends up in a browser bundle.
 */
export type { AccountPreferences };

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  bio: string | null;
  /** Null when no avatar has been uploaded; the UI falls back to initials. */
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: number;
  preferences: AccountPreferences;
}

export interface SessionSummary {
  id: string;
  device: string;
  createdAt: number;
  lastActiveAt: number;
  expiresAt: number;
  /** True for the session making the request, which cannot be revoked here. */
  current: boolean;
  remember: boolean;
}

export interface ActivityItem {
  id: string;
  type: SecurityEventType;
  at: number;
  device: string;
  detail: string | null;
}

/**
 * Answered by `/api/auth/session` on every load.
 *
 * `configured: false` is the honest state of a deployment without a session
 * secret: the UI hides sign-in rather than offering a form that cannot work.
 */
export interface SessionResponse {
  configured: boolean;
  user: PublicUser | null;
  /** Double-submit token, echoed back in the `x-cineora-csrf` header. */
  csrfToken: string | null;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    /** Per-field messages for form display. */
    fields?: Record<string, string>;
    retryAfter?: number;
  };
}

/** What sign-in, verification and password reset answer on success. */
export interface AuthResultBody {
  user: PublicUser;
  csrfToken: string;
}

/**
 * What registration answers — the same shape whether or not the address was
 * already in use, because a different response would turn this endpoint into a way
 * to discover who has an account.
 */
export interface RegisterResponse {
  pending: true;
  email: string;
  /**
   * Present only when mail is running in outbox mode, a local development
   * convenience so the flow can be completed without an SMTP server. A configured
   * production deployment never populates it.
   */
  devVerificationUrl?: string;
}

/** Generic acknowledgement for endpoints that must not confirm what they found. */
export interface AcknowledgedResponse {
  ok: true;
  devUrl?: string;
}

/** Profile reads and writes both answer with the whole user, so state stays in step. */
export interface UserResponse {
  user: PublicUser;
}

export interface SessionsResponse {
  sessions: SessionSummary[];
}

export interface ActivityResponse {
  activity: ActivityItem[];
}

export interface PreferencesResponse {
  preferences: AccountPreferences;
}

/**
 * The data export.
 *
 * Deliberately missing: the password hash, session ids, tokens, and IP digests.
 * An export is a file a person will email to themselves or leave in a downloads
 * folder, so it holds what is theirs and nothing that could be replayed.
 */
export interface AccountExport {
  exportedAt: string;
  format: 1;
  account: {
    id: string;
    email: string;
    displayName: string;
    username: string | null;
    bio: string | null;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  preferences: AccountPreferences;
  sessions: Array<{ device: string; createdAt: string; lastActiveAt: string; current: boolean }>;
  activity: Array<{ type: SecurityEventType; at: string; device: string; detail: string | null }>;
  notes: readonly string[];
}

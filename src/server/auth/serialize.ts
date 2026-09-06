import type { ActivityItem, PublicUser, SessionSummary } from '@/lib/auth/types';
import { mergePreferences } from '@/server/data/users';
import type { SecurityEventRecord, SessionRecord, UserRecord } from '@/server/data/types';

/**
 * The boundary between stored records and anything a browser sees.
 *
 * Every account response is built by these functions, so there is one place to
 * check that a password hash, an IP digest or a raw user-agent string never leaves
 * the server. Building responses by spreading a record — `{ ...user }` — is what
 * leaks a hash one day, so it is not done anywhere.
 */

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    username: user.username ?? null,
    bio: user.bio ?? null,
    // The version is what lets the browser cache an avatar indefinitely and still
    // see a new one the moment it is uploaded.
    avatarUrl: user.avatarVersion ? `/api/profile/avatar?v=${user.avatarVersion}` : null,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    preferences: mergePreferences(user.preferences),
  };
}

export function toSessionSummary(record: SessionRecord, currentId: string): SessionSummary {
  return {
    id: record.id,
    device: record.device,
    createdAt: record.createdAt,
    lastActiveAt: record.lastActiveAt,
    expiresAt: record.expiresAt,
    current: record.id === currentId,
    remember: record.remember,
  };
}

export function toActivityItem(record: SecurityEventRecord): ActivityItem {
  return {
    id: record.id,
    type: record.type,
    at: record.at,
    device: record.device,
    detail: record.detail ?? null,
  };
}

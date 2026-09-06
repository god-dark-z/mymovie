import { displayNameProblem, LIMITS, usernameProblem } from '@/lib/auth/policy';
import type { UserResponse } from '@/lib/auth/types';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { toPublicUser } from '@/server/auth/serialize';
import { logEvent, requireAuth } from '@/server/auth/session';
import { UsernameTakenError, users } from '@/server/data/users';
import { conflict } from '@/server/http/errors';
import { assertMutationAllowed, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';

/**
 * The account's own profile.
 *
 * The email address is not editable here. Changing it means re-proving control of
 * a new mailbox, which is its own flow rather than a field in a form — and letting
 * it be patched would hand an attacker with a borrowed session a way to take the
 * account over permanently.
 */
export const dynamic = 'force-dynamic';

export const GET = route('profile/read', async () => {
  const { user } = await requireAuth();
  return jsonOk<UserResponse>({ user: toPublicUser(user) });
});

export const PATCH = route('profile/update', async (request) => {
  await assertMutationAllowed(request);
  const { user } = await requireAuth();
  await enforce(RATE_LIMITS.profile, user.id);

  const fields = new Fields(await readJson(request));
  const displayName = fields.optionalString('displayName', {
    max: LIMITS.displayNameMax,
    label: 'Display name',
  });
  const username = fields.optionalString('username', { max: LIMITS.usernameMax, label: 'Username' });
  const bio = fields.optionalString('bio', { max: LIMITS.bioMax, label: 'Bio' });

  if (displayName !== undefined) {
    if (displayName.length < LIMITS.displayNameMin) {
      fields.reject('displayName', `Use at least ${LIMITS.displayNameMin} characters.`);
    } else {
      const problem = displayNameProblem(displayName);
      if (problem) fields.reject('displayName', problem);
    }
  }

  // An empty string clears the username; anything else has to be a valid one.
  if (username !== undefined && username.length > 0) {
    const problem = usernameProblem(username);
    if (problem) fields.reject('username', problem);
  }

  fields.assert();

  const patch: Parameters<typeof users.update>[1] = {};
  const changed: string[] = [];

  if (displayName !== undefined && displayName !== user.displayName) {
    patch.displayName = displayName;
    changed.push('display name');
  }
  if (username !== undefined && (username || undefined) !== user.username) {
    patch.username = username;
    changed.push('username');
  }
  if (bio !== undefined && (bio || undefined) !== user.bio) {
    patch.bio = bio || undefined;
    changed.push('bio');
  }

  if (changed.length === 0) return jsonOk<UserResponse>({ user: toPublicUser(user) });

  let updated;
  try {
    updated = await users.update(user.id, patch);
  } catch (error) {
    if (error instanceof UsernameTakenError) {
      // A username is public by design, so saying it is taken leaks nothing that
      // a profile page would not already show.
      throw conflict('username_taken', 'That username is already in use.', {
        username: 'That username is already taken.',
      });
    }
    throw error;
  }

  const next = updated ?? user;
  await logEvent({ userId: user.id, type: 'profile.updated', request, detail: changed.join(', ') });
  return jsonOk<UserResponse>({ user: toPublicUser(next) });
});

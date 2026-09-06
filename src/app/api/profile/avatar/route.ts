import type { UserResponse } from '@/lib/auth/types';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { toPublicUser } from '@/server/auth/serialize';
import { logEvent, requireAuth } from '@/server/auth/session';
import {
  AVATAR_CONTENT_TYPE,
  AVATAR_MAX_BYTES,
  AvatarRejectedError,
  avatars,
  processAvatar,
} from '@/server/data/avatars';
import { users } from '@/server/data/users';
import { badRequest, notFound } from '@/server/http/errors';
import { assertMutationAllowed, assertUploadSize, readLimitedBytes } from '@/server/http/request';
import { jsonOk, noContent, route } from '@/server/http/respond';

/**
 * Profile pictures.
 *
 * The upload is never stored as it arrived. `processAvatar` reads the real magic
 * bytes, caps how many pixels it will decode, and re-encodes through sharp to a
 * fixed-size WebP — so a file that is a valid image and also a valid script, or one
 * carrying an EXIF payload, comes out the other side as plain pixels. The declared
 * content type is not consulted for anything except rejecting an obvious mistake.
 *
 * Bytes are read straight from the request body rather than through `formData()`,
 * which would buffer the whole multipart envelope before any limit could apply.
 */
export const dynamic = 'force-dynamic';

/**
 * Serves the signed-in user's own avatar.
 *
 * Cached `private` only: a shared cache must never be able to hand one account's
 * picture to another. The URL carries a version that changes on every write, so a
 * short freshness window is enough and revalidation is cheap.
 */
export const GET = route('profile/avatar/read', async (request) => {
  const { user } = await requireAuth();
  const stored = await avatars.get(user.id);
  if (!stored) throw notFound('No avatar has been uploaded.');

  const etag = `"a${user.avatarVersion ?? 0}-${stored.bytes.byteLength}"`;
  const headers = {
    'content-type': stored.contentType || AVATAR_CONTENT_TYPE,
    'cache-control': 'private, max-age=300, must-revalidate',
    vary: 'Cookie',
    etag,
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
  };

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(new Uint8Array(stored.bytes), { status: 200, headers });
});

export const PUT = route('profile/avatar/write', async (request) => {
  await assertMutationAllowed(request);
  const { user } = await requireAuth();
  await enforce(RATE_LIMITS.avatar, user.id);

  const declared = (request.headers.get('content-type') ?? '').toLowerCase();
  if (declared && !declared.startsWith('image/')) {
    throw badRequest('Upload an image file.');
  }

  assertUploadSize(request, AVATAR_MAX_BYTES);
  const raw = await readLimitedBytes(request, AVATAR_MAX_BYTES);
  if (raw.byteLength === 0) throw badRequest('No image was received.');

  let processed: Buffer;
  try {
    processed = await processAvatar(raw);
  } catch (error) {
    if (error instanceof AvatarRejectedError) throw badRequest(error.message);
    throw error;
  }

  await avatars.put(user.id, processed);
  const updated = await users.update(user.id, { avatarVersion: (user.avatarVersion ?? 0) + 1 });
  await logEvent({ userId: user.id, type: 'profile.updated', request, detail: 'profile picture' });

  return jsonOk<UserResponse>({ user: toPublicUser(updated ?? user) });
});

export const DELETE = route('profile/avatar/delete', async (request) => {
  await assertMutationAllowed(request);
  const { user } = await requireAuth();
  await enforce(RATE_LIMITS.avatar, user.id);

  await avatars.delete(user.id);
  // Version cleared rather than bumped, so `toPublicUser` reports no avatar at all.
  await users.update(user.id, { avatarVersion: undefined });
  await logEvent({ userId: user.id, type: 'profile.updated', request, detail: 'profile picture removed' });
  return noContent();
});

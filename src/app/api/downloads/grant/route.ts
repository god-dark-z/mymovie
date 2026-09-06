import type { DownloadGrantResponse } from '@/lib/downloads/types';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { logEvent, requireVerified } from '@/server/auth/session';
import { fileNameFor, resolveKey } from '@/server/downloads/catalog';
import { issueGrant } from '@/server/downloads/grant';
import { notFound } from '@/server/http/errors';
import { assertMutationAllowed, readJson } from '@/server/http/request';
import { jsonOk, route } from '@/server/http/respond';
import { Fields } from '@/server/http/validate';

/**
 * Authorises one download.
 *
 * Split from the transfer itself for a practical reason: this half needs a session,
 * a CSRF pair and a throttle, while the half that moves bytes has to work for a
 * download manager that will not send any of them. So the checks happen here, once,
 * and the result is a signed grant that stands in for them for fifteen minutes.
 *
 * Verification is required. A download hands out a file, and an address nobody has
 * confirmed is not an account yet — only a claim to one.
 */
export const dynamic = 'force-dynamic';

export const POST = route('downloads/grant', async (request) => {
  await assertMutationAllowed(request);
  const { user } = await requireVerified();
  await enforce(RATE_LIMITS.download, user.id);

  const fields = new Fields(await readJson(request));
  const key = fields.string('key', { max: 200, label: 'The file' });
  fields.assert();

  // Nothing distinguishes "never existed" from "withdrawn from the catalogue", and
  // neither is the reader's problem to untangle.
  const resolved = resolveKey(key);
  if (!resolved) throw notFound('That download is no longer available.');

  const { asset, file } = resolved;
  const grant = issueGrant(user.id, key);

  const label =
    asset.episode === null ? asset.title : `${asset.title} S${asset.season ?? 1}E${asset.episode}`;
  await logEvent({
    userId: user.id,
    type: 'download.authorized',
    request,
    detail: label.slice(0, 90),
  });

  return jsonOk<DownloadGrantResponse>({
    // Root-relative on purpose. The client resolves it against its own origin, which
    // is correct on every preview deploy and branch domain; deriving an absolute URL
    // here would mean trusting a `Host` header.
    url: `/api/downloads/file?g=${encodeURIComponent(grant.token)}`,
    expiresAt: grant.expiresAt,
    fileName: fileNameFor(asset, file),
    contentType: file.contentType,
    sizeBytes: file.sizeBytes,
    quality: file.quality,
    title: asset.title,
  });
});

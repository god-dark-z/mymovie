import { fileNameFor, resolveKey } from '@/server/downloads/catalog';
import { readGrant } from '@/server/downloads/grant';
import { route } from '@/server/http/respond';

/**
 * Hands over an authorized file.
 *
 * Deliberately cookie-free. Whatever fetches this is not the page that asked for it:
 * a browser's download manager, or a WebView host's, issues its own request — often
 * more than one, to resume or to seek — without the session or the CSRF header. So
 * the signed grant from `/api/downloads/grant` is the whole authorization, and its
 * fifteen-minute life is what bounds the capability.
 *
 * Failures answer in HTML rather than JSON. Someone can land here by pasting a stale
 * link into the address bar, and a wall of JSON is not an answer to a person.
 */
export const dynamic = 'force-dynamic';

/** Passed through so a resume or a seek reaches the origin intact. */
const FORWARD_TO_ORIGIN = ['range', 'if-range', 'accept-encoding'] as const;

/** Copied back. Anything else the origin volunteers is dropped. */
const FORWARD_TO_CLIENT = ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'] as const;

function problem(status: number, message: string): Response {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Download unavailable — Cineora</title>
<style>html{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#08090c;color:#f4f5f7;font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;padding:2rem;text-align:center}
p{max-width:32rem;margin:0 0 1.5rem;color:#a9adb8}a{color:#f4f5f7;text-decoration:none;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:.7rem 1.4rem}</style>
</head><body><main><p>${message}</p><a href="/downloads">Back to downloads</a></main></body></html>`;
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

export const GET = route('downloads/file', async (request) => {
  const token = new URL(request.url).searchParams.get('g');
  const grant = token ? readGrant(token) : null;

  // Expired, truncated and forged are one answer. A grant that does not verify
  // permits nothing, and the way forward is the same in every case.
  if (!grant) {
    return problem(403, 'This download link has expired. Open the title again and start the download to get a fresh link.');
  }

  const resolved = resolveKey(grant.key);
  if (!resolved) return problem(404, 'This file is no longer part of the download catalogue.');

  const { asset, file } = resolved;
  // Built from stripped ASCII, so it cannot contain a quote or a newline that would
  // break out of the header.
  const fileName = fileNameFor(asset, file);
  const disposition = `attachment; filename="${fileName}"`;

  if (file.delivery === 'redirect') {
    // The operator has chosen to serve from their own storage. Correct for a large
    // file on a CDN — and the reason the choice is per-file: it makes the asset URL
    // visible to the client, which only the operator can decide is acceptable.
    return new Response(null, {
      status: 302,
      headers: { location: file.url, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' },
    });
  }

  const outbound = new Headers();
  for (const name of FORWARD_TO_ORIGIN) {
    const value = request.headers.get(name);
    if (value) outbound.set(name, value);
  }

  let upstream: Response;
  try {
    // Nothing of Cineora's travels outward, and no browser cookie can: this is a
    // fresh server-to-server request, not a forwarded one.
    upstream = await fetch(file.url, { headers: outbound, cache: 'no-store', redirect: 'follow' });
  } catch {
    // The origin's hostname is never named in the answer.
    console.error('[cineora] downloads/file: origin unreachable');
    return problem(502, 'The file could not be reached right now. Please try again in a moment.');
  }

  if (!upstream.ok || !upstream.body) {
    console.error(`[cineora] downloads/file: origin answered ${upstream.status}`);
    return problem(502, 'The file could not be reached right now. Please try again in a moment.');
  }

  const headers = new Headers({
    'content-type': file.contentType,
    'content-disposition': disposition,
    // Private and unstored: a signed link must never be satisfied from a shared cache.
    'cache-control': 'private, no-store',
    'x-content-type-options': 'nosniff',
  });
  for (const name of FORWARD_TO_CLIENT) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  // Streamed, not buffered: a serverless function must not hold a film in memory.
  // Long transfers still belong on `delivery: 'redirect'` — see docs/DOWNLOADS.md.
  return new Response(upstream.body, { status: upstream.status, headers });
});

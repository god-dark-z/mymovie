import { NextResponse } from 'next/server';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { readSessionCookie } from '@/server/auth/cookies';
import { sessions } from '@/server/data/sessions';
import { encodeProviderQuery, providerFetch } from '@/server/downloads/provider-client';

/**
 * Unified download resolver.
 *
 * The provider's download API requires AES-encrypted queries and returns AES-
 * encrypted responses. Cineora's server owns that transform — the visitor's
 * browser never handles the key.
 *
 * The provider also blocks datacenter IPs (403 from serverless runtimes) and sends
 * no CORS headers (so the browser can't call it directly). Both are solved here:
 * the call is made from this server, and when `DOWNLOAD_PROXY_URL` is set, it is
 * forwarded through that proxy so the egress IP is not a datacenter one.
 *
 * Query (POST):
 *   op=encrypt  -> { type, id, provider?, season?, episode? } -> { path, query }
 *   op=resolve  -> { type, id, provider?, season?, episode? } -> { items: [...] }
 *
 * `resolve` is the convenience form: it encrypts, fetches, decodes, and returns the
 * decoded list in one call. `encrypt` returns the opaque query for callers that want
 * to manage the fetch themselves. Both require a session.
 */

export const dynamic = 'force-dynamic';

interface ResolveBody {
  type?: string;
  id?: string;
  provider?: string;
  season?: string;
  episode?: string;
}

function unauthorized() {
  return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

async function requireSession() {
  const sessionId = await readSessionCookie();
  const session = sessionId ? await sessions.find(sessionId) : null;
  if (!session) return null;
  await enforce(RATE_LIMITS.download, session.userId);
  return session;
}

async function handleEncrypt(body: ResolveBody) {
  const type = body.type === 'tv' ? 'tv' : 'movie';
  const tmdbId = body.id ?? '';
  if (!tmdbId) return badRequest('missing id');

  const isSources = Boolean(body.provider);
  const path = isSources ? '/api/sources' : '/api/servers';
  const query = encodeProviderQuery({
    type,
    tmdbId,
    provider: body.provider,
    season: body.season ?? '1',
    episode: body.episode ?? '1',
    method: 'dl',
  });

  return NextResponse.json({ path, query });
}

async function handleResolve(body: ResolveBody) {
  const type = body.type === 'tv' ? 'tv' : 'movie';
  const tmdbId = body.id ?? '';
  if (!tmdbId) return badRequest('missing id');

  const isSources = Boolean(body.provider);
  const path = isSources ? '/api/sources' : '/api/servers';
  const query = encodeProviderQuery({
    type,
    tmdbId,
    provider: body.provider,
    season: body.season ?? '1',
    episode: body.episode ?? '1',
    method: 'dl',
  });

  const result = await providerFetch(path, query);
  if (!result.ok) {
    return NextResponse.json({ error: 'provider_unavailable', detail: result.statuses }, { status: 502 });
  }

  const data = result.body as Record<string, unknown> | null;
  const items = Array.isArray(data?.servers)
    ? data!.servers
    : Array.isArray(data?.sources)
      ? data!.sources
      : [];

  return NextResponse.json({ items, error: typeof data?.error === 'string' ? data.error : null });
}

export async function POST(request: Request) {
  if (!(await requireSession())) return unauthorized();

  const body = (await request.json().catch(() => null)) as ResolveBody | null;
  if (!body) return badRequest('invalid body');

  const { searchParams } = new URL(request.url);
  return searchParams.get('op') === 'encrypt' ? handleEncrypt(body) : handleResolve(body);
}

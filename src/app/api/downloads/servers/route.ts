import { NextResponse } from 'next/server';
import { readSessionCookie } from '@/server/auth/cookies';
import { sessions } from '@/server/data/sessions';
import { encodeProviderQuery } from '@/server/downloads/provider-client';

/**
 * Proxy for the provider's server list.
 *
 * The visitor's browser calls this with a title id; Cineora's server encodes the
 * provider query, fetches the list, decodes the response, and hands back plain
 * JSON. The provider's origin, endpoint shape, and encoding never reach the
 * client, and the call requires a live session — this is not an open relay.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sessionId = await readSessionCookie();
  if (!sessionId || !(await sessions.find(sessionId))) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const tmdbId = searchParams.get('id') ?? '';
  if (!tmdbId) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const query = encodeProviderQuery({ type, tmdbId, method: 'dl' });
  const upstream = await fetch(`https://nxsha.space/api/servers?q=${encodeURIComponent(query)}`, {
    headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://nxsha.space/' },
    cache: 'no-store',
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: 'provider_unavailable' }, { status: 502 });
  }

  const { decodeProviderResponse } = await import('@/server/downloads/provider-client');
  const body = (await upstream.json()) as { _hash?: string };
  const decoded = decodeProviderResponse<{ servers?: unknown[] }>(body._hash);
  const servers = Array.isArray(decoded?.servers) ? decoded!.servers : [];

  return NextResponse.json({ servers });
}

import { NextResponse } from 'next/server';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { readSessionCookie } from '@/server/auth/cookies';
import { sessions } from '@/server/data/sessions';
import { encodeProviderQuery, providerFetch } from '@/server/downloads/provider-client';

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
  const result = await providerFetch('/api/servers', query);

  if (!result.ok) {
    // The per-origin statuses say whether the provider refused, timed out, or
    // answered in a form we could not decode — the three fixes differ.
    return NextResponse.json(
      { error: 'provider_unavailable', detail: result.statuses },
      { status: 502 },
    );
  }

  const body = result.body as { servers?: unknown[] } | null;
  const servers = Array.isArray(body?.servers) ? body!.servers : [];
  return NextResponse.json({ servers });
}

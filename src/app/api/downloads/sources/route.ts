import { NextResponse } from 'next/server';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { readSessionCookie } from '@/server/auth/cookies';
import { sessions } from '@/server/data/sessions';
import { encodeProviderQuery, decodeProviderResponse } from '@/server/downloads/provider-client';

/**
 * Proxy for the provider's download sources.
 *
 * Same contract as /api/downloads/servers: session required, provider details
 * never returned. The URLs in the response point at the provider's storage
 * (signed CDN links) — the visitor's browser downloads directly from there,
 * which Cineora cannot and should not re-proxy (multi-GB streams through a
 * serverless function would hit its response limits).
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sessionId = await readSessionCookie();
  const session = sessionId ? await sessions.find(sessionId) : null;
  if (!session) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  await enforce(RATE_LIMITS.download, session.userId);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') === 'tv' ? 'tv' : 'movie';
  const tmdbId = searchParams.get('id') ?? '';
  const provider = searchParams.get('provider') ?? '';
  const season = searchParams.get('season') ?? '1';
  const episode = searchParams.get('episode') ?? '1';

  if (!tmdbId || !provider) {
    return NextResponse.json({ error: 'missing id or provider' }, { status: 400 });
  }

  const query = encodeProviderQuery({
    type,
    tmdbId,
    provider,
    season,
    episode,
    method: 'dl',
  });

  const upstream = await fetch(`https://nxsha.space/api/sources?q=${encodeURIComponent(query)}`, {
    headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://nxsha.space/' },
    cache: 'no-store',
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: 'provider_unavailable' }, { status: 502 });
  }

  const body = (await upstream.json()) as { _hash?: string };
  const decoded = decodeProviderResponse<{ sources?: unknown[]; error?: string }>(body._hash);
  const sources = Array.isArray(decoded?.sources) ? decoded!.sources : [];

  return NextResponse.json({ sources, error: decoded?.error ?? null });
}

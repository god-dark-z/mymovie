import { NextResponse } from 'next/server';
import { enforce, RATE_LIMITS } from '@/server/auth/rate-limit';
import { readSessionCookie } from '@/server/auth/cookies';
import { sessions } from '@/server/data/sessions';
import {
  encodeProviderQuery,
  providerFetch,
} from '@/server/downloads/provider-client';

/**
 * One-call download resolver.
 *
 * The provider's download data lives behind two AES-encoded endpoints:
 * `/api/servers` (which scraper groups hold this title) and `/api/sources`
 * (that group's direct files). The math "security check" on their page is
 * client-side theatre — the data APIs require no token, only the encoded
 * query this server produces. The visitor's browser never sees the provider,
 * the endpoints, the codec, or the key.
 *
 * POST body: { type, id, imdbId?, season?, episode? }
 * Response:  { success, title?, servers: [{ id, name, quality, sources:
 *              [{ url, quality, size, tags }] }], errors? }
 *
 * The provider refuses datacenter IPs (403 from serverless runtimes); set
 * `DOWNLOAD_PROXY_URL` to a forward proxy on such hosts and every upstream
 * call routes through it.
 */

export const dynamic = 'force-dynamic';

interface ResolveBody {
  type?: string;
  id?: string;
  imdbId?: string;
  season?: string;
  episode?: string;
}

interface ProviderSource {
  url?: string;
  quality?: string;
  label?: string;
  isEmbed?: boolean;
}

interface ProviderServer {
  id?: number | string;
  name?: string;
  quality?: string;
  scraper?: string;
  dl_support?: boolean;
  isDisable?: boolean;
}

/**
 * Splits a provider label like `720P 1.1 GB | HINDI | ENGLISH | WEB-DL | X265`
 * into display fields. Some labels omit the resolution (`427.7 MB | …`); every
 * field is optional and the raw label always travels alongside.
 */
function parseLabel(raw: string | undefined): { quality?: string; size?: string; tags: string[] } {
  if (!raw) return { tags: [] };
  const parts = raw.split('|').map((part) => part.trim()).filter(Boolean);
  let quality: string | undefined;
  let size: string | undefined;
  const tags: string[] = [];

  for (const part of parts) {
    const upper = part.toUpperCase();
    if (!quality && /^\d{3,4}P\b/.test(upper)) quality = part;
    else if (!size && /^\d+(\.\d+)?\s*(MB|GB)$/i.test(part)) size = part;
    else tags.push(part);
  }
  return { quality, size, tags };
}

function unauthorized() {
  return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request: Request) {
  const sessionId = await readSessionCookie();
  const session = sessionId ? await sessions.find(sessionId) : null;
  if (!session) return unauthorized();

  await enforce(RATE_LIMITS.download, session.userId);

  const body = (await request.json().catch(() => null)) as ResolveBody | null;
  const type = body?.type === 'tv' ? 'tv' : 'movie';
  const tmdbId = body?.id ?? '';
  if (!tmdbId) return badRequest('missing id');

  const season = body?.season ?? '1';
  const episode = body?.episode ?? '1';
  const imdbId = body?.imdbId ?? '';
  const selfOrigin = new URL(request.url).origin;

  // 1. Which scraper groups hold this title?
  const serversQuery = encodeProviderQuery({ type, tmdbId, imdb_id: imdbId, method: 'dl' });
  const serversResult = await providerFetch('/api/servers', serversQuery, 8_000, { selfOrigin });
  if (!serversResult.ok) {
    return NextResponse.json(
      { success: false, error: 'provider_unavailable', detail: serversResult.statuses },
      { status: 502 },
    );
  }

  const groups = (Array.isArray((serversResult.body as { servers?: unknown[] })?.servers)
    ? (serversResult.body as { servers: ProviderServer[] }).servers
    : []
  ).filter(
    (s): s is ProviderServer =>
      typeof s === 'object' && s !== null && s.dl_support !== false && s.isDisable !== true && Boolean(s.scraper),
  );

  if (groups.length === 0) {
    return NextResponse.json({ success: true, servers: [] });
  }

  // 2. Every group's sources, fetched in parallel. A group that fails is dropped
  //    rather than failing the whole resolution — three working nodes beat one
  //    perfect error.
  const settled = await Promise.allSettled(
    groups.map(async (group) => {
      const query = encodeProviderQuery({
        type,
        tmdbId,
        imdb_id: imdbId,
        provider: String(group.scraper),
        season,
        episode,
        method: 'dl',
      });
      const result = await providerFetch('/api/sources', query, 8_000, { selfOrigin });
      if (!result.ok) return null;
      const data = result.body as { sources?: ProviderSource[] } | null;
      const sources = Array.isArray(data?.sources) ? data!.sources : [];
      const usable = sources.filter((s) => s && typeof s.url === 'string' && s.url.startsWith('http') && s.isEmbed !== true);
      if (usable.length === 0) return null;
      return { group, sources: usable };
    }),
  );

  const servers = settled
    .map((entry) => (entry.status === 'fulfilled' ? entry.value : null))
    .filter((v): v is { group: ProviderServer; sources: ProviderSource[] } => v !== null)
    .map(({ group, sources }) => ({
      id: String(group.id ?? group.scraper),
      name: String(group.name ?? group.scraper),
      quality: typeof group.quality === 'string' ? group.quality : undefined,
      sources: sources.map((source) => {
        const parsed = parseLabel(source.label ?? source.quality);
        return {
          url: String(source.url),
          quality: parsed.quality ?? undefined,
          size: parsed.size ?? undefined,
          tags: parsed.tags,
          label: (source.label ?? source.quality ?? '').trim(),
        };
      }),
    }));

  return NextResponse.json({ success: true, servers });
}

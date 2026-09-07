import CryptoJS from 'crypto-js';

/**
 * The provider's query codec, re-implemented server-side.
 *
 * The playback/download provider encodes every API query as AES-encrypted JSON
 * (key + payload below mirror its published client bundle) with a timestamp and
 * salt bolted on. Responses come back as `{ _hash }` blobs encoded the same way.
 *
 * This exists so Cineora's server can talk to the provider directly and the
 * visitor's browser never learns the provider's origin, endpoints, or encoding.
 * The key is not a Cineora secret — it ships in the provider's own public JS —
 * so it lives here in code, not in the environment.
 */

const PROVIDER_KEY = 'S8x!Jk4ZP1uG8$my';

export interface ProviderQuery {
  type: 'movie' | 'tv';
  /** TMDb id — the provider routes on this. */
  tmdbId: string;
  imdb_id?: string;
  season?: string;
  episode?: string;
  method: 'dl' | 'web';
  /** The scraper id from /api/servers ("hdhub4u", …). Sources call only. */
  provider?: string;
}

export function encodeProviderQuery(query: ProviderQuery): string {
  const payload = {
    ...query,
    imdb_id: query.imdb_id ?? '',
    season: query.season ?? '1',
    episode: query.episode ?? '1',
    _req_ts: Date.now(),
    _req_salt: Math.random().toString(36).slice(2, 12),
  };
  return CryptoJS.AES.encrypt(JSON.stringify(payload), PROVIDER_KEY)
    .toString()
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function decodeProviderResponse<T>(hash: string | undefined): T | null {
  if (!hash) return null;
  let normalized = hash.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4 !== 0) normalized += '=';
  const text = CryptoJS.AES.decrypt(normalized, PROVIDER_KEY).toString(CryptoJS.enc.Utf8);
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as T & { _req_ts?: number; _req_salt?: string };
    delete parsed._req_ts;
    delete parsed._req_salt;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Calls one of the provider's API endpoints, with origin fallback.
 *
 * Some hosts treat datacenter IPs differently from residential ones, so a call
 * that works from a laptop can fail from a serverless function. Both of the
 * provider's known origins expose the same API; trying the second one on
 * failure costs one extra request and rescues exactly that case. Every call is
 * time-boxed so a stalled connection can never hang a function until the
 * platform kills it.
 */
export const PROVIDER_ORIGINS = ['https://nxsha.space', 'https://web.nxsha.app'] as const;

export interface ProviderFetchResult {
  ok: boolean;
  body: unknown;
  statuses: string[];
}

/**
 * Resolves the upstream request. When `DOWNLOAD_PROXY_URL` is set, every request is
 * forwarded through that HTTP(S) proxy — the fix for hosts that refuse datacenter IPs
 * (the provider returns 403 from serverless runtimes otherwise). Without it, the call
 * goes direct, which works from a normal machine and in local development.
 */
function upstreamFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const proxyUrl = process.env.DOWNLOAD_PROXY_URL;
  if (!proxyUrl) return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });

  // Forward-proxy mode: the proxy fetches the real URL for us, so the egress IP is
  // the proxy's, not the function's. The proxy decides its own timeout handling.
  const target = encodeURIComponent(url);
  return fetch(`${proxyUrl}?url=${target}`, {
    method: 'GET',
    headers: { 'user-agent': init.headers && typeof init.headers === 'object' && 'user-agent' in init.headers ? String((init.headers as Record<string, string>)['user-agent']) : 'Mozilla/5.0' },
    signal: AbortSignal.timeout(timeoutMs + 5_000),
  });
}

export async function providerFetch(
  path: string,
  query: string,
  timeoutMs = 8_000,
): Promise<ProviderFetchResult> {
  const statuses: string[] = [];
  const usingProxy = Boolean(process.env.DOWNLOAD_PROXY_URL);

  for (const origin of PROVIDER_ORIGINS) {
    const url = `${origin}${path}?q=${encodeURIComponent(query)}`;
    try {
      const response = await upstreamFetch(
        url,
        { headers: { 'user-agent': 'Mozilla/5.0', referer: `${origin}/`, accept: 'application/json' } },
        timeoutMs,
      );
      statuses.push(`${new URL(origin).hostname}:${response.status}${usingProxy ? '(proxy)' : ''}`);
      if (!response.ok) continue;

      const json = (await response.json().catch(() => null)) as { _hash?: string } | null;
      const decoded = json?._hash ? decodeProviderResponse<Record<string, unknown>>(json._hash) : null;
      if (decoded) return { ok: true, body: decoded, statuses };
      statuses.push(`${new URL(origin).hostname}:undecodable`);
    } catch (error) {
      const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'unreachable';
      statuses.push(`${new URL(origin).hostname}:${reason}${usingProxy ? '(proxy)' : ''}`);
    }
  }

  return { ok: false, body: null, statuses };
}

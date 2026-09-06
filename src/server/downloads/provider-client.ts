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
  /** The decoded body on success; null otherwise. */
  body: unknown;
  /** Status per origin tried, for surfacing in the 502 response. */
  statuses: string[];
}

export async function providerFetch(
  path: string,
  query: string,
  timeoutMs = 8_000,
): Promise<ProviderFetchResult> {
  const statuses: string[] = [];

  for (const origin of PROVIDER_ORIGINS) {
    try {
      const response = await fetch(`${origin}${path}?q=${encodeURIComponent(query)}`, {
        headers: { 'user-agent': 'Mozilla/5.0', referer: `${origin}/`, accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs),
      });
      statuses.push(`${new URL(origin).hostname}:${response.status}`);
      if (!response.ok) continue;

      const json = (await response.json().catch(() => null)) as { _hash?: string } | null;
      const decoded = json?._hash ? decodeProviderResponse<Record<string, unknown>>(json._hash) : null;
      if (decoded) return { ok: true, body: decoded, statuses };
      statuses.push(`${new URL(origin).hostname}:undecodable`);
    } catch (error) {
      const reason = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'unreachable';
      statuses.push(`${new URL(origin).hostname}:${reason}`);
    }
  }

  return { ok: false, body: null, statuses };
}

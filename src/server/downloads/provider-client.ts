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

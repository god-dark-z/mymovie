import type { MediaIds } from '@/types/media';
import { normalizeLanguageCode } from '@/lib/nxsha/languages';
import { getServerConfig } from '@/lib/nxsha/servers';

/**
 * Nxsha embed provider — the only place in the app that builds a playback URL.
 *
 * Everything here mirrors the live documentation at https://nxsha.space/embed
 * (verified against that page):
 *
 *   /embed/movie/{tmdb_or_imdb_id}
 *   /embed/tv/{tmdb_or_imdb_id}/{season}/{episode}
 *
 * Documented query parameters, and nothing else:
 *   ?server=<node>          preferred node, Nxsha still fails over by default
 *   ?one_server=true        strict single-node playback, disables that fallback
 *   ?sub=<ISO 639-1>        preferred subtitle track
 *   ?lang=<ISO 639-1>       preferred audio track
 *   ?disable_dl_button=true hides the player's download control
 *   ?disable_app_ad=true    hides Nxsha app branding in the player menu
 *   ?color=<name|%23hex>    player accent colour
 *
 * There is no documented anime endpoint: `/embed/anime/...` is not published and
 * responds 404, so anime is played through the documented `tv` endpoint using the
 * series' IMDb/TMDb id — which is what an anime series is in those databases.
 */

export const NXSHA_ORIGIN = (process.env.NEXT_PUBLIC_NXSHA_ORIGIN ?? 'https://nxsha.space').replace(
  /\/+$/,
  '',
);

export const NXSHA_DOCS_URL = `${NXSHA_ORIGIN}/embed`;

/** Cineora's ruby accent, passed through the documented custom-hex form. */
const PLAYER_ACCENT = '#d4213d';

const IMDB_ID = /^tt\d{7,10}$/;
const TMDB_ID = /^\d{1,9}$/;

export type NxshaIdKind = 'imdb' | 'tmdb';

export interface NxshaIdentity {
  value: string;
  kind: NxshaIdKind;
}

export function isImdbId(value: string): boolean {
  return IMDB_ID.test(value);
}

export function isTmdbId(value: string): boolean {
  return TMDB_ID.test(value);
}

/**
 * Chooses the identifier to send to Nxsha.
 *
 * IMDb is preferred because it is Cineora's canonical identity and Nxsha accepts
 * it. A TMDb id is only used when there is no IMDb id, and the two are never
 * interchanged — a bare number is never passed off as an IMDb id.
 */
export function resolveIdentity(ids: MediaIds, prefer: NxshaIdKind = 'imdb'): NxshaIdentity | null {
  const imdb = ids.imdbId && isImdbId(ids.imdbId) ? ids.imdbId : null;
  const tmdb = ids.tmdbId && isTmdbId(ids.tmdbId) ? ids.tmdbId : null;

  if (prefer === 'tmdb') {
    if (tmdb) return { value: tmdb, kind: 'tmdb' };
    if (imdb) return { value: imdb, kind: 'imdb' };
    return null;
  }

  if (imdb) return { value: imdb, kind: 'imdb' };
  if (tmdb) return { value: tmdb, kind: 'tmdb' };
  return null;
}

export interface EmbedPreferences {
  /** Server config id from `lib/nxsha/servers`. */
  serverId?: string;
  /** Strict single-node playback (`one_server=true`). */
  lockServer?: boolean;
  /** Preferred audio language, ISO 639-1. */
  language?: string | null;
  /** Preferred subtitle language, ISO 639-1. */
  subtitle?: string | null;
  /** Hide the player download control. Defaults to true. */
  hideDownload?: boolean;
  /** Hide Nxsha app branding. Defaults to true. */
  hideAppAd?: boolean;
  /** Send Cineora's accent colour. Defaults to true. */
  brandAccent?: boolean;
}

export interface MovieEmbedRequest extends EmbedPreferences {
  id: string;
}

export interface TvEmbedRequest extends EmbedPreferences {
  id: string;
  season: number;
  episode: number;
}

function assertValidId(id: string): void {
  if (!isImdbId(id) && !isTmdbId(id)) {
    throw new Error(`Unsupported Nxsha media id: ${id}`);
  }
}

function buildQuery(preferences: EmbedPreferences): string {
  const params = new URLSearchParams();

  const server = getServerConfig(preferences.serverId);
  if (server.nxshaServer) {
    params.set('server', server.nxshaServer);
    // `one_server` is only meaningful alongside an explicit server.
    if (preferences.lockServer) params.set('one_server', 'true');
  }

  const language = normalizeLanguageCode(preferences.language);
  if (language) params.set('lang', language);

  const subtitle = normalizeLanguageCode(preferences.subtitle);
  if (subtitle) params.set('sub', subtitle);

  if (preferences.hideDownload !== false) params.set('disable_dl_button', 'true');
  if (preferences.hideAppAd !== false) params.set('disable_app_ad', 'true');
  if (preferences.brandAccent !== false) params.set('color', PLAYER_ACCENT);

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function buildMovieEmbedUrl({ id, ...preferences }: MovieEmbedRequest): string {
  assertValidId(id);
  return `${NXSHA_ORIGIN}/embed/movie/${id}${buildQuery(preferences)}`;
}

export function buildTvEmbedUrl({ id, season, episode, ...preferences }: TvEmbedRequest): string {
  assertValidId(id);
  if (!Number.isInteger(season) || season < 0) throw new Error(`Invalid season: ${season}`);
  if (!Number.isInteger(episode) || episode < 1) throw new Error(`Invalid episode: ${episode}`);
  return `${NXSHA_ORIGIN}/embed/tv/${id}/${season}/${episode}${buildQuery(preferences)}`;
}

/**
 * The `allow` list Nxsha's own documentation uses for its iframe snippet.
 * No `sandbox` attribute: the documented snippet does not use one, and adding it
 * would break the third-party player.
 */
export const NXSHA_IFRAME_ALLOW =
  'autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write';

import type { MediaKind } from '@/types/media';

/**
 * Anime classification.
 *
 * Cinemeta exposes `genre` and `country` for every title, so anime is detected
 * from real metadata rather than a hardcoded title list: Japanese animation is
 * animation whose production country includes Japan.
 *
 * This is a heuristic over provider data, not an authoritative anime database
 * flag — it is used for badges, grouping and rails, never for playback claims.
 */
const JAPAN_MARKERS = ['japan'];
const ANIMATION_GENRES = ['animation'];

export function detectAnime(input: {
  genres?: string[] | null;
  country?: string | null;
}): boolean {
  const genres = (input.genres ?? []).map((genre) => genre.toLowerCase());
  const country = (input.country ?? '').toLowerCase();
  if (!genres.some((genre) => ANIMATION_GENRES.includes(genre))) return false;
  return JAPAN_MARKERS.some((marker) => country.includes(marker));
}

/** Maps an upstream type + anime flag onto the route namespace. */
export function resolveKind(upstreamType: string, isAnime: boolean): MediaKind {
  if (upstreamType === 'movie') return 'movie';
  return isAnime ? 'anime' : 'tv';
}

/** Route base for a normalized title. */
export function detailHref(kind: MediaKind, id: string): string {
  return `/${kind}/${encodeURIComponent(id)}`;
}

/** Short badge text shown on cards and search rows. */
export function kindBadge(kind: MediaKind, isAnime: boolean): string {
  if (kind === 'anime') return 'ANIME';
  if (kind === 'movie') return isAnime ? 'ANIME FILM' : 'MOVIE';
  return 'TV';
}

/** Long-form label used in metadata lines and page titles. */
export function kindLabel(kind: MediaKind, isAnime: boolean): string {
  if (kind === 'anime') return 'Anime series';
  if (kind === 'movie') return isAnime ? 'Anime film' : 'Movie';
  return 'TV series';
}

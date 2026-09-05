import type { MediaKind } from '@/types/media';

/**
 * Watch route builders.
 *
 * Nxsha's documented episodic endpoint takes a season *and* an episode, so every
 * episodic watch route carries both. Anime therefore uses
 * `/watch/anime/{id}/{season}/{episode}`; the shorter `/watch/anime/{id}/{n}`
 * form is still accepted and resolved against the real episode list, never by
 * assuming season 1.
 */
export interface EpisodeRef {
  season: number;
  episode: number;
}

export function watchHref(kind: MediaKind, id: string, episode?: EpisodeRef): string {
  const encoded = encodeURIComponent(id);
  if (kind === 'movie') return `/watch/movie/${encoded}`;
  const base = kind === 'anime' ? 'anime' : 'tv';
  const season = episode?.season ?? 1;
  const number = episode?.episode ?? 1;
  return `/watch/${base}/${encoded}/${season}/${number}`;
}

/** Parses a positive integer route segment, returning null for anything else. */
export function parseSegmentNumber(value: string | undefined, min: number): number | null {
  if (!value || !/^\d{1,5}$/.test(value)) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= min ? parsed : null;
}

/**
 * Where "continue watching" should send someone.
 *
 * A recorded episode goes straight back to the player. A series with no recorded
 * episode goes to the detail page instead of guessing S1 E1 — the episode list is
 * where that choice belongs.
 */
export function resumeHref(entry: {
  id: string;
  kind: MediaKind;
  season?: number;
  episode?: number;
}): string {
  if (entry.kind === 'movie') return watchHref('movie', entry.id);
  if (entry.season !== undefined && entry.episode !== undefined) {
    return watchHref(entry.kind, entry.id, { season: entry.season, episode: entry.episode });
  }
  return `/${entry.kind}/${encodeURIComponent(entry.id)}`;
}

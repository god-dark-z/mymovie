import { asArray, asNumber, asRecord, asString, createStore } from '@/lib/storage/store';
import type { MediaKind, MediaSummary } from '@/types/media';

/**
 * Watchlist ("My List").
 *
 * Entries store just enough normalized metadata to render a card offline, plus
 * the id pair needed to jump straight into playback.
 */
export interface WatchlistEntry {
  id: string;
  kind: MediaKind;
  isAnime: boolean;
  title: string;
  poster?: string;
  backdrop?: string;
  year?: string;
  rating?: number;
  imdbId?: string;
  tmdbId?: string;
  addedAt: number;
}

const MAX_ENTRIES = 400;

function parseEntry(value: unknown): WatchlistEntry | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = asString(record.id);
  const title = asString(record.title);
  const kind = asString(record.kind);
  if (!id || !title || (kind !== 'movie' && kind !== 'tv' && kind !== 'anime')) return null;

  return {
    id,
    kind,
    isAnime: record.isAnime === true,
    title,
    poster: asString(record.poster),
    backdrop: asString(record.backdrop),
    year: asString(record.year),
    rating: asNumber(record.rating),
    imdbId: asString(record.imdbId),
    tmdbId: asString(record.tmdbId),
    addedAt: asNumber(record.addedAt) ?? Date.now(),
  };
}

export const watchlistStore = createStore<WatchlistEntry[]>({
  name: 'watchlist',
  version: 1,
  fallback: [],
  parse: (value) => {
    const list = asArray(value);
    if (!list) return null;
    return list.map(parseEntry).filter((entry): entry is WatchlistEntry => entry !== null);
  },
});

export function toWatchlistEntry(media: MediaSummary): WatchlistEntry {
  return {
    id: media.id,
    kind: media.kind,
    isAnime: media.isAnime,
    title: media.title,
    poster: media.poster,
    backdrop: media.backdrop,
    year: media.year,
    rating: media.rating,
    imdbId: media.ids.imdbId,
    tmdbId: media.ids.tmdbId,
    addedAt: Date.now(),
  };
}

export function isInWatchlist(entries: WatchlistEntry[], id: string): boolean {
  return entries.some((entry) => entry.id === id);
}

export function addToWatchlist(media: MediaSummary): void {
  watchlistStore.update((current) => {
    if (current.some((entry) => entry.id === media.id)) return current;
    return [toWatchlistEntry(media), ...current].slice(0, MAX_ENTRIES);
  });
}

export function removeFromWatchlist(id: string): void {
  watchlistStore.update((current) => current.filter((entry) => entry.id !== id));
}

export function toggleWatchlist(media: MediaSummary): boolean {
  let added = false;
  watchlistStore.update((current) => {
    if (current.some((entry) => entry.id === media.id)) {
      added = false;
      return current.filter((entry) => entry.id !== media.id);
    }
    added = true;
    return [toWatchlistEntry(media), ...current].slice(0, MAX_ENTRIES);
  });
  return added;
}

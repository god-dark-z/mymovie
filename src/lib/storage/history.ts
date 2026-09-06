import { asArray, asNumber, asRecord, asString, createStore } from '@/lib/storage/store';
import { recordingAllowed } from '@/lib/storage/privacy';
import type { MediaKind } from '@/types/media';

/**
 * "Continue watching" / recently opened.
 *
 * Deliberately *not* playback progress. The Nxsha iframe is a third-party origin
 * with no documented event or telemetry API, so there is no honest way to know
 * how far into an episode a viewer got. What we can record truthfully is what
 * they opened and when — which is enough to offer "resume S2 E4" and "next
 * episode".
 *
 * `positionSeconds` / `durationSeconds` exist so a future provider that *does*
 * document progress events can populate them without a schema migration. They
 * stay undefined today, and the UI renders no progress bar while they are.
 */
export interface WatchHistoryEntry {
  /** Route id of the title. */
  id: string;
  kind: MediaKind;
  isAnime: boolean;
  title: string;
  poster?: string;
  backdrop?: string;
  year?: string;
  imdbId?: string;
  tmdbId?: string;
  /** Present for series and anime. */
  season?: number;
  episode?: number;
  episodeTitle?: string;
  openedAt: number;
  /** Reserved for providers that document playback telemetry. */
  positionSeconds?: number;
  durationSeconds?: number;
}

const MAX_ENTRIES = 60;

function parseEntry(value: unknown): WatchHistoryEntry | null {
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
    imdbId: asString(record.imdbId),
    tmdbId: asString(record.tmdbId),
    season: asNumber(record.season),
    episode: asNumber(record.episode),
    episodeTitle: asString(record.episodeTitle),
    openedAt: asNumber(record.openedAt) ?? Date.now(),
    positionSeconds: asNumber(record.positionSeconds),
    durationSeconds: asNumber(record.durationSeconds),
  };
}

export const historyStore = createStore<WatchHistoryEntry[]>({
  name: 'history',
  version: 1,
  fallback: [],
  parse: (value) => {
    const list = asArray(value);
    if (!list) return null;
    return list.map(parseEntry).filter((entry): entry is WatchHistoryEntry => entry !== null);
  },
});

/** Records an opened title, replacing any earlier entry for the same title. */
export function recordWatch(entry: Omit<WatchHistoryEntry, 'openedAt'>): void {
  // An account that has switched watch history off records nothing at all, rather
  // than recording it and hiding the rail.
  if (!recordingAllowed('watchHistory')) return;
  historyStore.update((current) => {
    const rest = current.filter((item) => item.id !== entry.id);
    return [{ ...entry, openedAt: Date.now() }, ...rest].slice(0, MAX_ENTRIES);
  });
}

export function removeFromHistory(id: string): void {
  historyStore.update((current) => current.filter((entry) => entry.id !== id));
}

export function clearHistory(): void {
  historyStore.clear();
}

export function findHistoryEntry(entries: WatchHistoryEntry[], id: string): WatchHistoryEntry | null {
  return entries.find((entry) => entry.id === id) ?? null;
}

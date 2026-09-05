'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MediaCard, MediaGrid } from '@/components/media/MediaCard';
import { Button } from '@/components/ui/Button';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { BookmarkIcon, CloseIcon, PlayIcon, TrashIcon } from '@/components/ui/Icons';
import { PosterImage } from '@/components/ui/PosterImage';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { useMounted } from '@/hooks/useMounted';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useWatchlist } from '@/hooks/useWatchlist';
import { kindLabel } from '@/lib/metadata/classify';
import { posterUrl } from '@/lib/metadata/images';
import { resumeHref } from '@/lib/playback/routes';
import { episodeLabel, formatRelativeTime, joinNonEmpty, truncate } from '@/lib/utils/format';
import type { WatchHistoryEntry, WatchlistEntry } from '@/lib/storage';
import type { MediaKind, MediaSummary } from '@/types/media';

type Filter = 'all' | MediaKind;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'movie', label: 'Movies' },
  { id: 'tv', label: 'Series' },
  { id: 'anime', label: 'Anime' },
];

const HISTORY_LIMIT = 12;

/**
 * The library: saved titles, plus what was opened most recently.
 *
 * Both lists live in this browser, so the whole screen renders after hydration —
 * the server cannot read `localStorage`, and rendering an empty state first would
 * flash "nothing saved" at someone whose list is full. The storage layer behind
 * these hooks can be re-pointed at an authenticated backend without touching this
 * component.
 */
export function LibraryView() {
  const mounted = useMounted();
  const { entries: saved, remove: removeSaved } = useWatchlist();
  const { entries: history, remove: removeHistory, clear: clearHistory } = useWatchHistory();
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => tally(saved), [saved]);

  // Derived rather than corrected in an effect: removing the last movie while the
  // Movies filter is active would otherwise leave an empty grid behind a chip that
  // no longer exists.
  const active: Filter = filter !== 'all' && counts[filter] === 0 ? 'all' : filter;

  const visible = useMemo(
    () => (active === 'all' ? saved : saved.filter((entry) => entry.kind === active)),
    [saved, active],
  );

  if (!mounted) {
    return (
      <div className="gutter-x">
        <GridSkeleton count={12} />
      </div>
    );
  }

  const recent = history.slice(0, HISTORY_LIMIT);

  if (saved.length === 0 && recent.length === 0) {
    return (
      <div className="gutter-x">
        <EmptyState
          icon={<BookmarkIcon />}
          title="Your list is empty"
          description="Save anything you want to come back to and it waits for you here. Everything stays on this device — no account, nothing uploaded."
          action={{ label: 'Browse titles', href: '/' }}
        />
      </div>
    );
  }

  const filters = FILTERS.filter((entry) => entry.id === 'all' || counts[entry.id] > 0);

  return (
    <div className="gutter-x flex flex-col gap-11 md:gap-14">
      {recent.length > 0 ? (
        <section aria-labelledby="library-recent">
          <div className="flex items-end justify-between gap-3">
            <SectionHeader
              id="library-recent"
              title="Continue watching"
              subtitle="Titles you opened on this device"
              className="min-w-0 flex-1"
            />
            <Button variant="ghost" size="sm" onClick={clearHistory} className="shrink-0">
              <TrashIcon className="size-4" />
              Clear
            </Button>
          </div>

          <ul className="mt-4 flex flex-col gap-2">
            {recent.map((entry) => (
              <HistoryRow
                key={`${entry.id}-${entry.season ?? 0}-${entry.episode ?? 0}`}
                entry={entry}
                onRemove={() => removeHistory(entry.id)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="library-saved">
        <SectionHeader
          id="library-saved"
          title="My List"
          subtitle={saved.length > 0 ? countLabel(saved.length) : undefined}
        />

        {saved.length === 0 ? (
          <EmptyState
            compact
            icon={<BookmarkIcon />}
            title="Nothing saved yet"
            description="Use the bookmark on any title to keep it here."
            action={{ label: 'Browse titles', href: '/' }}
            className="glass-1 mt-4 rounded-3xl"
          />
        ) : (
          <>
            {filters.length > 2 ? (
              <ChipRow label="Filter saved titles by type" className="mt-4">
                {filters.map((entry) => (
                  <Chip
                    key={entry.id}
                    active={active === entry.id}
                    onClick={() => setFilter(entry.id)}
                  >
                    {entry.label}
                    <span className="tabular-nums opacity-60">
                      {entry.id === 'all' ? saved.length : counts[entry.id]}
                    </span>
                  </Chip>
                ))}
              </ChipRow>
            ) : null}

            <MediaGrid className="mt-5">
              {visible.map((entry) => (
                <SavedCard key={entry.id} entry={entry} onRemove={() => removeSaved(entry.id)} />
              ))}
            </MediaGrid>
          </>
        )}
      </section>
    </div>
  );
}

/**
 * One "continue watching" row. A wide thumbnail keeps twelve of these compact,
 * where the poster rail on the home page is built for browsing.
 */
function HistoryRow({ entry, onRemove }: { entry: WatchHistoryEntry; onRemove: () => void }) {
  const { season, episode } = entry;
  // Season 0 is a specials track, so this checks presence, not truthiness.
  const marker =
    season !== undefined && episode !== undefined
      ? episodeLabel(season, episode)
      : kindLabel(entry.kind, entry.isAnime);
  const line = joinNonEmpty([
    marker,
    entry.episodeTitle ? truncate(entry.episodeTitle, 40) : entry.year,
    formatRelativeTime(entry.openedAt),
  ]);

  return (
    <li className="relative">
      <Link
        href={resumeHref(entry)}
        prefetch={false}
        className="glass-1 tap group/row flex items-center gap-3 rounded-2xl p-2.5 pr-13 transition duration-200 ease-glass md:hover:border-(--glass-line-strong) md:hover:bg-white/8"
      >
        <div className="relative aspect-16/9 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-850 sm:w-28">
          {/* Decorative: the title sits beside it inside the same link. */}
          <PosterImage
            src={posterUrl(entry.backdrop ?? entry.poster, 'small')}
            alt=""
            sizes="(min-width: 640px) 112px, 96px"
            wide
          />
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center bg-ink-950/35 transition-opacity duration-200 md:opacity-0 md:group-hover/row:opacity-100"
          >
            <span className="grid size-8 place-items-center rounded-full bg-white/92 text-ink-950">
              <PlayIcon className="size-3.5 translate-x-px" />
            </span>
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.875rem] font-medium text-mist-50">{entry.title}</p>
          {line ? <p className="mt-1 truncate text-[0.6875rem] text-mist-500">{line}</p> : null}
        </div>
      </Link>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${entry.title} from continue watching`}
        className="tap absolute top-1/2 right-1.5 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-mist-500 transition-colors duration-200 md:size-9 md:hover:bg-white/8 md:hover:text-white"
      >
        <CloseIcon className="size-3.5" />
      </button>
    </li>
  );
}

/** A saved poster with its own remove affordance, layered over the shared card. */
function SavedCard({ entry, onRemove }: { entry: WatchlistEntry; onRemove: () => void }) {
  return (
    <div className="group/saved relative">
      <MediaCard media={toSummary(entry)} showKind />
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${entry.title} from My List`}
        className="glass-flat tap absolute top-2 right-2 flex size-8 items-center justify-center rounded-full text-mist-200 transition-opacity duration-200 md:opacity-0 md:focus-visible:opacity-100 md:group-hover/saved:opacity-100"
      >
        <CloseIcon className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * A stored entry is a snapshot, not a fresh metadata result: genres were never
 * saved, so they are honestly empty rather than guessed.
 */
function toSummary(entry: WatchlistEntry): MediaSummary {
  return {
    id: entry.id,
    ids: { imdbId: entry.imdbId, tmdbId: entry.tmdbId },
    kind: entry.kind,
    isAnime: entry.isAnime,
    title: entry.title,
    poster: entry.poster,
    backdrop: entry.backdrop,
    year: entry.year,
    rating: entry.rating,
    genres: [],
  };
}

function tally(entries: WatchlistEntry[]): Record<MediaKind, number> {
  const counts: Record<MediaKind, number> = { movie: 0, tv: 0, anime: 0 };
  for (const entry of entries) counts[entry.kind] += 1;
  return counts;
}

function countLabel(total: number): string {
  return `${total} ${total === 1 ? 'title' : 'titles'} saved on this device`;
}


'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { useMounted } from '@/hooks/useMounted';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { CalendarIcon, PlayIcon, StarIcon } from '@/components/ui/Icons';
import { EpisodeStill } from '@/components/ui/EpisodeStill';
import { watchHref } from '@/lib/playback/routes';
import { isAddressable } from '@/lib/playback/availability';
import { formatRating, formatShortDate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { Episode, MediaKind, SeasonSummary } from '@/types/media';

/**
 * Season picker plus episode list.
 *
 * The full episode list arrives with the detail payload, so switching seasons is
 * instant and needs no request. Episodes that have not aired are rendered as
 * plain rows rather than links — the provider tells us the air date, and sending
 * someone to a player for an episode that does not exist yet is a dead end.
 */
export function EpisodeBrowser({
  id,
  kind,
  seasons,
  episodes,
  initialSeason,
}: {
  id: string;
  kind: MediaKind;
  seasons: SeasonSummary[];
  episodes: Episode[];
  initialSeason?: number;
}) {
  const mounted = useMounted();
  const { find } = useWatchHistory();
  const lastWatched = mounted ? find(id) : null;

  const fallbackSeason = seasons[0]?.season ?? episodes[0]?.season ?? 1;
  const [season, setSeason] = useState(initialSeason ?? fallbackSeason);

  const active = seasons.some((entry) => entry.season === season) ? season : fallbackSeason;

  const visible = useMemo(
    () => episodes.filter((episode) => episode.season === active),
    [episodes, active],
  );

  if (episodes.length === 0) return null;

  return (
    <section aria-label="Episodes">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-display text-lg font-semibold text-white md:text-xl">Episodes</h2>
        <p className="text-[0.75rem] text-mist-500">
          {visible.length} {visible.length === 1 ? 'episode' : 'episodes'}
        </p>
      </div>

      {seasons.length > 1 ? (
        <ChipRow label="Select a season" className="mt-3.5">
          {seasons.map((entry) => (
            <Chip
              key={entry.season}
              active={entry.season === active}
              onClick={() => setSeason(entry.season)}
            >
              {entry.label}
            </Chip>
          ))}
        </ChipRow>
      ) : null}

      <ul className="mt-4 flex flex-col gap-2.5">
        {visible.map((episode) => (
          <li key={episode.id}>
            <EpisodeRow
              episode={episode}
              href={watchHref(kind, id, { season: episode.season, episode: episode.episode })}
              current={
                lastWatched?.season === episode.season && lastWatched?.episode === episode.episode
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EpisodeRow({
  episode,
  href,
  current,
}: {
  episode: Episode;
  href: string;
  current: boolean;
}) {
  const rating = formatRating(episode.rating);
  const airDate = formatShortDate(episode.airDate);
  // Specials numbered 0 have no representable embed URL, so they list without a
  // link rather than pointing at a player that cannot load them.
  const linkable = !episode.unreleased && isAddressable(episode);

  const body = (
    <>
      <div
        className={cn(
          'relative aspect-16/9 w-28 shrink-0 overflow-hidden rounded-xl bg-ink-850 sm:w-36 lg:w-44',
          // An unreleased episode is dimmed on the still rather than on the row.
          // Fading the whole row also fades the "Airs …" line that explains why
          // it is faded, and at 65% that 11px label drops under 4.5:1.
          episode.unreleased && 'opacity-55',
        )}
      >
        <EpisodeStill
          src={episode.thumbnail}
          number={episode.episode}
          sizes="(min-width: 1024px) 176px, (min-width: 640px) 144px, 112px"
        />
        {linkable ? (
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center bg-ink-950/45 opacity-0 transition-opacity duration-200 md:group-hover:opacity-100"
          >
            <span className="grid size-9 place-items-center rounded-full bg-white/92 text-ink-950">
              <PlayIcon className="size-4" />
            </span>
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[0.8125rem] font-semibold text-mist-500 tabular-nums">
            {episode.episode}
          </span>
          <h3 className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-mist-50">
            {episode.title}
          </h3>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.6875rem] text-mist-500">
          {current ? (
            <span className="inline-flex items-center rounded-full bg-ruby-500/18 px-2 py-0.5 font-medium text-ruby-200">
              Last watched
            </span>
          ) : null}
          {episode.unreleased ? (
            <span className="inline-flex items-center gap-1 text-mist-300">
              <CalendarIcon className="size-3" />
              {airDate ? `Airs ${airDate}` : 'Not yet aired'}
            </span>
          ) : airDate ? (
            <span>{airDate}</span>
          ) : null}
          {rating ? (
            <span className="inline-flex items-center gap-1 tabular-nums">
              <StarIcon className="size-3 text-gold-400" />
              {rating}
            </span>
          ) : null}
        </div>

        {episode.overview ? (
          <p className="mt-1.5 line-clamp-2 text-[0.75rem] leading-relaxed text-mist-400">
            {episode.overview}
          </p>
        ) : null}
      </div>
    </>
  );

  const shell =
    'group flex gap-3.5 rounded-2xl border border-(--glass-line) bg-white/4 p-2.5 sm:gap-4 sm:p-3';

  if (!linkable) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        shell,
        'tap transition duration-200 ease-glass md:hover:border-(--glass-line-strong) md:hover:bg-white/8',
        current && 'border-ruby-500/35',
      )}
    >
      {body}
    </Link>
  );
}

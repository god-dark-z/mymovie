'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { isAddressable } from '@/lib/playback/availability';
import { watchHref, type EpisodeRef } from '@/lib/playback/routes';
import { cn } from '@/lib/utils/cn';
import { formatShortDate, seasonLabel } from '@/lib/utils/format';
import type { Episode, MediaKind, SeasonSummary } from '@/types/media';

/**
 * Episode switcher for the player.
 *
 * Works off the episode list already fetched for the page, so changing season
 * costs no request. Rows the documented endpoint cannot address — an episode
 * numbered 0, or one that has not aired — are listed but not linked, rather than
 * offered as a link to a player that cannot load them.
 */
export function EpisodeSheet({
  open,
  onClose,
  id,
  kind,
  seasons,
  episodes,
  current,
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  kind: MediaKind;
  seasons: SeasonSummary[];
  episodes: Episode[];
  current: EpisodeRef | null;
}) {
  const fallback = current?.season ?? seasons[0]?.season ?? episodes[0]?.season ?? 1;
  const [season, setSeason] = useState(fallback);
  const active = seasons.some((entry) => entry.season === season) ? season : fallback;
  const visible = useMemo(() => episodes.filter((entry) => entry.season === active), [episodes, active]);

  // Reopening on a different episode should land on that episode's season.
  useEffect(() => {
    if (open) setSeason(fallback);
  }, [open, fallback]);

  const currentRow = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    if (!open) return;
    currentRow.current?.scrollIntoView({ block: 'center' });
  }, [open, active]);

  return (
    <Sheet open={open} onClose={onClose} title="Episodes" size="lg">
      {seasons.length > 1 ? (
        <ChipRow label="Seasons" className="mb-3">
          {seasons.map((entry) => (
            <Chip key={entry.season} active={entry.season === active} onClick={() => setSeason(entry.season)}>
              {seasonLabel(entry.season)}
            </Chip>
          ))}
        </ChipRow>
      ) : null}

      <ul className="flex flex-col gap-1 pb-2">
        {visible.map((episode) => {
          const isCurrent = current?.season === episode.season && current?.episode === episode.episode;
          const linkable = !episode.unreleased && isAddressable(episode);
          const aired = formatShortDate(episode.airDate);

          const body = (
            <>
              <span className="w-8 shrink-0 text-center font-display text-sm font-medium text-mist-400 tabular-nums">
                {episode.episode}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] text-white">{episode.title}</span>
                <span className="mt-0.5 block truncate text-xs text-mist-500">
                  {episode.unreleased
                    ? aired
                      ? `Airs ${aired}`
                      : 'Not released yet'
                    : !isAddressable(episode)
                      ? 'No playable source for this entry'
                      : aired}
                </span>
              </span>
              {isCurrent ? <Badge tone="accent">Playing</Badge> : null}
            </>
          );

          const shell = 'flex min-h-13 items-center gap-3 rounded-2xl border px-3 py-2.5';

          return (
            <li key={episode.id}>
              {linkable ? (
                <Link
                  ref={isCurrent ? currentRow : undefined}
                  href={watchHref(kind, id, { season: episode.season, episode: episode.episode })}
                  prefetch={false}
                  onClick={onClose}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={cn(
                    shell,
                    'tap',
                    isCurrent
                      ? 'border-ruby-500/35 bg-ruby-500/10'
                      : 'border-transparent md:hover:bg-white/6',
                  )}
                >
                  {body}
                </Link>
              ) : (
                <div className={cn(shell, 'border-transparent opacity-55')}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

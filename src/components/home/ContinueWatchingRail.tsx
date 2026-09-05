'use client';

import Link from 'next/link';
import { RailCard } from '@/components/media/MediaCard';
import { Rail } from '@/components/ui/Rail';
import { CloseIcon, PlayIcon } from '@/components/ui/Icons';
import { PosterImage } from '@/components/ui/PosterImage';
import { useMounted } from '@/hooks/useMounted';
import { useWatchHistory } from '@/hooks/useWatchHistory';
import { posterUrl } from '@/lib/metadata/images';
import { resumeHref } from '@/lib/playback/routes';
import { episodeLabel, formatRelativeTime, joinNonEmpty } from '@/lib/utils/format';
import type { WatchHistoryEntry } from '@/lib/storage';

const MAX_ITEMS = 14;

/**
 * "Continue watching" — really "pick up where you left off".
 *
 * The Nxsha iframe is a third-party origin with no documented playback events, so
 * there is nothing honest to draw a progress bar from. What this rail knows is
 * true: which title was opened, which episode, and when. No fabricated percentages.
 */
export function ContinueWatchingRail() {
  const mounted = useMounted();
  const { entries, remove } = useWatchHistory();

  // Rendered only after hydration: the list lives in this browser, and the
  // server has no way to know it.
  if (!mounted || entries.length === 0) return null;

  const items = entries.slice(0, MAX_ITEMS);

  return (
    <Rail title="Continue watching" subtitle="Jump back into what you opened last">
      {items.map((entry) => (
        <RailCard key={`${entry.id}-${entry.season ?? 0}-${entry.episode ?? 0}`}>
          <ContinueCard entry={entry} onRemove={() => remove(entry.id)} />
        </RailCard>
      ))}
    </Rail>
  );
}

function ContinueCard({ entry, onRemove }: { entry: WatchHistoryEntry; onRemove: () => void }) {
  const line = joinNonEmpty([
    entry.season !== undefined && entry.episode !== undefined
      ? episodeLabel(entry.season, entry.episode)
      : entry.year,
    formatRelativeTime(entry.openedAt),
  ]);

  return (
    <div className="group/continue relative">
      <Link href={resumeHref(entry)} className="tap block focus:outline-none">
        <div className="relative aspect-2/3 w-full overflow-hidden rounded-2xl bg-ink-850 ring-1 ring-white/8 ring-inset transition duration-300 ease-glass group-focus-visible/continue:ring-2 group-focus-visible/continue:ring-ruby-400 md:group-hover/continue:ring-white/18">
          <PosterImage
            src={posterUrl(entry.poster, 'medium')}
            alt={entry.title}
            sizes="(min-width: 1280px) 200px, (min-width: 768px) 184px, 33vw"
          />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-ink-950/90 to-transparent" />
          <span
            aria-hidden
            className="glass-flat absolute bottom-2.5 left-2.5 flex size-9 items-center justify-center rounded-full text-white"
          >
            <PlayIcon className="size-4 translate-x-px" />
          </span>
        </div>

        <p className="mt-2.5 truncate px-0.5 text-[0.8125rem] font-medium text-mist-100">{entry.title}</p>
        {line ? <p className="mt-1 truncate px-0.5 text-[0.6875rem] text-mist-500">{line}</p> : null}
      </Link>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${entry.title} from continue watching`}
        className="glass-flat tap absolute top-2 right-2 flex size-8 items-center justify-center rounded-full text-mist-200 transition-opacity duration-200 md:opacity-0 md:focus-visible:opacity-100 md:group-hover/continue:opacity-100"
      >
        <CloseIcon className="size-3.5" />
      </button>
    </div>
  );
}

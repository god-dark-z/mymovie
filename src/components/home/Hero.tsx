'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WatchlistButton } from '@/components/media/WatchlistButton';
import { KindBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { InfoIcon, PlayIcon, StarIcon } from '@/components/ui/Icons';
import { PosterImage } from '@/components/ui/PosterImage';
import { detailHref } from '@/lib/metadata/classify';
import { cn } from '@/lib/utils/cn';
import { formatRating, formatRuntime, joinNonEmpty } from '@/lib/utils/format';
import type { MediaSummary } from '@/types/media';

const ADVANCE_MS = 7_500;
const SWIPE_PX = 48;

/**
 * Home hero.
 *
 * A crossfading spotlight over real catalog artwork. Auto-advance stops on hover,
 * on focus, when the tab is hidden, and whenever the visitor takes control by
 * swiping or using the indicators — an unstoppable carousel is a usability bug.
 */
export function Hero({ items }: { items: MediaSummary[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef<number | null>(null);

  const count = items.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((current) => (current + 1) % count);
    }, ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) return null;

  const active = items[index];

  return (
    <section
      aria-label="Featured titles"
      aria-roledescription="carousel"
      className="relative isolate h-[78svh] min-h-[30rem] w-full overflow-hidden sm:h-[80svh] lg:h-[86svh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (start === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) < SWIPE_PX) return;
        setPaused(true);
        go(index + (delta < 0 ? 1 : -1));
      }}
    >
      {items.map((item, slide) => (
        <div
          key={item.id}
          aria-hidden={slide !== index}
          className={cn(
            'absolute inset-0 transition-opacity duration-[900ms] ease-glass',
            slide === index ? 'opacity-100' : 'opacity-0',
          )}
        >
          <div className="absolute inset-0 animate-drift">
            <PosterImage
              src={item.backdrop ?? item.poster}
              alt={item.title}
              sizes="100vw"
              priority={slide === 0}
              wide
            />
          </div>
        </div>
      ))}

      {/* Two scrims instead of one: vertical for the copy, horizontal so the
          left-hand text stays legible over a busy frame. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/55 to-ink-950/25"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-r from-ink-950/85 via-ink-950/25 to-transparent"
      />

      <div className="gutter-x absolute inset-x-0 bottom-0 pb-9 md:pb-14">
        <div className="max-w-xl">
          <div className="flex items-center gap-2.5">
            <KindBadge kind={active.kind} isAnime={active.isAnime} />
            <span className="font-display text-[0.6875rem] font-semibold tracking-[0.18em] text-ruby-300 uppercase">
              Featured
            </span>
          </div>

          <h1 className="text-cinema mt-3.5 text-[2rem] leading-[1.05] font-semibold text-white sm:text-[2.5rem] lg:text-[3.25rem]">
            {active.title}
          </h1>

          <HeroMeta media={active} />

          {active.overview ? (
            <p className="text-cinema mt-3.5 line-clamp-3 max-w-lg text-[0.875rem] leading-relaxed text-mist-200 md:text-[0.9375rem]">
              {active.overview}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {active.kind === 'movie' ? (
              <>
                <ButtonLink href={`/watch/movie/${encodeURIComponent(active.id)}`} variant="accent" size="lg">
                  <PlayIcon className="size-[1.125rem] translate-x-px" />
                  Watch now
                </ButtonLink>
                <ButtonLink href={detailHref(active.kind, active.id)} variant="glass" size="lg">
                  <InfoIcon className="size-[1.125rem]" />
                  More info
                </ButtonLink>
              </>
            ) : (
              <ButtonLink href={detailHref(active.kind, active.id)} variant="accent" size="lg">
                <PlayIcon className="size-[1.125rem] translate-x-px" />
                View episodes
              </ButtonLink>
            )}
            <WatchlistButton media={active} size="lg" />
          </div>
        </div>

        {count > 1 ? (
          <div className="mt-8 flex items-center gap-2" role="tablist" aria-label="Featured title">
            {items.map((item, slide) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={slide === index}
                aria-label={item.title}
                onClick={() => {
                  setPaused(true);
                  go(slide);
                }}
                className="tap group/dot flex h-11 items-center px-1"
              >
                <span
                  className={cn(
                    'h-[3px] rounded-full transition-all duration-300 ease-glass',
                    slide === index
                      ? 'w-8 bg-ruby-400'
                      : 'w-4 bg-white/28 group-hover/dot:bg-white/55',
                  )}
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function HeroMeta({ media }: { media: MediaSummary }) {
  const rating = formatRating(media.rating);
  const facts = joinNonEmpty(
    [media.year ?? media.releaseInfo, formatRuntime(media.runtime), media.genres.slice(0, 2).join(' · ')],
    ' • ',
  );

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-mist-200">
      {rating ? (
        <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums">
          <StarIcon className="size-3.5 text-gold-400" />
          {rating}
          <span className="font-normal text-mist-400">IMDb</span>
        </span>
      ) : null}
      {facts ? <span className="text-mist-300">{facts}</span> : null}
    </div>
  );
}

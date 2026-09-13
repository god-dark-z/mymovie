'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CardSwap } from '@/components/home/CardSwap';
import { WatchlistButton } from '@/components/media/WatchlistButton';
import { KindBadge, RatingBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { InfoIcon, PlayIcon } from '@/components/ui/Icons';
import { PosterImage } from '@/components/ui/PosterImage';
import { detailHref } from '@/lib/metadata/classify';
import { backdropUrl, posterUrl } from '@/lib/metadata/images';
import { formatRuntime, joinNonEmpty } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import type { MediaSummary } from '@/types/media';

/**
 * The home hero: a 3D card-swap stack of the trending titles, with an info panel
 * that follows whichever card is at the front. Clicking a card opens its page.
 *
 * The front item's backdrop sits blurred behind everything, so the section keeps
 * the cinematic weight of a full-bleed hero while the cards carry the motion.
 */

/** Card dimensions per breakpoint, so a phone never renders a desktop-sized stack. */
function useSwapSize() {
  const [size, setSize] = useState({ w: 224, h: 320 });
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      setSize(vw >= 1024 ? { w: 352, h: 500 } : vw >= 640 ? { w: 292, h: 416 } : { w: 224, h: 320 });
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);
  return size;
}

export function HeroSwap({ items }: { items: MediaSummary[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  // True between "a swap begins" and "the new card has arrived": the info panel
  // fades out for that window, so its text is never caught beside the wrong
  // artwork mid-transition.
  const [leaving, setLeaving] = useState(false);
  const { w, h } = useSwapSize();

  const count = items.length;
  const front = items[Math.min(index, count - 1)] ?? items[0];

  // Preload the next poster so the next swap never waits on a network fetch —
  // the image is in cache before the transition starts, which is half of the
  // synchronization guarantee (the other half is CardSwap announcing the new
  // front card at the start of the move, not the end).
  useEffect(() => {
    if (count < 2) return;
    const next = items[(index + 1) % count];
    const url = posterUrl(next.poster, 'large');
    if (!url) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [index, items, count]);

  if (!front) return null;

  const facts = joinNonEmpty([front.year ?? front.releaseInfo, front.genres[0], formatRuntime(front.runtime)]);

  return (
    <section className="relative overflow-hidden">
      {/* Blurred backdrop of the front title — the cinematic base layer. */}
      <div aria-hidden className="absolute inset-0">
        <div key={front.id} className="absolute inset-0 animate-fade-in">
          <PosterImage
            src={backdropUrl(front.backdrop)}
            alt=""
            sizes="100vw"
            wide
            className="scale-110 opacity-30 blur-2xl"
          />
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/78 to-ink-950/55" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-ink-950 to-transparent" />
      </div>

      <div className="gutter-x relative flex min-h-[72svh] flex-col items-center justify-center gap-10 pt-[calc(var(--spacing-safe-t)+1.5rem)] pb-14 md:min-h-[78svh] md:flex-row md:items-center md:justify-between md:gap-14">
        {/* Info panel for whichever card is at the front. The OUTER div owns the
            swap-window fade (transition-based, so `animate-fade-in`'s fill-mode
            can never pin opacity over it); the INNER keyed div replays its
            entrance when the front item changes. */}
        <div
          className={cn(
            'order-2 max-w-xl text-center transition-opacity duration-300 ease-glass md:order-1 md:text-left',
            leaving && 'opacity-0',
          )}
        >
          <div key={front.id} className="animate-fade-in">
          <div className="flex items-center justify-center gap-2.5 md:justify-start">
            <KindBadge kind={front.kind} isAnime={front.isAnime} />
            <RatingBadge rating={front.rating} />
          </div>

          <h1 className="text-cinema mt-4 text-[2rem] leading-[1.04] font-semibold text-white sm:text-[2.5rem] lg:text-[3.25rem]">
            {front.title}
          </h1>

          {facts ? <p className="mt-3 text-[0.8125rem] text-mist-400 md:text-sm">{facts}</p> : null}

          {front.overview ? (
            <p className="mt-4 line-clamp-3 text-pretty text-sm leading-relaxed text-mist-300 md:text-[0.9375rem]">
              {front.overview}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
            <ButtonLink href={`/watch/${front.kind}/${front.id}`} variant="accent" size="lg" className="tap-glow" prefetch={false}>
              <PlayIcon className="size-[1.125rem]" />
              Watch now
            </ButtonLink>
            <ButtonLink href={detailHref(front.kind, front.id)} variant="glass" size="lg">
              <InfoIcon className="size-[1.125rem]" />
              More info
            </ButtonLink>
            <WatchlistButton media={front} />
          </div>
          </div>
        </div>

        {/* The card stack. */}
        <div className="order-1 md:order-2 md:shrink-0">
          <CardSwap
            width={w}
            height={h}
            cardDistance={Math.round(w * 0.16)}
            verticalDistance={Math.round(h * 0.09)}
            delay={5000}
            pauseOnHover
            skewAmount={5}
            onIndexChange={setIndex}
            onSwapStart={() => setLeaving(true)}
            onCardClick={(i) => {
              const item = items[i];
              if (item) router.push(detailHref(item.kind, item.id));
            }}
          >
            {items.map((item) => (
              <div key={item.id} className="relative h-full w-full">
                <PosterImage
                  src={posterUrl(item.poster, 'large')}
                  alt={item.title}
                  sizes={`${w}px`}
                  className="transition-transform duration-700 group-hover:scale-105"
                />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-ink-950/90 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-[0.8125rem] font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 truncate text-[0.6875rem] text-mist-400">
                      {item.year ?? item.releaseInfo ?? ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardSwap>
        </div>
      </div>
    </section>
  );
}

import type { ReactNode } from 'react';
import Link from 'next/link';
import { KindBadge } from '@/components/ui/Badge';
import { StarIcon } from '@/components/ui/Icons';
import { PosterImage } from '@/components/ui/PosterImage';
import { HUBS, browseHref, parseGenre } from '@/lib/metadata/browse';
import { kindLabel } from '@/lib/metadata/classify';
import { backdropUrl, posterUrl } from '@/lib/metadata/images';
import { formatRating, formatRuntime, joinNonEmpty } from '@/lib/utils/format';
import type { MediaDetail } from '@/types/media';

/**
 * Title header: backdrop, poster, identity and actions.
 *
 * Every line is rendered only when the provider supplied it, so a sparse title
 * collapses gracefully instead of showing empty labels or placeholder values.
 */
export function DetailHero({ detail, actions }: { detail: MediaDetail; actions: ReactNode }) {
  const hub = detail.isAnime ? HUBS.anime : detail.kind === 'movie' ? HUBS.movies : HUBS.series;
  const rating = formatRating(detail.rating);
  const facts = joinNonEmpty([
    kindLabel(detail.kind, detail.isAnime),
    detail.releaseInfo ?? detail.year,
    formatRuntime(detail.runtime),
    detail.status,
  ]);

  return (
    <header className="relative">
      <div className="relative aspect-16/10 max-h-[58svh] w-full overflow-hidden sm:aspect-16/9 md:max-h-[76svh]">
        <PosterImage
          src={backdropUrl(detail.backdrop)}
          alt={detail.title}
          sizes="100vw"
          priority
          wide
        />
        {/* Two scrims: one lifts the copy off the artwork, one keeps the top
            translucent bar legible. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/45 to-ink-950/70"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-ink-950 to-transparent"
        />
      </div>

      <div className="gutter-x relative -mt-24 md:-mt-40 lg:-mt-48">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-9">
          <div className="hidden w-48 shrink-0 md:block lg:w-56">
            <div className="relative aspect-2/3 w-full overflow-hidden rounded-2xl bg-ink-850 ring-1 ring-white/10 ring-inset shadow-[0_30px_60px_-30px_rgba(0,0,0,0.95)]">
              <PosterImage
                src={posterUrl(detail.poster, 'medium')}
                alt={detail.title}
                sizes="(min-width: 1024px) 224px, 192px"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 md:pb-2">
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={detail.kind} isAnime={detail.isAnime} />
              {rating ? (
                <span className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-mist-100 tabular-nums">
                  <StarIcon className="size-3.5 text-gold-400" />
                  {rating}
                  <span className="font-normal text-mist-500">/ 10</span>
                </span>
              ) : null}
            </div>

            <h1 className="text-cinema mt-3 text-[1.875rem] leading-[1.05] font-semibold text-white sm:text-[2.25rem] lg:text-[2.75rem]">
              {detail.title}
            </h1>

            {detail.originalTitle && detail.originalTitle !== detail.title ? (
              <p className="mt-1.5 text-sm text-mist-500">{detail.originalTitle}</p>
            ) : null}

            {facts ? <p className="mt-3 text-[0.8125rem] text-mist-400 md:text-sm">{facts}</p> : null}

            {detail.genres.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {detail.genres.slice(0, 6).map((genre) => {
                  const known = parseGenre(hub, genre);
                  return (
                    <li key={genre}>
                      {known ? (
                        <Link
                          href={browseHref(hub, { sort: 'popular', genre: known })}
                          className="tap inline-flex h-8 items-center rounded-full border border-(--glass-line) bg-white/4 px-3 text-[0.75rem] text-mist-300 transition-colors duration-200 md:hover:border-(--glass-line-strong) md:hover:text-white"
                        >
                          {genre}
                        </Link>
                      ) : (
                        <span className="inline-flex h-8 items-center rounded-full border border-(--glass-line) bg-white/4 px-3 text-[0.75rem] text-mist-400">
                          {genre}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-2.5">{actions}</div>
          </div>
        </div>

        {detail.overview ? (
          <p className="mt-7 max-w-3xl text-pretty text-sm leading-relaxed text-mist-300 md:text-[0.9375rem]">
            {detail.overview}
          </p>
        ) : null}
      </div>
    </header>
  );
}

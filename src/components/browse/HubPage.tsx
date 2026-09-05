import { Suspense } from 'react';
import type { Metadata } from 'next';
import { BrowseFilters } from '@/components/browse/BrowseFilters';
import { BrowseGrid } from '@/components/browse/BrowseGrid';
import { MediaRail } from '@/components/home/MediaRail';
import { PageHeading, PageShell } from '@/components/layout/Page';
import { GridSkeleton, RailSkeleton } from '@/components/ui/Skeleton';
import { browseHref, isDefaultView, type BrowseQuery, type HubConfig } from '@/lib/metadata/browse';

/** Params every hub route accepts. Filters live in the URL, never in state. */
export interface HubSearchParams {
  genre?: string;
  sort?: string;
  page?: string;
}

/**
 * Shared hub body. Unfiltered it reads as an editorial page of rails; filtered it
 * becomes a paged grid. Both views stream, so the heading and filters paint
 * before any catalogue call resolves.
 */
export function HubPage({ hub, query }: { hub: HubConfig; query: BrowseQuery }) {
  const filtered = !isDefaultView(query);

  return (
    <PageShell wide>
      <PageHeading eyebrow={hub.eyebrow} title={hub.title} description={hub.description}>
        <BrowseFilters hub={hub} query={query} />
      </PageHeading>

      {filtered ? (
        <Suspense key={`${query.sort}:${query.genre ?? 'all'}:${query.page}`} fallback={<GridLoading />}>
          <BrowseGrid hub={hub} query={query} />
        </Suspense>
      ) : (
        <div className="flex flex-col gap-9 md:gap-12">
          {hub.rails.map((rail, index) => (
            <Suspense key={rail.id} fallback={<RailSkeleton />}>
              <MediaRail rail={rail} priority={index === 0} />
            </Suspense>
          ))}
        </div>
      )}
    </PageShell>
  );
}

function GridLoading() {
  return (
    <div className="gutter-x">
      <GridSkeleton count={24} />
    </div>
  );
}

export function hubMetadata(hub: HubConfig, query: BrowseQuery): Metadata {
  const scope = query.genre ? `${query.genre} ${hub.title}` : hub.title;
  const sorted = query.sort === 'rating' ? ', highest rated first' : query.sort === 'new' ? ', newest first' : '';
  const page = query.page > 1 ? ` — page ${query.page}` : '';

  return {
    title: `${scope}${page}`,
    description: `Browse ${scope.toLowerCase()}${sorted} on Cineora. ${hub.description}`,
    alternates: { canonical: browseHref(hub, query) },
    // Deep pages are duplicative for search engines; the first page of each
    // genre carries the value.
    robots: query.page > 1 ? { index: false, follow: true } : undefined,
  };
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MediaCard, MediaGrid } from '@/components/media/MediaCard';
import { PageHeading, PageShell } from '@/components/layout/Page';
import { RefineSearchButton } from '@/components/search/RefineSearchButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { SearchIcon } from '@/components/ui/Icons';
import { metadata as metadataManager } from '@/lib/metadata/manager';
import type { MediaSummary } from '@/types/media';

const MIN_LENGTH = 2;

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = (await searchParams).q?.trim() ?? '';

  return {
    title: query ? `Search: ${query}` : 'Search',
    description: query
      ? `Movies, series and anime matching “${query}” on Cineora.`
      : 'Search movies, series and anime on Cineora.',
    // Result pages are per-visitor and infinite in number; the browse hubs are
    // the pages worth indexing.
    robots: { index: false, follow: true },
    alternates: { canonical: '/search' },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const query = ((await searchParams).q ?? '').trim().slice(0, 120);

  return (
    <PageShell>
      <PageHeading
        eyebrow="Search"
        title={query ? `Results for “${query}”` : 'Search'}
        description={
          query
            ? undefined
            : 'Find any movie, series or anime by title. Everything lives in one index.'
        }
      >
        <RefineSearchButton query={query} label={query ? 'Refine search' : 'Start searching'} />
      </PageHeading>

      {query.length < MIN_LENGTH ? (
        <div className="gutter-x">
          <EmptyState
            icon={<SearchIcon />}
            title={query.length === 0 ? 'What are you looking for?' : 'Keep typing'}
            description={
              query.length === 0
                ? 'Search by title — Cineora indexes movies, series and anime together.'
                : 'Search needs at least two characters to return useful matches.'
            }
          />
        </div>
      ) : (
        <Suspense key={query} fallback={<SearchLoading />}>
          <Results query={query} />
        </Suspense>
      )}
    </PageShell>
  );
}

function SearchLoading() {
  return (
    <div className="gutter-x">
      <GridSkeleton count={12} />
    </div>
  );
}

async function Results({ query }: { query: string }) {
  const { data, degraded } = await metadataManager.search({ query, limit: 90 });

  if (degraded) {
    return (
      <div className="gutter-x">
        <ErrorState kind="search" />
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <div className="gutter-x">
        <EmptyState
          icon={<SearchIcon />}
          title={`No matches for “${query}”`}
          description="Check the spelling, or try the original title — many anime and international films are listed under their native name."
          action={{ label: 'Browse popular titles', href: '/' }}
        />
      </div>
    );
  }

  const groups: Array<{ id: string; label: string; items: MediaSummary[] }> = [
    { id: 'movies', label: 'Movies', items: data.movies },
    { id: 'series', label: 'Series', items: data.tv },
    { id: 'anime', label: 'Anime', items: data.anime },
  ];

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      {groups.map((group, groupIndex) =>
        group.items.length === 0 ? null : (
          <section key={group.id} className="gutter-x" aria-labelledby={`search-${group.id}`}>
            <h2
              id={`search-${group.id}`}
              className="mb-4 flex items-baseline gap-2.5 font-display text-lg font-semibold text-white md:text-xl"
            >
              {group.label}
              <span className="text-[0.75rem] font-medium text-mist-500">{group.items.length}</span>
            </h2>
            <MediaGrid>
              {group.items.map((item, index) => (
                <MediaCard
                  key={item.id}
                  media={item}
                  showKind
                  priority={groupIndex === 0 && index < 6}
                />
              ))}
            </MediaGrid>
          </section>
        ),
      )}
    </div>
  );
}

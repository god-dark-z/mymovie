import { MediaCard, MediaGrid } from '@/components/media/MediaCard';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ChevronLeftIcon, ChevronRightIcon, FilmIcon } from '@/components/ui/Icons';
import { browseCatalog, browseHref, type BrowseQuery, type HubConfig } from '@/lib/metadata/browse';

/**
 * Filtered hub results.
 *
 * Paging is only offered when the next page has been confirmed to hold titles,
 * so "Next" never lands on an empty grid.
 */
export async function BrowseGrid({ hub, query }: { hub: HubConfig; query: BrowseQuery }) {
  const { items, degraded, hasMore } = await browseCatalog(hub, query);

  if (degraded) {
    return (
      <div className="gutter-x">
        <ErrorState kind="metadata" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="gutter-x">
        <EmptyState
          icon={<FilmIcon />}
          title={query.page > 1 ? 'Nothing further' : 'No titles here yet'}
          description={
            query.page > 1
              ? 'You have reached the end of this catalogue. Try another genre or sort order.'
              : `The catalogue has no ${query.genre ? `${query.genre.toLowerCase()} ` : ''}titles under this sort right now.`
          }
          action={{ label: `All ${hub.title.toLowerCase()}`, href: hub.path }}
        />
      </div>
    );
  }

  return (
    <div className="gutter-x">
      <MediaGrid>
        {items.map((item, index) => (
          <MediaCard
            key={item.id}
            media={item}
            showKind={hub.id === 'anime'}
            priority={query.page === 1 && index < 6}
          />
        ))}
      </MediaGrid>

      {query.page > 1 || hasMore ? (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
          {query.page > 1 ? (
            <ButtonLink href={browseHref(hub, { ...query, page: query.page - 1 })} variant="glass" size="sm">
              <ChevronLeftIcon className="size-4" />
              Previous
            </ButtonLink>
          ) : null}

          <span className="px-1 text-xs text-mist-500 tabular-nums">Page {query.page}</span>

          {hasMore ? (
            <ButtonLink href={browseHref(hub, { ...query, page: query.page + 1 })} variant="glass" size="sm">
              Next
              <ChevronRightIcon className="size-4" />
            </ButtonLink>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

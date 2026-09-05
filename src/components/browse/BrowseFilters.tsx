import { ChipLink, ChipRow } from '@/components/ui/Chip';
import { SORT_OPTIONS, browseHref, type BrowseQuery, type HubConfig } from '@/lib/metadata/browse';

/**
 * Hub filters. Every control is a link, so filtering works without client-side
 * JavaScript and each combination is a real, shareable URL.
 */
export function BrowseFilters({ hub, query }: { hub: HubConfig; query: BrowseQuery }) {
  return (
    <div className="flex flex-col gap-2.5">
      <ChipRow label="Sort titles">
        {SORT_OPTIONS.map((option) => (
          <ChipLink
            key={option.id}
            href={browseHref(hub, { sort: option.id, genre: query.genre })}
            active={query.sort === option.id}
            scroll={false}
          >
            {option.label}
          </ChipLink>
        ))}
      </ChipRow>

      <ChipRow label="Filter by genre">
        <ChipLink href={browseHref(hub, { sort: query.sort })} active={!query.genre} scroll={false}>
          All genres
        </ChipLink>
        {hub.genres.map((genre) => (
          <ChipLink
            key={genre}
            href={browseHref(hub, { sort: query.sort, genre })}
            active={query.genre === genre}
            scroll={false}
          >
            {genre}
          </ChipLink>
        ))}
      </ChipRow>
    </div>
  );
}

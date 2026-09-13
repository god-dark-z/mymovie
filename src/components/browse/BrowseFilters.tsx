'use client';

import { useState } from 'react';
import { Chip, ChipLink } from '@/components/ui/Chip';
import { CloseIcon, SlidersIcon } from '@/components/ui/Icons';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/utils/cn';

/**
 * Hub filters, rebuilt around restraint.
 *
 * Three sort chips and a single Genres control — that is the whole permanent
 * filter surface. The genre pills the old design stacked in rows now live in
 * one sheet (bottom sheet on a phone, centred dialog on desktop), which keeps
 * every filter reachable while the page reads as an editorial section rather
 * than a control room.
 *
 * Filtering itself is URL-based links, so each combination remains a real,
 * shareable address and the page works before hydration — the only state here
 * is whether the genre sheet is open.
 *
 * This is a client island, so it receives only serialisable props: the parent
 * server component passes the hub's path/title/genres and the sort list, never
 * the hub config itself (whose `catalogs` member is a function and cannot cross
 * the server→client boundary).
 */

export interface BrowseFilterProps {
  path: string;
  title: string;
  genres: readonly string[];
  sorts: ReadonlyArray<{ id: string; label: string }>;
  query: { sort: string; genre?: string };
}

/** Mirrors the server's URL rules: omit the default sort, page 1, and genre. */
function href(path: string, query: { sort: string; genre?: string }): string {
  const params = new URLSearchParams();
  if (query.genre) params.set('genre', query.genre);
  if (query.sort && query.sort !== 'popular') params.set('sort', query.sort);
  const search = params.toString();
  return `${path}${search ? `?${search}` : ''}`;
}

export function BrowseFilters({ path, title, genres, sorts, query }: BrowseFilterProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="group"
        aria-label={`${title} filters`}
        className="no-scrollbar mask-fade-r -mx-1 flex items-center gap-2 overflow-x-auto px-1 py-1"
      >
        {sorts.map((option) => (
          <ChipLink
            key={option.id}
            href={href(path, { sort: option.id, genre: query.genre })}
            active={query.sort === option.id}
            scroll={false}
          >
            {option.label}
          </ChipLink>
        ))}

        <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-white/12" />

        <Chip active={Boolean(query.genre)} onClick={() => setOpen(true)} aria-label="Filter by genre">
          <SlidersIcon className="size-3.5" />
          {query.genre ?? 'Genres'}
          <ChevronGlyph />
        </Chip>

        {query.genre ? (
          <ChipLink
            href={href(path, { sort: query.sort })}
            scroll={false}
            aria-label={`Clear the ${query.genre} filter`}
            className="text-mist-400"
          >
            <CloseIcon className="size-3" aria-hidden />
            Clear
          </ChipLink>
        ) : null}
      </div>

      <GenreSheet title={title} genres={genres} path={path} query={query} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function ChevronGlyph() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="size-2.5 opacity-70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2.5 4.5 3.5 3.5 3.5-3.5" />
    </svg>
  );
}

/** The genre picker. One pane, all genres, structured as a wrap grid — not a scroll row. */
function GenreSheet({
  title,
  genres,
  path,
  query,
  open,
  onClose,
}: {
  title: string;
  genres: readonly string[];
  path: string;
  query: { sort: string; genre?: string };
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Browse by genre"
      description={`Every genre the catalogue holds for ${title.toLowerCase()}.`}
      size="md"
    >
      <div className="flex flex-wrap gap-2 pb-1">
        <ChipLink
          href={href(path, { sort: query.sort })}
          active={!query.genre}
          scroll={false}
          onClick={onClose}
        >
          All genres
        </ChipLink>
        {genres.map((genre) => (
          <ChipLink
            key={genre}
            href={href(path, { sort: query.sort, genre })}
            active={query.genre === genre}
            scroll={false}
            onClick={onClose}
            className={cn(query.genre === genre && 'pr-2.5')}
          >
            {query.genre === genre ? <CloseIcon className="size-3" aria-hidden /> : null}
            {genre}
          </ChipLink>
        ))}
      </div>

      <p className="mt-4 border-t border-(--glass-line) pt-4 text-xs leading-relaxed text-mist-500">
        Sort and genre combine — pick a genre, then use the sort chips behind this panel to
        re-order it.
      </p>
    </Sheet>
  );
}

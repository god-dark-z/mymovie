'use client';

import { useSearch } from '@/components/search/SearchProvider';
import { Button } from '@/components/ui/Button';
import { SearchIcon } from '@/components/ui/Icons';

/**
 * Opens the overlay with the current query already typed, so refining a search
 * from the results page does not mean starting over.
 */
export function RefineSearchButton({ query, label = 'Refine search' }: { query: string; label?: string }) {
  const { open } = useSearch();

  return (
    <Button variant="glass" size="sm" onClick={() => open(query)}>
      <SearchIcon className="size-4" />
      {label}
    </Button>
  );
}

'use client';

import { useCallback, useMemo } from 'react';
import { usePersistentStore } from '@/hooks/usePersistentStore';
import {
  isInWatchlist,
  removeFromWatchlist,
  toggleWatchlist,
  watchlistStore,
  type WatchlistEntry,
} from '@/lib/storage';
import type { MediaSummary } from '@/types/media';

export function useWatchlist(): {
  entries: WatchlistEntry[];
  has: (id: string) => boolean;
  toggle: (media: MediaSummary) => boolean;
  remove: (id: string) => void;
} {
  const entries = usePersistentStore(watchlistStore);

  const has = useCallback((id: string) => isInWatchlist(entries, id), [entries]);
  const toggle = useCallback((media: MediaSummary) => toggleWatchlist(media), []);
  const remove = useCallback((id: string) => removeFromWatchlist(id), []);

  return useMemo(() => ({ entries, has, toggle, remove }), [entries, has, toggle, remove]);
}

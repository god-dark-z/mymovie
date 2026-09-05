'use client';

import { useCallback, useMemo } from 'react';
import { usePersistentStore } from '@/hooks/usePersistentStore';
import {
  clearRecentSearches,
  forgetSearch,
  recentSearchesStore,
  rememberSearch,
} from '@/lib/storage';

export function useRecentSearches(): {
  queries: string[];
  remember: (query: string) => void;
  forget: (query: string) => void;
  clear: () => void;
} {
  const queries = usePersistentStore(recentSearchesStore);

  const remember = useCallback((query: string) => rememberSearch(query), []);
  const forget = useCallback((query: string) => forgetSearch(query), []);
  const clear = useCallback(() => clearRecentSearches(), []);

  return useMemo(() => ({ queries, remember, forget, clear }), [queries, remember, forget, clear]);
}

'use client';

import { useCallback, useMemo } from 'react';
import { usePersistentStore } from '@/hooks/usePersistentStore';
import {
  clearHistory,
  findHistoryEntry,
  historyStore,
  removeFromHistory,
  type WatchHistoryEntry,
} from '@/lib/storage';

export function useWatchHistory(): {
  entries: WatchHistoryEntry[];
  find: (id: string) => WatchHistoryEntry | null;
  remove: (id: string) => void;
  clear: () => void;
} {
  const entries = usePersistentStore(historyStore);

  const find = useCallback((id: string) => findHistoryEntry(entries, id), [entries]);
  const remove = useCallback((id: string) => removeFromHistory(id), []);
  const clear = useCallback(() => clearHistory(), []);

  return useMemo(() => ({ entries, find, remove, clear }), [entries, find, remove, clear]);
}

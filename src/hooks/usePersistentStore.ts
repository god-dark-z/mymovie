'use client';

import { useSyncExternalStore } from 'react';
import type { PersistentStore } from '@/lib/storage/store';

/**
 * Subscribes a component to a persistent store.
 *
 * The server snapshot is the store's fallback, so the first client render matches
 * the server output and hydration stays clean; the real value arrives in the
 * effect-driven update immediately after.
 */
export function usePersistentStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServerSnapshot);
}

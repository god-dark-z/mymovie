'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { SearchResults } from '@/types/media';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'error';

const EMPTY: SearchResults = { query: '', movies: [], tv: [], anime: [], total: 0 };
const MIN_LENGTH = 2;

export interface SearchState {
  status: SearchStatus;
  results: SearchResults;
  /** True when a provider answered but with no usable data. */
  degraded: boolean;
  /** The query the current results belong to. */
  settledQuery: string;
}

/**
 * Debounced search against our own route handler, which does the provider work
 * server-side (cached, deduped) and returns the normalized shape.
 *
 * In-flight requests are aborted when the query changes, so results can never
 * arrive out of order.
 */
export function useSearchQuery(query: string, options: { enabled?: boolean } = {}): SearchState {
  const { enabled = true } = options;
  const debounced = useDebouncedValue(query.trim(), 240);
  const [state, setState] = useState<SearchState>({
    status: 'idle',
    results: EMPTY,
    degraded: false,
    settledQuery: '',
  });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    controllerRef.current?.abort();

    if (debounced.length < MIN_LENGTH) {
      setState({ status: 'idle', results: EMPTY, degraded: false, settledQuery: '' });
      return;
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    setState((current) => ({ ...current, status: 'loading' }));

    void (async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`search failed: ${response.status}`);
        const payload = (await response.json()) as { results: SearchResults; degraded: boolean };
        setState({
          status: 'ready',
          results: payload.results ?? EMPTY,
          degraded: Boolean(payload.degraded),
          settledQuery: debounced,
        });
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: 'error', results: EMPTY, degraded: false, settledQuery: debounced });
      }
    })();

    return () => controller.abort();
  }, [debounced, enabled]);

  return state;
}

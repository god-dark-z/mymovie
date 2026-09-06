import { asArray, asString, createStore } from '@/lib/storage/store';
import { recordingAllowed } from '@/lib/storage/privacy';

/** Recent search queries, newest first. */
const MAX_ENTRIES = 12;

export const recentSearchesStore = createStore<string[]>({
  name: 'recent-searches',
  version: 1,
  fallback: [],
  parse: (value) => {
    const list = asArray(value);
    if (!list) return null;
    return list
      .map((item) => asString(item))
      .filter((item): item is string => Boolean(item))
      .slice(0, MAX_ENTRIES);
  },
});

export function rememberSearch(query: string): void {
  if (!recordingAllowed('searchHistory')) return;
  const clean = query.trim();
  if (clean.length < 2) return;
  recentSearchesStore.update((current) => {
    const withoutDuplicate = current.filter((item) => item.toLowerCase() !== clean.toLowerCase());
    return [clean, ...withoutDuplicate].slice(0, MAX_ENTRIES);
  });
}

export function forgetSearch(query: string): void {
  recentSearchesStore.update((current) => current.filter((item) => item !== query));
}

export function clearRecentSearches(): void {
  recentSearchesStore.clear();
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SearchResultRow } from '@/components/search/SearchResultRow';
import { ArrowLeftIcon, CloseIcon, ClockIcon, SearchIcon, SparkIcon, TrashIcon } from '@/components/ui/Icons';
import { SearchResultsSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useMounted } from '@/hooks/useMounted';
import { useRecentSearches } from '@/hooks/useRecentSearches';
import { useSearchQuery } from '@/hooks/useSearchQuery';
import { detailHref } from '@/lib/metadata/classify';
import { cn } from '@/lib/utils/cn';
import { wrapTabFocus } from '@/lib/utils/focus';
import type { MediaSummary } from '@/types/media';

interface Suggestion {
  title: string;
  href: string;
}

/** Cached for the session so reopening search does not refetch suggestions. */
let suggestionCache: Suggestion[] | null = null;

/**
 * Search surface: full screen on phones, a centred palette on desktop.
 *
 * One implementation for both so behaviour cannot drift — the difference is CSS.
 * Results stream in from `/api/search` as the user types, with arrow-key
 * navigation over the flattened result list.
 */
export function SearchOverlay({ open, seed = '', onClose }: { open: boolean; seed?: string; onClose: () => void }) {
  const mounted = useMounted();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(suggestionCache ?? []);
  const { queries: recent, remember, forget, clear } = useRecentSearches();
  const { status, results, degraded, settledQuery } = useSearchQuery(query, { enabled: open });

  useBodyScrollLock(open);

  const flat = useMemo<MediaSummary[]>(
    () => [...results.movies, ...results.tv, ...results.anime],
    [results],
  );

  useEffect(() => {
    setActive(-1);
    rowRefs.current = [];
  }, [settledQuery, status]);

  useEffect(() => {
    if (!open) return;
    if (seed) setQuery(seed);
    const timer = setTimeout(() => {
      const node = input.current;
      node?.focus({ preventScroll: true });
      // Caret at the end, so a seeded query can be extended rather than replaced.
      if (node && seed) node.setSelectionRange(seed.length, seed.length);
    }, 60);
    return () => clearTimeout(timer);
  }, [open, seed]);

  useEffect(() => {
    if (!open || suggestionCache) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/suggestions');
        if (!response.ok) return;
        const payload = (await response.json()) as { titles?: Suggestion[] };
        if (cancelled || !payload.titles?.length) return;
        suggestionCache = payload.titles;
        setSuggestions(payload.titles);
      } catch {
        // Suggestions are a nicety; silence is the right failure mode here.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const close = useCallback(() => {
    onClose();
    setQuery('');
    setActive(-1);
  }, [onClose]);

  /** For `<Link>` selections: Link owns the navigation, we just record and close. */
  const finish = useCallback(
    (term: string) => {
      remember(term);
      close();
    },
    [close, remember],
  );

  /** For non-link selections (Enter key, suggestion chips). */
  const commit = useCallback(
    (target: string, term: string) => {
      remember(term);
      close();
      router.push(target);
    },
    [close, remember, router],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    // `aria-modal` is a promise that nothing behind the overlay is reachable, so
    // Tab has to wrap inside it.
    if (event.key === 'Tab') {
      wrapTabFocus(event, panel.current);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (flat.length === 0) return;
      event.preventDefault();
      const next =
        event.key === 'ArrowDown'
          ? Math.min(flat.length - 1, active + 1)
          : Math.max(-1, active - 1);
      setActive(next);
      if (next >= 0) rowRefs.current[next]?.scrollIntoView({ block: 'nearest' });
      else listRef.current?.scrollTo({ top: 0 });
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const picked = active >= 0 ? flat[active] : undefined;
      const term = query.trim();
      if (picked) commit(detailHref(picked.kind, picked.id), term || picked.title);
      else if (term.length >= 2) commit(`/search?q=${encodeURIComponent(term)}`, term);
    }
  };

  if (!mounted || !open) return null;

  const showIdle = status === 'idle' || query.trim().length < 2;
  const hasResults = flat.length > 0;
  const term = settledQuery || query.trim();

  // The result list updates without any change of focus, which is silent for
  // anyone who is not looking at it. This says what the screen now shows.
  const announcement = showIdle
    ? ''
    : status === 'error'
      ? 'Search is unavailable.'
      : status === 'loading' && !hasResults
        ? 'Searching…'
        : hasResults
          ? `${flat.length} ${flat.length === 1 ? 'result' : 'results'} for ${term}`
          : `No matches for ${term}`;

  return createPortal(
    <div className="fixed inset-0 z-90 flex flex-col md:items-center md:justify-start md:pt-[12vh]">
      {/* The scrim's blur is `md`-only: on a handset the panel below covers the
          whole viewport, so blurring the scrim there is work nobody ever sees. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        aria-label="Close search"
        onClick={close}
        className="absolute inset-0 animate-fade-in cursor-default bg-ink-950/80 md:backdrop-blur-[3px]"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Search Cineora"
        onKeyDown={onKeyDown}
        className={cn(
          // Below `md` this panel *is* the screen, so it is nearly opaque and the
          // blur only softens the edge it does not cover. From `md` it becomes a
          // floating pane, where the short radius lets the page stay readable
          // behind it instead of frosting it away.
          'relative flex h-app w-full flex-col bg-ink-950/88 backdrop-blur-sm',
          'md:h-auto md:max-h-[72vh] md:w-[min(42rem,92vw)] md:animate-pop-in md:rounded-3xl',
          'md:border md:border-(--glass-line-strong) md:bg-ink-900/68 md:shadow-[0_40px_120px_-40px_rgba(0,0,0,0.95)]',
        )}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-(--glass-line) px-2 pt-safe-t pb-2 md:px-3 md:pt-2">
          <button
            type="button"
            onClick={close}
            aria-label="Close search"
            className="tap flex size-11 shrink-0 items-center justify-center rounded-full text-mist-300 transition-colors duration-200 hover:bg-white/8 hover:text-white md:hidden"
          >
            <ArrowLeftIcon className="size-5" />
          </button>

          <SearchIcon className="ml-2 hidden size-4.5 shrink-0 text-mist-500 md:block" />

          <input
            ref={input}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search movies, series and anime"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Search movies, series and anime"
            className="h-12 min-w-0 flex-1 bg-transparent px-1 text-[0.9375rem] text-white outline-none placeholder:text-mist-500 md:h-12"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                input.current?.focus();
              }}
              aria-label="Clear search"
              className="tap flex size-11 shrink-0 items-center justify-center rounded-full text-mist-400 transition-colors duration-200 hover:bg-white/8 hover:text-white md:size-9"
            >
              <CloseIcon className="size-4" />
            </button>
          ) : null}

          <kbd className="mr-1 hidden shrink-0 rounded-md border border-(--glass-line) px-1.5 py-0.5 text-[0.625rem] font-medium tracking-wide text-mist-500 md:block">
            ESC
          </kbd>
        </div>

        <p aria-live="polite" role="status" className="sr-only">
          {announcement}
        </p>

        <div
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] md:px-3 md:pb-3"
        >
          {showIdle ? (
            <IdlePanel
              recent={recent}
              suggestions={suggestions}
              onPick={(term) => {
                setQuery(term);
                input.current?.focus();
              }}
              onForget={forget}
              onClear={clear}
              onNavigate={(href, term) => commit(href, term)}
            />
          ) : status === 'loading' && !hasResults ? (
            <div className="px-2 pt-4">
              <SearchResultsSkeleton />
            </div>
          ) : status === 'error' ? (
            <ErrorState kind="search" compact />
          ) : hasResults ? (
            <ResultGroups
              results={results}
              flat={flat}
              active={active}
              query={query}
              onSelect={finish}
              registerRow={(index, node) => {
                rowRefs.current[index] = node;
              }}
            />
          ) : degraded ? (
            <ErrorState kind="search" compact />
          ) : (
            <EmptyState
              compact
              icon={<SearchIcon />}
              title={`No matches for “${term}”`}
              description="Check the spelling, or try the original title — many anime and international films are listed under their native name."
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-2 pt-4 pb-1.5 font-display text-[0.6875rem] font-semibold tracking-[0.16em] text-mist-500 uppercase">
      {children}
    </h2>
  );
}

function ResultGroups({
  results,
  flat,
  active,
  query,
  onSelect,
  registerRow,
}: {
  results: { movies: MediaSummary[]; tv: MediaSummary[]; anime: MediaSummary[] };
  flat: MediaSummary[];
  active: number;
  query: string;
  onSelect: (term: string) => void;
  registerRow: (index: number, node: HTMLAnchorElement | null) => void;
}) {
  const groups: Array<{ label: string; items: MediaSummary[] }> = [
    { label: 'Movies', items: results.movies },
    { label: 'Series', items: results.tv },
    { label: 'Anime', items: results.anime },
  ];

  return (
    <div className="pb-2">
      {groups.map((group) =>
        group.items.length === 0 ? null : (
          <section key={group.label}>
            <GroupLabel>{group.label}</GroupLabel>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const index = flat.indexOf(item);
                return (
                  <SearchResultRow
                    key={`${group.label}-${item.id}`}
                    media={item}
                    active={index === active}
                    innerRef={(node) => registerRow(index, node)}
                    onSelect={() => onSelect(query.trim() || item.title)}
                  />
                );
              })}
            </div>
          </section>
        ),
      )}

      <div className="px-2 pt-4 pb-1">
        <Link
          href={`/search?q=${encodeURIComponent(query.trim())}`}
          onClick={() => onSelect(query.trim())}
          className="tap flex h-11 items-center justify-center rounded-xl border border-(--glass-line) text-[0.8125rem] font-medium text-mist-300 transition-colors duration-200 hover:border-(--glass-line-strong) hover:text-white"
        >
          See all results
        </Link>
      </div>
    </div>
  );
}

function IdlePanel({
  recent,
  suggestions,
  onPick,
  onForget,
  onClear,
  onNavigate,
}: {
  recent: string[];
  suggestions: Suggestion[];
  onPick: (term: string) => void;
  onForget: (term: string) => void;
  onClear: () => void;
  onNavigate: (href: string, term: string) => void;
}) {
  return (
    <div className="pb-4">
      {recent.length > 0 ? (
        <section>
          <div className="flex items-center justify-between pt-4 pr-1 pb-1.5 pl-2">
            <h2 className="font-display text-[0.6875rem] font-semibold tracking-[0.16em] text-mist-500 uppercase">
              Recent
            </h2>
            <button
              type="button"
              onClick={onClear}
              className="tap flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.6875rem] font-medium text-mist-500 transition-colors duration-200 hover:text-white"
            >
              <TrashIcon className="size-3.5" />
              Clear
            </button>
          </div>
          <ul className="flex flex-col gap-0.5">
            {recent.map((term) => (
              <li key={term} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onPick(term)}
                  className="tap flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 text-left text-sm text-mist-200 transition-colors duration-150 hover:bg-white/6 hover:text-white"
                >
                  <ClockIcon className="size-4 shrink-0 text-mist-500" />
                  <span className="truncate">{term}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onForget(term)}
                  aria-label={`Remove ${term} from recent searches`}
                  className="tap flex size-9 shrink-0 items-center justify-center rounded-full text-mist-500 transition-colors duration-200 hover:bg-white/8 hover:text-white"
                >
                  <CloseIcon className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {suggestions.length > 0 ? (
        <section>
          <h2 className="px-2 pt-4 pb-2 font-display text-[0.6875rem] font-semibold tracking-[0.16em] text-mist-500 uppercase">
            Trending now
          </h2>
          <div className="flex flex-wrap gap-2 px-1">
            {suggestions.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => onNavigate(item.href, item.title)}
                className="tap inline-flex h-10 items-center gap-1.5 rounded-full border border-(--glass-line) bg-white/4 px-3.5 text-[0.8125rem] text-mist-200 transition-colors duration-200 hover:border-(--glass-line-strong) hover:text-white"
              >
                <SparkIcon className="size-3.5 text-ruby-400" />
                {item.title}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {recent.length === 0 && suggestions.length === 0 ? (
        <EmptyState
          compact
          icon={<SearchIcon />}
          title="Find something to watch"
          description="Search by title. Movies, series and anime all live in the same index."
        />
      ) : null}
    </div>
  );
}

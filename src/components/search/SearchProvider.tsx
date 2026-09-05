'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SearchOverlay } from '@/components/search/SearchOverlay';

interface SearchApi {
  isOpen: boolean;
  /** `seed` pre-fills the field — used by the /search page's refine button. */
  open: (seed?: string) => void;
  close: () => void;
}

const SearchContext = createContext<SearchApi | null>(null);

/**
 * Owns the single search overlay instance so the header, the bottom navigation
 * and any in-page entry point all drive the same surface.
 */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [seed, setSeed] = useState('');

  const open = useCallback((next?: string) => {
    // Guarded because `onClick={open}` would otherwise pass a MouseEvent.
    setSeed(typeof next === 'string' ? next : '');
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  // ⌘K / Ctrl-K / "/" open search, unless the user is already typing.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;
      const shortcut = (event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !event.metaKey);
      if (!shortcut) return;
      event.preventDefault();
      setSeed('');
      setIsOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const api = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close]);

  return (
    <SearchContext.Provider value={api}>
      {children}
      <SearchOverlay open={isOpen} seed={seed} onClose={close} />
    </SearchContext.Provider>
  );
}

export function useSearch(): SearchApi {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearch must be used inside <SearchProvider>');
  return context;
}

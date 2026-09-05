'use client';

import { useEffect, useState } from 'react';

/**
 * Reads a CSS media query without causing a hydration mismatch: the first render
 * always returns `false`, the real value lands in the effect.
 *
 * Layout itself is CSS-driven; this is only for behaviour that genuinely differs
 * (rendering a bottom sheet instead of a centered dialog, for example).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    setMatches(list.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Matches the Tailwind `md` breakpoint used across the app shell. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}

/** True when the viewer asked the OS to reduce motion. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** Coarse pointer, i.e. touch-first — no hover affordances. */
export function useIsTouch(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}

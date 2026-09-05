'use client';

import { useEffect } from 'react';

let lockCount = 0;
let restore: (() => void) | null = null;

/**
 * Locks background scrolling while an overlay is open.
 *
 * Uses `position: fixed` on the body with the current offset preserved, which is
 * the only approach that reliably stops scroll chaining in an Android WebView
 * (`overflow: hidden` alone does not). Nested overlays are reference-counted so
 * closing a sheet opened over a modal does not unlock the page early.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;

    lockCount += 1;
    if (lockCount === 1) {
      const { body } = document;
      const scrollY = window.scrollY;
      const previous = {
        position: body.style.position,
        top: body.style.top,
        width: body.style.width,
        overflowY: body.style.overflowY,
      };

      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflowY = 'scroll';

      restore = () => {
        body.style.position = previous.position;
        body.style.top = previous.top;
        body.style.width = previous.width;
        body.style.overflowY = previous.overflowY;
        window.scrollTo(0, scrollY);
      };
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0 && restore) {
        restore();
        restore = null;
      }
    };
  }, [active]);
}

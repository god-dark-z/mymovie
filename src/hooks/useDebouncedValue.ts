'use client';

import { useEffect, useState } from 'react';

/**
 * Debounces a rapidly changing value. Used by search so keystrokes do not each
 * become a network request.
 */
export function useDebouncedValue<T>(value: T, delayMs = 260): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

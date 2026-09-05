'use client';

import { useEffect, useState } from 'react';

/**
 * True only after the first client render. Use it to gate UI that depends on
 * `localStorage` so the server and client agree on the initial markup.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

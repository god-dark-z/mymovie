'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks connectivity using the only reliable browser signal we have.
 *
 * `navigator.onLine` is trustworthy for "the device has no network at all"; it
 * cannot tell us a provider is down. It is used purely to explain a failure the
 * user can act on, never to claim a stream is unavailable.
 */
export function useNetworkStatus(): { online: boolean } {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return { online };
}

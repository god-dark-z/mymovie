import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

/**
 * Installable-app manifest. `standalone` plus the maskable icons is what makes
 * the PWA (and the future Android WebView wrapper) launch without browser chrome.
 *
 * Nothing here caches media: the service-worker-free setup means the app shell is
 * served by the CDN and playback always streams live from the provider.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: SITE.themeColor,
    theme_color: SITE.themeColor,
    categories: ['entertainment', 'movies', 'video'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Search', url: '/search', description: 'Find a movie, series or anime' },
      { name: 'My List', url: '/my-list', description: 'Titles you saved' },
    ],
  };
}

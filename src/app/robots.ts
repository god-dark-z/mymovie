import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

/**
 * Crawlers get the browsing surfaces and every title page.
 *
 * Everything disallowed here is either per-visitor (search results, the local
 * library) or an embed shell whose content belongs to the playback provider rather
 * than to Cineora.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/search', '/my-list', '/watch/'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}

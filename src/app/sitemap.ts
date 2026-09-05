import type { MetadataRoute } from 'next';
import { metadata as metadataManager } from '@/lib/metadata/manager';
import { detailHref } from '@/lib/metadata/classify';
import { absoluteUrl } from '@/lib/site';

/**
 * Sitemap: the browsing surfaces, plus the most popular titles in each namespace.
 *
 * Per-visitor pages (search results, My List) and watch routes are left out on
 * purpose — the detail page is the canonical, indexable page for a title, and it
 * is the one that carries the structured data.
 *
 * The catalogue lookup is best-effort. If the provider is unreachable the sitemap
 * still ships with its static routes rather than failing the build.
 */
export const revalidate = 86_400;

const TITLES_PER_NAMESPACE = 100;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const routes: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/movies'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/series'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: absoluteUrl('/anime'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ];

  const titles = await popularTitles();

  for (const url of titles) {
    routes.push({ url, lastModified: now, changeFrequency: 'weekly', priority: 0.6 });
  }

  return routes;
}

async function popularTitles(): Promise<string[]> {
  const requests = [
    metadataManager.getCatalog({
      namespace: 'movie',
      sort: 'popular',
      excludeAnime: true,
      limit: TITLES_PER_NAMESPACE,
    }),
    metadataManager.getCatalog({
      namespace: 'series',
      sort: 'popular',
      excludeAnime: true,
      limit: TITLES_PER_NAMESPACE,
    }),
    metadataManager.getCatalog({
      namespace: 'series',
      sort: 'popular',
      animeOnly: true,
      limit: TITLES_PER_NAMESPACE,
    }),
  ];

  const settled = await Promise.allSettled(requests);
  const seen = new Set<string>();

  for (const outcome of settled) {
    if (outcome.status !== 'fulfilled') continue;
    for (const item of outcome.value.data) {
      seen.add(absoluteUrl(detailHref(item.kind, item.id)));
    }
  }

  return [...seen];
}

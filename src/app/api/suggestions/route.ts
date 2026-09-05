import { NextResponse } from 'next/server';
import { metadata } from '@/lib/metadata/manager';
import { detailHref } from '@/lib/metadata/classify';

/**
 * Suggestions shown in the search overlay before the user types.
 *
 * These are real trending titles from the metadata catalog, not a hand-written
 * "popular searches" list — the label in the UI says what they actually are.
 */
export const revalidate = 3600;

export async function GET() {
  const [movies, series] = await Promise.all([
    metadata.getCatalog({ namespace: 'movie', sort: 'popular', excludeAnime: true, limit: 6 }),
    metadata.getCatalog({ namespace: 'series', sort: 'popular', limit: 6 }),
  ]);

  // Interleave so the list is not six films followed by six shows.
  const merged: Array<{ title: string; href: string }> = [];
  for (let index = 0; index < 6; index += 1) {
    for (const group of [movies.data, series.data]) {
      const item = group[index];
      if (item) merged.push({ title: item.title, href: detailHref(item.kind, item.id) });
    }
  }

  return NextResponse.json(
    { titles: merged.slice(0, 8), degraded: movies.degraded && series.degraded },
    { headers: { 'Cache-Control': 'public, max-age=600, s-maxage=3600' } },
  );
}

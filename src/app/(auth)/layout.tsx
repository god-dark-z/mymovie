import type { Metadata } from 'next';
import { AuthAtmosphere } from '@/components/account/AuthAtmosphere';
import { backdropUrl } from '@/lib/metadata/images';
import { metadata as metadataManager } from '@/lib/metadata/manager';

/**
 * The account entry screens.
 *
 * They deliberately do not use the `(app)` shell: the floating navigation and its
 * search field are a distraction from a single-purpose form, and on a handset the
 * bottom bar competes with the keyboard for the same 60px. `AuthShell` supplies
 * the frame instead.
 *
 * The atmosphere lives here rather than in the pages, which is what makes the
 * login↔sign-up move feel like one environment changing its mind: the blurred
 * artwork, the light blooms and the pointer pool persist across the client
 * navigation while only the panel and its copy swap.
 *
 * The artwork is the site's own — a handful of trending backdrops, fetched from
 * the same catalogue the home hero uses. A degraded catalogue reads as the
 * gradient-only ambience, which is the correct fallback and costs nothing.
 *
 * Nothing here should be indexed — these pages have no content of their own and a
 * search result pointing at a password reset form is only ever noise.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const [movies, series] = await Promise.all([
    metadataManager.getCatalog({ namespace: 'movie', sort: 'popular', excludeAnime: true, limit: 10 }),
    metadataManager.getCatalog({ namespace: 'series', sort: 'popular', excludeAnime: true, limit: 10 }),
  ]);

  const pool = [...movies.data, ...series.data].filter((item) => Boolean(item.backdrop));
  // Alternate sources so the three frames are not three posters from one list.
  const backdrops: string[] = [];
  for (let index = 0; index < pool.length && backdrops.length < 3; index += 4) {
    const url = backdropUrl(pool[index]?.backdrop);
    if (url) backdrops.push(url);
  }

  return (
    <>
      <AuthAtmosphere backdrops={backdrops} />
      {children}
    </>
  );
}

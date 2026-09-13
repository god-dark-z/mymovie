import { AuthAtmosphere } from '@/components/account/AuthAtmosphere';
import { backdropUrl } from '@/lib/metadata/images';
import { metadata as metadataManager } from '@/lib/metadata/manager';

/**
 * The Account Hub shares the authentication pages' cinematic environment: the
 * same blurred trending artwork, light blooms and film grain, fetched here once
 * for every account route. Content readability still wins — the layers are
 * fixed, dimmed and sit behind everything.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const [movies, series] = await Promise.all([
    metadataManager.getCatalog({ namespace: 'movie', sort: 'popular', excludeAnime: true, limit: 10 }),
    metadataManager.getCatalog({ namespace: 'series', sort: 'popular', excludeAnime: true, limit: 10 }),
  ]);

  const pool = [...movies.data, ...series.data].filter((item) => Boolean(item.backdrop));
  const backdrops: string[] = [];
  for (let index = 0; index < pool.length && backdrops.length < 3; index += 5) {
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

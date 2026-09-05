import type { Metadata } from 'next';
import { WatchScreen } from '@/components/player/WatchScreen';
import { loadWatch, watchMetadata } from '@/lib/playback/watch-route';

/**
 * `/watch/anime/{id}/{season}/{episode}`, with `/watch/anime/{id}/{n}` accepted as
 * an absolute episode number.
 *
 * Nxsha publishes no anime endpoint — `/embed/anime/...` is not in the current
 * documentation and 404s — so anime plays through the documented series endpoint,
 * which is what its own catalogue uses for these titles. The catch-all exists only
 * to accept the shorter absolute-number links people share; `loadWatch` resolves
 * them against the real episode list and redirects to the canonical
 * season/episode URL rather than assuming season 1.
 */
export const revalidate = 3600;

type Params = { params: Promise<{ id: string; episode?: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id, episode } = await params;
  return watchMetadata(await loadWatch('anime', id, episode ?? []));
}

export default async function WatchAnimePage({ params }: Params) {
  const { id, episode } = await params;
  const context = await loadWatch('anime', id, episode ?? []);
  return <WatchScreen {...context} />;
}

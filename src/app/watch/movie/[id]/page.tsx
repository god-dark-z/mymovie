import type { Metadata } from 'next';
import { WatchScreen } from '@/components/player/WatchScreen';
import { loadWatch, watchMetadata } from '@/lib/playback/watch-route';

/**
 * `/watch/movie/{id}` — the documented movie embed.
 *
 * Resolution, canonical redirects and SEO all live in `loadWatch` / `watchMetadata`
 * so every watch route behaves identically.
 */
export const revalidate = 3600;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return watchMetadata(await loadWatch('movie', id));
}

export default async function WatchMoviePage({ params }: Params) {
  const { id } = await params;
  const context = await loadWatch('movie', id);
  return <WatchScreen {...context} />;
}

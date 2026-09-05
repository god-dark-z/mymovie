import type { Metadata } from 'next';
import { WatchScreen } from '@/components/player/WatchScreen';
import { loadWatch, watchMetadata } from '@/lib/playback/watch-route';

/**
 * `/watch/tv/{id}/{season}/{episode}` — the documented episodic embed shape.
 *
 * Both numbers are always present in the URL because the endpoint requires both.
 * `loadWatch` validates them against the provider's real episode list and
 * redirects anything it cannot address.
 */
export const revalidate = 3600;

type Params = { params: Promise<{ id: string; season: string; episode: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id, season, episode } = await params;
  return watchMetadata(await loadWatch('tv', id, [season, episode]));
}

export default async function WatchEpisodePage({ params }: Params) {
  const { id, season, episode } = await params;
  const context = await loadWatch('tv', id, [season, episode]);
  return <WatchScreen {...context} />;
}

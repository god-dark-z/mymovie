import { MediaCard, RailCard } from '@/components/media/MediaCard';
import { Rail } from '@/components/ui/Rail';
import { metadata } from '@/lib/metadata/manager';
import { railHref, type RailDefinition } from '@/lib/metadata/rails';

/**
 * One catalog rail, fetched on the server.
 *
 * Each rail is its own async component so the page can stream: the hero paints
 * immediately and rails fill in as the provider answers, instead of the whole
 * route waiting on the slowest request.
 *
 * A rail that comes back empty renders nothing at all. An empty shelf with a
 * heading looks broken, and a genre the provider has no data for is not news.
 */
export async function MediaRail({
  rail,
  priority = false,
}: {
  rail: RailDefinition;
  /** Eager-loads the first few posters — only for the topmost rail. */
  priority?: boolean;
}) {
  const { data } = await metadata.getCatalog(rail.request);
  if (data.length === 0) return null;

  return (
    <Rail title={rail.title} subtitle={rail.subtitle} href={railHref(rail.request)}>
      {data.map((item, index) => (
        <RailCard key={item.id}>
          <MediaCard media={item} priority={priority && index < 5} />
        </RailCard>
      ))}
    </Rail>
  );
}

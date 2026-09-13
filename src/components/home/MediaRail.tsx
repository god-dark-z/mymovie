import { MediaCard, RailCard } from '@/components/media/MediaCard';
import { Rail } from '@/components/ui/Rail';
import { metadata } from '@/lib/metadata/manager';
import { railHref, type RailDefinition } from '@/lib/metadata/rails';
import { rotatePeriodic } from '@/lib/utils/rotate';

/**
 * One catalog rail, fetched on the server.
 *
 * Each rail is its own async component so the page can stream: the hero paints
 * immediately and rails fill in as the provider answers, instead of the whole
 * route waiting on the slowest request.
 *
 * The rail's ordering steps by one every 90 minutes (`rotatePeriodic`), so the
 * page keeps breathing over days without extra catalogue requests or
 * randomness. A rail that comes back empty renders nothing at all. An empty
 * shelf with a heading looks broken, and a genre the provider has no data for
 * is not news.
 */
export async function MediaRail({
  rail,
  priority = false,
  numbered = false,
}: {
  rail: RailDefinition;
  /** Eager-loads the first few posters — only for the topmost rail. */
  priority?: boolean;
  /** Renders the rail as an ordered chart: rank numerals on the artwork, titles
      only beneath. Used for a hub's lead rail, where the ordering *is* the point. */
  numbered?: boolean;
}) {
  const { data } = await metadata.getCatalog(rail.request);
  if (data.length === 0) return null;

  const items = rotatePeriodic(data);

  return (
    <Rail title={rail.title} subtitle={rail.subtitle} href={railHref(rail.request)}>
      {items.map((item, index) => (
        <RailCard key={item.id}>
          <MediaCard
            media={item}
            priority={priority && index < 5}
            rank={numbered ? index + 1 : undefined}
          />
        </RailCard>
      ))}
    </Rail>
  );
}

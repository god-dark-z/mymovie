import { HubSkeleton } from '@/components/ui/Skeleton';

/** Search has no genre chips, so the heading sits straight above the grid. */
export default function SearchLoading() {
  return <HubSkeleton chips={0} count={12} />;
}

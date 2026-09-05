import { PlayerSkeleton } from '@/components/ui/Skeleton';

/**
 * Covers every watch route. The stage is reserved at its final size so the embed
 * does not push the control row around when it mounts.
 */
export default function WatchLoading() {
  return <PlayerSkeleton />;
}

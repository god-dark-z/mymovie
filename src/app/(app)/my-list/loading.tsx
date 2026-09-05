import { HubSkeleton } from '@/components/ui/Skeleton';

export default function MyListLoading() {
  return <HubSkeleton chips={0} count={12} />;
}

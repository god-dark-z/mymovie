import { DetailSkeleton } from '@/components/ui/Skeleton';

export default function MovieLoading() {
  return (
    <div role="status" className="animate-fade-in pb-shell">
      <span className="sr-only">Loading title…</span>
      <DetailSkeleton />
    </div>
  );
}

import { DetailSkeleton, EpisodeSkeleton } from '@/components/ui/Skeleton';

export default function SeriesDetailLoading() {
  return (
    <div role="status" className="animate-fade-in pb-shell">
      <span className="sr-only">Loading title…</span>
      <DetailSkeleton />
      <div className="gutter-x mt-10">
        <EpisodeSkeleton count={5} />
      </div>
    </div>
  );
}

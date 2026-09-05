import { HeroSkeleton, RailSkeleton } from '@/components/ui/Skeleton';

/**
 * Fallback for the group's default route, the home page: hero then rails. Every
 * route with a different shape ships its own `loading.tsx` alongside its page.
 */
export default function HomeLoading() {
  return (
    <div role="status" className="animate-fade-in pb-shell">
      <span className="sr-only">Loading Cineora…</span>
      <HeroSkeleton />
      <div className="mt-9 flex flex-col gap-9 md:mt-12 md:gap-12">
        <RailSkeleton />
        <RailSkeleton />
        <RailSkeleton count={6} />
      </div>
    </div>
  );
}

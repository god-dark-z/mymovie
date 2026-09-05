import { cn } from '@/lib/utils/cn';

/** Base shimmer block. Every skeleton below composes this. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-lg', className)} aria-hidden />;
}

/** Poster card placeholder matching the real card's 2:3 ratio and label block. */
export function PosterSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('w-full', className)}>
      <Skeleton className="aspect-2/3 w-full rounded-2xl" />
      <Skeleton className="mt-2.5 h-3 w-4/5" />
      <Skeleton className="mt-1.5 h-2.5 w-2/5" />
    </div>
  );
}

/**
 * A horizontal rail of poster placeholders. Carries no outer margin — like the
 * real `Rail`, vertical rhythm belongs to the parent, so a streamed rail does
 * not shift the page when it swaps in.
 */
export function RailSkeleton({ count = 8, title = true }: { count?: number; title?: boolean }) {
  return (
    <section aria-hidden>
      {title ? (
        <div className="gutter-x">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-2.5 w-56" />
        </div>
      ) : null}
      <div className="rail gutter-x mt-3.5 md:mt-4">
        {Array.from({ length: count }).map((_, index) => (
          <PosterSkeleton key={index} className="w-[8.5rem] shrink-0 sm:w-[10rem] lg:w-[11.5rem]" />
        ))}
      </div>
    </section>
  );
}

/** Home hero placeholder — same height curve as the real hero to avoid a jump. */
export function HeroSkeleton() {
  return (
    <div className="relative h-[78svh] min-h-[30rem] w-full overflow-hidden sm:h-[80svh] lg:h-[86svh]">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-x-0 bottom-0 gutter-x pb-14 md:pb-20">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-9 w-[min(20rem,80vw)] md:h-14 md:w-[min(34rem,60vw)]" />
        <Skeleton className="mt-4 h-3 w-[min(28rem,90vw)]" />
        <Skeleton className="mt-2 h-3 w-[min(22rem,70vw)]" />
        <div className="mt-7 flex gap-3">
          <Skeleton className="h-[3.25rem] w-32 rounded-full md:h-12" />
          <Skeleton className="h-[3.25rem] w-32 rounded-full md:h-12" />
        </div>
      </div>
    </div>
  );
}

/** Details page placeholder: backdrop, poster, metadata column. */
export function DetailSkeleton() {
  return (
    <div>
      <Skeleton className="h-[46svh] min-h-[16rem] w-full rounded-none md:h-[62svh]" />
      <div className="gutter-x -mt-16 flex flex-col gap-6 md:-mt-28 md:flex-row md:gap-9">
        <Skeleton className="hidden aspect-2/3 w-52 shrink-0 rounded-2xl md:block lg:w-60" />
        <div className="min-w-0 flex-1 pt-2">
          <Skeleton className="h-8 w-[min(24rem,85vw)] md:h-11" />
          <Skeleton className="mt-4 h-3 w-56" />
          <div className="mt-6 flex gap-3">
            <Skeleton className="h-[3.25rem] w-36 rounded-full md:h-12" />
            <Skeleton className="h-[3.25rem] w-12 rounded-full md:h-12" />
          </div>
          <Skeleton className="mt-7 h-3 w-full" />
          <Skeleton className="mt-2 h-3 w-11/12" />
          <Skeleton className="mt-2 h-3 w-3/4" />
        </div>
      </div>
    </div>
  );
}

/** Episode row placeholder. */
export function EpisodeSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="mt-5 flex flex-col gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex gap-3.5 sm:gap-4">
          <Skeleton className="aspect-16/9 w-32 shrink-0 rounded-xl sm:w-44" />
          <div className="min-w-0 flex-1 py-1">
            <Skeleton className="h-3 w-3/5" />
            <Skeleton className="mt-2.5 h-2.5 w-full" />
            <Skeleton className="mt-1.5 h-2.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Search results placeholder used inside the overlay and on /search. */
export function SearchResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="aspect-2/3 w-11 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="mt-2 h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Grid placeholder for browse hubs and My List. */
export function GridSkeleton({ count = 18 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-6 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 3xl:grid-cols-8">
      {Array.from({ length: count }).map((_, index) => (
        <PosterSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Whole-page placeholder for a browse hub: heading, filter chips, grid. Shared by
 * every hub's `loading.tsx` so the shell never jumps when the data arrives.
 *
 * The shimmer blocks are hidden from assistive tech, so the status text is what
 * actually gets announced.
 */
export function HubSkeleton({ chips = 7, count = 18 }: { chips?: number; count?: number }) {
  return (
    <div role="status" className="animate-fade-in pt-shell pb-shell mx-auto w-full max-w-[110rem]">
      <span className="sr-only">Loading titles…</span>
      <div className="gutter-x pt-7 pb-5 md:pt-10 md:pb-7">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="mt-3.5 h-8 w-[min(18rem,70vw)] md:h-10 md:w-72" />
        <Skeleton className="mt-4 h-3 w-[min(30rem,88vw)]" />
        {chips > 0 ? (
          <div className="mt-6 flex gap-2 overflow-hidden">
            {Array.from({ length: chips }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-24 shrink-0 rounded-full md:h-9 md:w-20" />
            ))}
          </div>
        ) : null}
      </div>
      <div className="gutter-x">
        <GridSkeleton count={count} />
      </div>
    </div>
  );
}

/**
 * Watch-screen placeholder. Mirrors the real screen — safe-area header, stage
 * letterboxed inside the black band, control row — so nothing shifts once the
 * embed is ready.
 */
export function PlayerSkeleton() {
  return (
    <div role="status" className="animate-fade-in">
      <span className="sr-only">Loading the player…</span>
      <div className="gutter-x flex items-center gap-3 pt-[calc(var(--spacing-safe-t)+0.625rem)] pb-2.5">
        <Skeleton className="size-11 shrink-0 rounded-full md:size-10" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-3.5 w-[min(14rem,55vw)]" />
          <Skeleton className="mt-2 h-2.5 w-24" />
        </div>
        <Skeleton className="size-11 shrink-0 rounded-full md:size-10" />
      </div>

      <div className="bg-black">
        <div className="player-stage">
          <Skeleton className="aspect-video w-full rounded-none" />
        </div>
      </div>

      <div className="gutter-x flex gap-2 overflow-hidden pt-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-32 shrink-0 rounded-2xl md:h-13" />
        ))}
      </div>
    </div>
  );
}

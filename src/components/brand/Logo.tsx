import { cn } from '@/lib/utils/cn';
import {
  BRAND_SWEEP,
  MARK_ARC,
  MARK_ARC_WIDTH,
  MARK_PLAY,
  MARK_PLAY_WIDTH,
  MARK_RING,
  MARK_RING_WIDTH,
  MARK_VIEWBOX,
  WORDMARK_APERTURE,
  WORDMARK_LETTERS,
  WORDMARK_STROKE,
  WORDMARK_VIEWBOX,
} from '@/components/brand/marks';

/**
 * Gradient ids are fixed rather than generated. Every instance defines the same
 * stops, so a duplicate id resolves to identical paint — and a stable id keeps
 * these usable from server components, where `useId` is unavailable.
 */
const SWEEP_ID = 'cineora-sweep';
const WORD_SWEEP_ID = 'cineora-word-sweep';

function Sweep({ id, angled }: { id: string; angled?: boolean }) {
  return (
    <linearGradient
      id={id}
      x1="0"
      y1="0"
      x2={angled ? '1' : '0.9'}
      y2="1"
      gradientUnits="objectBoundingBox"
    >
      {BRAND_SWEEP.map((stop) => (
        <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
      ))}
    </linearGradient>
  );
}

export function CineoraMark({
  className,
  tone = 'brand',
}: {
  className?: string;
  /** `mono` inherits `currentColor` — used inside buttons and on the splash. */
  tone?: 'brand' | 'mono';
}) {
  const paint = tone === 'brand' ? `url(#${SWEEP_ID})` : 'currentColor';

  return (
    <svg viewBox={MARK_VIEWBOX} className={cn('block', className)} aria-hidden="true" focusable="false">
      {tone === 'brand' ? (
        <defs>
          <Sweep id={SWEEP_ID} angled />
        </defs>
      ) : null}
      <path
        d={MARK_RING}
        fill="none"
        stroke={paint}
        strokeWidth={MARK_RING_WIDTH}
        strokeLinecap="round"
      />
      <path
        d={MARK_ARC}
        fill="none"
        stroke={paint}
        strokeWidth={MARK_ARC_WIDTH}
        strokeLinecap="round"
        opacity={0.55}
      />
      <path
        d={MARK_PLAY}
        fill={paint}
        stroke={paint}
        strokeWidth={MARK_PLAY_WIDTH}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CineoraWordmark({
  className,
  tone = 'silver',
}: {
  className?: string;
  tone?: 'silver' | 'mono';
}) {
  const letters = tone === 'silver' ? '#eef0f5' : 'currentColor';
  const aperture = tone === 'silver' ? `url(#${WORD_SWEEP_ID})` : 'currentColor';

  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      className={cn('block', className)}
      role="img"
      aria-label="Cineora"
    >
      {tone === 'silver' ? (
        <defs>
          <Sweep id={WORD_SWEEP_ID} />
        </defs>
      ) : null}
      <g fill="none" strokeWidth={WORDMARK_STROKE} strokeLinecap="round" strokeLinejoin="round">
        <path d={WORDMARK_LETTERS} stroke={letters} />
        <path d={WORDMARK_APERTURE} stroke={aperture} />
      </g>
    </svg>
  );
}

/** Header / footer lockup: mark plus wordmark, sized off the mark. */
export function CineoraLogo({
  className,
  compact = false,
}: {
  className?: string;
  /** Mark only — used on narrow handsets and in the bottom navigation. */
  compact?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <CineoraMark className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
      {compact ? (
        <span className="sr-only">Cineora</span>
      ) : (
        <CineoraWordmark className="h-[0.95rem] w-auto sm:h-4" />
      )}
    </span>
  );
}

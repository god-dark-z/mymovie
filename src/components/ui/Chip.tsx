import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/**
 * Pill filter used for genres, seasons and sort options. Height clears the 44px
 * touch minimum on phones and tightens on pointer devices.
 *
 * `glass-sheen` is the specular half of the glass recipe without the backdrop
 * blur: a hub page can render twenty of these, and twenty blurred panes is how
 * a filter row starts costing frames.
 */
const BASE =
  'glass-sheen inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full border px-4 font-display text-[0.8125rem] font-medium whitespace-nowrap transition duration-200 ease-glass md:h-9 md:px-3.5 md:text-xs';

const TONES = {
  active:
    'border-ruby-500/45 bg-ruby-500/16 text-white shadow-[0_6px_20px_-10px_rgba(212,33,61,0.7)] md:hover:bg-ruby-500/22',
  idle: 'border-(--glass-line) bg-white/4 text-mist-300 md:hover:border-(--glass-line-strong) md:hover:bg-white/8 md:hover:text-white',
} as const;

export function chipClasses(active?: boolean, className?: string): string {
  return cn(BASE, 'tap', active ? TONES.active : TONES.idle, className);
}

export function Chip({
  children,
  active,
  onClick,
  className,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={chipClasses(active, className)}
    >
      {children}
    </button>
  );
}

export function ChipLink({
  children,
  href,
  active,
  className,
  scroll,
}: {
  children: React.ReactNode;
  href: string;
  active?: boolean;
  className?: string;
  scroll?: boolean;
}) {
  return (
    <Link
      href={href}
      scroll={scroll}
      aria-current={active ? 'page' : undefined}
      className={chipClasses(active, className)}
    >
      {children}
    </Link>
  );
}

/** Horizontally scrollable chip row with edge fade, for genre filters. */
export function ChipRow({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('no-scrollbar mask-fade-r -mx-1 flex gap-2 overflow-x-auto px-1 py-1', className)}
    >
      {children}
    </div>
  );
}

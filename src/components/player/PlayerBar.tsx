import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * The app-level control row.
 *
 * Everything here is a *Cineora* control — which server to request, which audio
 * and subtitle language to ask for, which episode to load. Play/pause, seeking,
 * quality and track switching belong to the Nxsha player inside the iframe, which
 * publishes no control API, so this bar never pretends to reach into it.
 */
export function PlayerBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="group"
      aria-label="Playback options"
      className={cn(
        // Below `md` the row scrolls sideways rather than wrapping, so the last
        // control is deliberately cut off at the edge. The fade says "there is
        // more this way" instead of leaving what looks like clipped text.
        'no-scrollbar -mx-1 flex items-stretch gap-2 overflow-x-auto px-1 py-1 max-md:mask-fade-r md:flex-wrap md:overflow-visible',
        className,
      )}
    >
      {children}
    </div>
  );
}

const CONTROL =
  'glass-1 tap flex h-14 shrink-0 items-center gap-2.5 rounded-2xl px-3.5 text-left outline-offset-2 md:h-13 md:hover:border-(--glass-line-strong) md:hover:bg-white/9';

function Face({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <>
      <span aria-hidden className="shrink-0 text-mist-400">
        {icon}
      </span>
      <span className="min-w-0 max-w-[9rem]">
        <span className="block text-[0.5625rem] font-semibold tracking-[0.12em] text-mist-500 uppercase">
          {label}
        </span>
        <span className="mt-0.5 block truncate font-display text-[0.8125rem] font-medium text-white">
          {value}
        </span>
      </span>
    </>
  );
}

export function ControlButton({
  icon,
  label,
  value,
  onClick,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value}. Change`}
      className={cn(CONTROL, className)}
    >
      <Face icon={icon} label={label} value={value} />
    </button>
  );
}

export function ControlLink({
  icon,
  label,
  value,
  href,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  href: string;
  className?: string;
}) {
  return (
    <Link href={href} prefetch={false} aria-label={`${label}: ${value}`} className={cn(CONTROL, className)}>
      <Face icon={icon} label={label} value={value} />
    </Link>
  );
}

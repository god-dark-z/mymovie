import { cn } from '@/lib/utils/cn';

/**
 * Standard page frame: clears the fixed header and the bottom navigation, and
 * fades in so route changes feel like a transition rather than a repaint.
 *
 * Hero pages pass `flush` and take care of the header offset themselves, because
 * their artwork is meant to run underneath the translucent bar.
 */
export function PageShell({
  children,
  className,
  flush = false,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
  /** Opts out of the reading-width clamp — used by full-bleed grids and rails. */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        'animate-fade-in pb-shell',
        flush ? '' : 'pt-shell',
        wide ? '' : 'mx-auto w-full max-w-[110rem]',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Page title block. `eyebrow` names the section, `title` is the h1. */
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Filters or actions, laid out under the copy. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('gutter-x pt-7 pb-5 md:pt-10 md:pb-7', className)}>
      {eyebrow ? (
        <p className="font-display text-[0.6875rem] font-semibold tracking-[0.18em] text-ruby-400 uppercase">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-2 text-[1.75rem] leading-[1.1] font-semibold text-white md:text-4xl">{title}</h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist-400 md:text-[0.9375rem]">{description}</p>
      ) : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </header>
  );
}

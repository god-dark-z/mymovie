import Link from 'next/link';
import type { ReactNode } from 'react';
import { CineoraLogo } from '@/components/brand/Logo';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils/cn';

/**
 * The frame every sign-in, sign-up and recovery screen sits in.
 *
 * One card, centred, over the same ambience layer the rest of the product uses —
 * the glass here is level 3 because it floats over that gradient with nothing
 * guaranteed behind it, and level 3 tints dark enough to hold white text without
 * needing a heavy blur.
 *
 * The layout is a column that grows from the top on a handset and centres once
 * there is vertical room, so a focused keyboard never pushes the heading off
 * screen: on a 390×844 phone with the keyboard up there are roughly 400px of
 * usable height, and a vertically centred card would place its first field under
 * the keyboard.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
  aside,
  width = 'md',
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** The switch to the opposite flow — "Already have an account?" and friends. */
  footer?: ReactNode;
  /** Extra reassurance rendered under the card, outside its glass. */
  aside?: ReactNode;
  width?: 'sm' | 'md';
}) {
  return (
    <div className="flex min-h-app flex-col">
      <header className="gutter-x flex items-center justify-between gap-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-2 md:pt-7">
        <Link
          href="/"
          className="tap -mx-1.5 rounded-2xl px-1.5 py-1"
          aria-label="Cineora — go to the home page"
        >
          <CineoraLogo />
        </Link>
        <Link
          href="/"
          className="tap rounded-full border border-(--glass-line) px-3.5 py-2 text-xs font-medium text-mist-300 transition-colors duration-200 ease-glass md:hover:border-(--glass-line-strong) md:hover:text-mist-100"
        >
          Keep browsing
        </Link>
      </header>

      <main
        id="main"
        className="gutter-x flex flex-1 flex-col items-center justify-start py-6 md:justify-center md:py-10"
      >
        <div className={cn('w-full', width === 'sm' ? 'max-w-[24rem]' : 'max-w-[27rem]')}>
          <GlassPanel
            level={3}
            hairline
            className="glass-sheen overflow-hidden rounded-3xl px-5 py-6 md:px-7 md:py-8"
          >
            <h1 className="font-display text-[1.5rem] leading-[1.15] font-semibold text-white md:text-[1.75rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-[0.875rem] leading-relaxed text-mist-400">{description}</p>
            ) : null}
            <div className="mt-6">{children}</div>
          </GlassPanel>

          {footer ? (
            <p className="mt-5 text-center text-[0.8125rem] text-mist-400">{footer}</p>
          ) : null}
          {aside}
        </div>
      </main>

      <footer className="gutter-x pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] text-center text-[0.6875rem] leading-relaxed text-mist-500">
        Cineora is a metadata and discovery interface. It stores nothing you watch on our
        servers.
      </footer>
    </div>
  );
}

/** The link row under the card. Kept here so every screen words it the same way. */
export function AuthSwitch({ label, href, cta }: { label: string; href: string; cta: string }) {
  return (
    <>
      {label}{' '}
      <Link href={href} className="font-medium text-mist-100 underline decoration-ruby-400/50 underline-offset-4 md:hover:decoration-ruby-400">
        {cta}
      </Link>
    </>
  );
}

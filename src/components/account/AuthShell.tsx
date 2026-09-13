import Link from 'next/link';
import type { ReactNode } from 'react';
import { CineoraLogo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils/cn';

/**
 * The frame every sign-in, sign-up and recovery screen sits in.
 *
 * A split cinematic composition on desktop: an editorial column on the left, and
 * the authentication panel held in dark glass on the right — deliberately not
 * centred, so the page reads as a place rather than a form. On a handset the
 * editorial column folds away entirely (the form is the page), the panel starts
 * near the top instead of centring, and nothing floats behind the keyboard.
 *
 * The panel itself is level-3 glass with the masked edge ring and the specular
 * sheen — the same material language as the floating navigation — and it rises
 * into place on mount, which is also the login↔sign-up transition: the
 * atmosphere layer lives in the route layout and never reloads, so navigating
 * between the two screens reads as one environment changing its mind.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
  aside,
  width = 'md',
  editorial,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** The switch to the opposite flow — "Already have an account?" and friends. */
  footer?: ReactNode;
  /** Extra reassurance rendered under the panel, outside its glass. */
  aside?: ReactNode;
  width?: 'sm' | 'md';
  /** The desktop-only editorial column: one line of cinema, one of support. */
  editorial?: { line: string; support: string };
}) {
  return (
    <div className="relative flex min-h-app flex-col">
      <header className="gutter-x flex animate-fade-in items-center justify-between gap-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-2 md:pt-7">
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
        className="gutter-x flex flex-1 flex-col items-center justify-start py-6 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:justify-items-end md:gap-14 md:py-10 lg:gap-24"
      >
        {/* The editorial column: large negative space with one line of cinema.
            Handsets never see it — there, the form is the entire page. */}
        {editorial ? (
          <div className="hidden max-w-lg animate-fade-in md:block">
            <p className="font-display text-[2.125rem] leading-[1.12] font-semibold text-mist-100 lg:text-[2.5rem]">
              {editorial.line}
            </p>
            <p className="mt-4 max-w-sm text-[0.9375rem] leading-relaxed text-mist-400">
              {editorial.support}
            </p>
            <p className="mt-8 flex items-center gap-2.5 text-[0.6875rem] font-medium tracking-[0.14em] text-mist-500 uppercase">
              <span aria-hidden className="h-px w-8 bg-ruby-400/70" />
              Every screen. One account.
            </p>
          </div>
        ) : null}

        <div className={cn('w-full', width === 'sm' ? 'max-w-[24rem]' : 'max-w-[27rem]')}>
          <div className="edge-ring glass-3 glass-sheen hairline-top animate-rise overflow-hidden rounded-3xl px-5 py-6 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.9)] md:px-7 md:py-8">
            <h1 className="font-display text-[1.5rem] leading-[1.15] font-semibold text-white md:text-[1.75rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-[0.875rem] leading-relaxed text-mist-400">{description}</p>
            ) : null}
            <div className="mt-6">{children}</div>
          </div>

          {footer ? (
            <p className="mt-5 animate-fade-in text-center text-[0.8125rem] text-mist-400">{footer}</p>
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

/** The link row under the panel. Kept here so every screen words it the same way. */
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

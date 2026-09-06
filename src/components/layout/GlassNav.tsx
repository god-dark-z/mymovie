'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/account/AuthProvider';
import { Avatar } from '@/components/account/Avatar';
import { CineoraMark } from '@/components/brand/Logo';
import { useSearch } from '@/components/search/SearchProvider';
import {
  BookmarkIcon,
  FilmIcon,
  HomeIcon,
  SearchIcon,
  SparkIcon,
  TvIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { cn } from '@/lib/utils/cn';

const DESTINATIONS = [
  { href: '/', label: 'Home', icon: HomeIcon },
  { href: '/movies', label: 'Movies', icon: FilmIcon },
  { href: '/series', label: 'Series', icon: TvIcon },
  { href: '/anime', label: 'Anime', icon: SparkIcon },
] as const;

/**
 * A cell in the pill. One set of classes covers both layouts: a handset stacks
 * an icon over a micro-label and lets the six cells share the width evenly — so
 * the bar cannot overflow at 320px — while `md` collapses to a single row of
 * labelled chips.
 *
 * `md` starts at 768px, which is an iPad in portrait rather than a mouse, so the
 * collapsed chips stay 44px tall and the icon buttons stay 44px square: still a
 * touch target, just a denser one.
 */
const CELL =
  'tap relative flex min-w-0 flex-1 flex-col items-center justify-center gap-[0.1875rem] rounded-[1.125rem] px-0.5 py-1.5 md:h-11 md:flex-none md:flex-row md:gap-0 md:rounded-full md:py-0';
const CELL_ICON = 'size-[1.375rem] shrink-0 md:size-[1.0625rem]';
const CELL_LABEL =
  'max-w-full truncate text-[0.5625rem] font-semibold tracking-[0.03em] md:text-[0.8125rem] md:font-medium md:tracking-normal';
const CELL_REST = 'text-mist-300 md:hover:bg-white/8 md:hover:text-white';

/**
 * The one piece of chrome every browsing page shares: a floating liquid-glass
 * pill, anchored to the bottom on a handset and to the top from `md` up.
 *
 * Bottom-on-mobile is not only the requested layout, it is the reachable one —
 * a thumb reaches the bottom of a 6.7" phone, not the top. Nothing here reacts
 * to scroll: the previous header swapped tints and blur as the page moved,
 * which meant re-running a full-width backdrop blur on scroll frames. A pill
 * that simply stays put blurs a third of the area and never re-composites for a
 * state change.
 */
export function GlassNav() {
  const pathname = usePathname();
  const { open, isOpen } = useSearch();
  const { configured, user, signedIn } = useAuth();

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const savedActive = isActive('/my-list');
  const accountActive = isActive('/account') || isActive('/login') || isActive('/signup');

  // On a deployment that cannot run accounts, this points at /account, which
  // explains the situation, rather than at a sign-in form that cannot succeed.
  // The label stays "Account" in both states so it does not change on hydration.
  const accountHref = signedIn || !configured ? '/account' : '/login';

  return (
    <header
      // The wrapper spans the viewport so the pill can centre, but it stays
      // click-through — otherwise a full-width strip would swallow taps either
      // side of the pill.
      className={cn(
        'gutter-x pointer-events-none fixed inset-x-0 z-70',
        'bottom-[calc(var(--nav-gap)+env(safe-area-inset-bottom,0px))]',
        'md:top-[calc(var(--nav-gap)+env(safe-area-inset-top,0px))] md:bottom-auto',
      )}
    >
      <nav
        aria-label="Primary"
        className="glass-nav pointer-events-auto mx-auto flex h-(--nav-h) w-full items-center gap-1 rounded-full px-1 md:w-fit md:gap-2 md:px-2.5"
      >
        <Link
          href="/"
          aria-label="Cineora home"
          className="brand-tile tap hidden size-10 shrink-0 items-center justify-center rounded-[0.8125rem] text-white md:flex"
        >
          <CineoraMark tone="mono" className="size-[1.375rem]" />
        </Link>

        <ul className="flex w-full items-center md:w-auto md:gap-0.5">
          {DESTINATIONS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);

            return (
              <li key={href} className="flex min-w-0 flex-1 md:flex-none">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    CELL,
                    'md:px-3.5',
                    active ? 'glass-pill text-white' : CELL_REST,
                  )}
                >
                  <Icon className={cn(CELL_ICON, 'md:hidden')} />
                  <span className={CELL_LABEL}>{label}</span>
                </Link>
              </li>
            );
          })}

          {/* Separates destinations from the two utilities. Decorative only. */}
          <li aria-hidden className="mx-1 hidden h-6 w-px shrink-0 bg-white/12 md:block" />

          <li className="flex min-w-0 flex-1 md:flex-none">
            {/* The label is always in the DOM — it just goes visually hidden at
                `md`, so the icon button keeps its accessible name. */}
            <button
              type="button"
              onClick={() => open()}
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              className={cn(CELL, 'md:size-11', isOpen ? 'glass-pill text-white' : CELL_REST)}
            >
              <SearchIcon className={CELL_ICON} />
              <span className={cn(CELL_LABEL, 'md:sr-only')}>Search</span>
            </button>
          </li>

          <li className="flex min-w-0 flex-1 md:flex-none">
            <Link
              href="/my-list"
              aria-current={savedActive ? 'page' : undefined}
              className={cn(CELL, 'md:size-11', savedActive ? 'glass-pill text-white' : CELL_REST)}
            >
              <BookmarkIcon className={CELL_ICON} filled={savedActive} />
              <span className={cn(CELL_LABEL, 'md:sr-only')}>My List</span>
            </Link>
          </li>

          {configured ? (
            <li className="flex min-w-0 flex-1 md:flex-none">
              <Link
                href={accountHref}
                aria-current={accountActive ? 'page' : undefined}
                aria-label={signedIn ? `Account — ${user?.displayName ?? 'you'}` : 'Sign in to Cineora'}
                className={cn(CELL, 'md:size-11', accountActive ? 'glass-pill text-white' : CELL_REST)}
              >
                {signedIn && user ? (
                  <Avatar
                    user={user}
                    size="sm"
                    className={cn(
                      'size-[1.375rem] text-[0.5rem] md:size-[1.3125rem]',
                      accountActive && 'ring-white/35',
                    )}
                  />
                ) : (
                  <UserIcon className={CELL_ICON} filled={accountActive} />
                )}
                <span aria-hidden className={cn(CELL_LABEL, 'md:sr-only')}>
                  Account
                </span>
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>
    </header>
  );
}

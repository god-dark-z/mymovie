'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/components/account/AuthProvider';
import { Avatar } from '@/components/account/Avatar';
import { PageShell } from '@/components/layout/Page';
import { ButtonLink } from '@/components/ui/Button';
import {
  AccessibilityIcon,
  BellIcon,
  CheckIcon,
  DownloadIcon,
  EyeIcon,
  LockIcon,
  PencilIcon,
  ShieldIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { loginHref } from '@/lib/auth/redirect';
import { cn } from '@/lib/utils/cn';

/**
 * The Account Hub frame.
 *
 * Three layers, one environment: the cinematic backdrop lives in the route
 * layout; the profile hero sits in dark glass with the masked edge ring the
 * authentication panels use; the section navigation is a glass sidebar on
 * desktop and a scrolling chip rail on a handset. Every account route renders
 * inside this frame, so moving between sections reads as one continuous space.
 *
 * The gate here is a convenience, not the protection. Nothing private is rendered
 * from this component: every value on these screens arrives from an endpoint that
 * checks the session itself, so a visitor who forces the route open sees an empty
 * frame and a sign-in prompt rather than anyone's data.
 */

interface Section {
  href: string;
  label: string;
  icon: ReactNode;
}

const SECTIONS: Section[] = [
  { href: '/account', label: 'Overview', icon: <UserIcon className="size-[1.0625rem]" /> },
  { href: '/account/profile', label: 'Profile', icon: <AccessibilityIcon className="size-[1.0625rem]" /> },
  { href: '/account/security', label: 'Security', icon: <ShieldIcon className="size-[1.0625rem]" /> },
  { href: '/account/sessions', label: 'Devices', icon: <LockIcon className="size-[1.0625rem]" /> },
  { href: '/account/preferences', label: 'Preferences', icon: <EyeIcon className="size-[1.0625rem]" /> },
  { href: '/account/notifications', label: 'Notifications', icon: <BellIcon className="size-[1.0625rem]" /> },
  { href: '/account/privacy', label: 'Privacy & data', icon: <DownloadIcon className="size-[1.0625rem]" /> },
];

export function AccountShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { status, signedIn, configured, user } = useAuth();

  if (status === 'loading') {
    return (
      <PageShell>
        <HubSkeleton />
      </PageShell>
    );
  }

  if (!configured) {
    return (
      <PageShell>
        <Gate
          title="Accounts are switched off here"
          // Deliberately does not name the missing variable. Accounts can be off for
          // several operator reasons, and a reader cannot act on any of them; the
          // specifics belong in the server log, not on the page.
          body="This deployment is not set up for accounts, so there is nothing to sign in to. Browsing, search and playback all work without one."
        />
      </PageShell>
    );
  }

  if (!signedIn) {
    return (
      <PageShell>
        <Gate
          title="Sign in to continue"
          body="Your profile, devices and preferences live behind your account. Signing in takes a moment."
          action={{ href: loginHref(pathname), label: 'Sign in' }}
          secondary={{ href: '/signup', label: 'Create an account' }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ProfileHero />

      <div className="gutter-x mt-6 md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:items-start md:gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <AccountNav pathname={pathname} />
        <section aria-label={title} className="mt-5 flex min-w-0 flex-col gap-4 md:mt-0 md:gap-5">
          <div className="animate-fade-in">
            <h1 className="font-display text-xl font-semibold tracking-[-0.01em] text-white md:text-2xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-[0.8125rem] leading-relaxed text-pretty text-mist-400 md:text-sm">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </section>
      </div>
    </PageShell>
  );
}

/**
 * The profile hero: identity, status and the primary edit action, held in dark
 * glass with the same masked edge ring as the authentication panels. The avatar
 * is the visual anchor — a glass frame, a slow illumination on hover, and an
 * edit chip that appears to say the frame itself is a door to /account/profile.
 */
function ProfileHero() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <section
      aria-label="Profile"
      className="edge-ring glass-2 glass-sheen hairline-top animate-rise relative overflow-hidden rounded-3xl px-5 py-5 md:px-7 md:py-6"
    >
      {/* Ambient blooms — the same two-light treatment the auth panels sit in. */}
      <div aria-hidden className="absolute -right-20 -top-24 size-56 rounded-full bg-ruby-500/14 blur-3xl" />
      <div aria-hidden className="absolute -bottom-16 -left-12 size-44 rounded-full bg-white/[0.04] blur-3xl" />

      <div className="relative flex items-center gap-4 md:gap-6">
        <Link
          href="/account/profile"
          aria-label="Change your profile picture"
          className="tap group/avatar relative shrink-0 rounded-full"
        >
          {/* The layered frame: ring, then a slow ruby wash that only exists on hover. */}
          <span
            aria-hidden
            className="absolute -inset-1.5 rounded-full bg-ruby-500/0 blur-md transition duration-500 ease-glass group-hover/avatar:bg-ruby-500/25"
          />
          <span className="relative block rounded-full ring-1 ring-white/15 transition duration-500 ease-glass md:group-hover/avatar:ring-white/30">
            <Avatar user={user} size="lg" className="transition duration-500 ease-glass md:group-hover/avatar:scale-[1.04]" />
          </span>
          <span
            aria-hidden
            className="glass-flat absolute inset-0 m-auto grid size-8 place-items-center rounded-full text-white opacity-0 transition duration-300 ease-glass md:group-hover/avatar:opacity-100"
          >
            <PencilIcon className="size-3.5" />
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="truncate font-display text-lg font-semibold text-white md:text-[1.375rem]">
              {user.displayName}
            </p>
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-jade-400/30 bg-jade-400/10 px-2 py-0.5 text-[0.625rem] font-medium text-jade-300">
                <CheckIcon className="size-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/30 bg-gold-400/10 px-2 py-0.5 text-[0.625rem] font-medium text-gold-400">
                Unconfirmed email
              </span>
            )}
          </div>

          <p className="mt-0.5 truncate text-[0.8125rem] text-mist-400">
            {user.username ? `@${user.username} · ` : ''}
            {user.email}
          </p>
          {user.bio ? (
            <p className="mt-1.5 line-clamp-1 text-[0.8125rem] text-pretty text-mist-300">{user.bio}</p>
          ) : null}
        </div>

        <ButtonLink
          href="/account/profile"
          variant="glass"
          size="sm"
          className="hidden shrink-0 sm:inline-flex"
        >
          <PencilIcon className="size-3.5" />
          Edit profile
        </ButtonLink>
      </div>

      {/* The edit action drops below the identity block on a handset, where the
          horizontal room for a third column does not exist. */}
      <div className="relative mt-4 sm:hidden">
        <ButtonLink href="/account/profile" variant="glass" size="sm" className="w-full">
          <PencilIcon className="size-3.5" />
          Edit profile
        </ButtonLink>
      </div>
    </section>
  );
}

function AccountNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Account sections" className="md:sticky md:top-[calc(var(--header-h)+1rem)]">
      {/* One list, two presentations: a scrolling rail on a handset, a glass
          column at md. The active item carries the lit chip and a ruby edge bar,
          the same accent language as the primary navigation. */}
      <ul className="rail -mx-(--gutter) flex gap-2 px-(--gutter) md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:py-2">
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.href} className="shrink-0 md:w-full">
              <Link
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'tap relative flex min-h-11 items-center gap-2.5 rounded-full border px-3.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-200 ease-glass md:min-h-10 md:w-full md:rounded-2xl md:px-3.5',
                  active
                    ? 'glass-pill border-transparent text-white'
                    : 'border-(--glass-line) bg-white/[0.03] text-mist-300 md:border-transparent md:hover:bg-white/6 md:hover:text-mist-100',
                )}
              >
                {/* The accent edge: a 2px ruby bar only on the active row, so the
                    selection reads in the peripheral vision before the icon does. */}
                <span
                  aria-hidden
                  className={cn(
                    'absolute left-0 top-1/2 hidden h-5 w-0.5 -translate-y-1/2 rounded-full bg-ruby-400 transition-opacity duration-300 md:block',
                    active ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span aria-hidden className={active ? 'text-ruby-300' : 'text-mist-500'}>
                  {section.icon}
                </span>
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Skeletons that mirror the hub's real geometry, so loading shifts nothing. */
function HubSkeleton() {
  return (
    <div>
      <div className="glass-2 flex items-center gap-4 rounded-3xl px-5 py-5 md:px-7">
        <div className="skeleton size-16 shrink-0 rounded-full md:size-14" />
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="skeleton h-4 w-40 rounded-full" />
          <div className="skeleton h-3 w-56 rounded-full" />
        </div>
        <div className="skeleton hidden h-9 w-28 rounded-full sm:block" />
      </div>
      <div className="gutter-x mt-6 md:grid md:grid-cols-[15rem_minmax(0,1fr)] md:gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="skeleton hidden h-72 rounded-3xl md:block" />
        <div className="hidden space-y-4 md:block">
          <div className="skeleton h-6 w-36 rounded-full" />
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-40 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

function Gate({
  title,
  body,
  action,
  secondary,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <div className="gutter-x flex min-h-[55vh] flex-col items-center justify-center py-12 text-center">
      <div className="edge-ring glass-2 mb-5 grid size-14 place-items-center rounded-2xl text-mist-400">
        <UserIcon className="size-6" />
      </div>
      <h1 className="font-display text-xl font-semibold text-white md:text-2xl">{title}</h1>
      <p className="mt-2.5 max-w-md text-sm leading-relaxed text-pretty text-mist-500">{body}</p>
      {action ? (
        <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
          <ButtonLink href={action.href} variant="accent" size="lg" className="w-full tap-glow">
            {action.label}
          </ButtonLink>
          {secondary ? (
            <ButtonLink href={secondary.href} variant="outline" size="lg" className="w-full">
              {secondary.label}
            </ButtonLink>
          ) : null}
        </div>
      ) : (
        <ButtonLink href="/" variant="outline" size="md" className="mt-7">
          Back to browsing
        </ButtonLink>
      )}
    </div>
  );
}

/** A titled glass card. Every account screen is built from these. */
export function AccountCard({
  title,
  description,
  children,
  footer,
  tone = 'default',
  className,
}: {
  title?: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** `danger` is reserved for destructive sections. */
  tone?: 'default' | 'danger';
  className?: string;
}) {
  return (
    <section
      className={cn(
        'glass-1 hairline-top rounded-3xl px-4 py-4 md:px-5 md:py-5',
        tone === 'danger' && 'border-ruby-500/25 bg-ruby-500/4',
        className,
      )}
    >
      {title ? (
        <div className="mb-4">
          <h2
            className={cn(
              'font-display text-[0.9375rem] font-semibold md:text-base',
              tone === 'danger' ? 'text-ruby-200' : 'text-white',
            )}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-mist-400">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
      {footer ? <div className="mt-4 border-t border-(--glass-line) pt-4">{footer}</div> : null}
    </section>
  );
}

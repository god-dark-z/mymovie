'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/components/account/AuthProvider';
import { PageShell } from '@/components/layout/Page';
import { ButtonLink } from '@/components/ui/Button';
import {
  AccessibilityIcon,
  BellIcon,
  DownloadIcon,
  EyeIcon,
  LockIcon,
  ShieldIcon,
  SpinnerIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { loginHref } from '@/lib/auth/redirect';
import { cn } from '@/lib/utils/cn';

/**
 * The frame for every account screen.
 *
 * Sections are a sticky column at `md` and a scrolling chip rail below it, which is
 * the same pattern the browse filters use — a phone has no room for a sidebar, and a
 * dropdown would hide where you are.
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
  const { status, signedIn, configured } = useAuth();

  if (status === 'loading') {
    return (
      <PageShell>
        <div className="gutter-x flex min-h-[50vh] items-center justify-center">
          <SpinnerIcon className="size-7 text-mist-500" />
          <span className="sr-only">Loading your account</span>
        </div>
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
      <header className="gutter-x pt-7 pb-5 md:pt-10 md:pb-7">
        <p className="font-display text-[0.6875rem] font-semibold tracking-[0.18em] text-ruby-400 uppercase">
          Account
        </p>
        <h1 className="mt-2 text-[1.75rem] leading-[1.1] font-semibold text-white md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist-400 md:text-[0.9375rem]">
            {description}
          </p>
        ) : null}
      </header>

      <div className="gutter-x md:grid md:grid-cols-[13.5rem_minmax(0,1fr)] md:items-start md:gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <AccountNav pathname={pathname} />
        <div className="mt-5 flex min-w-0 flex-col gap-4 md:mt-0 md:gap-5">{children}</div>
      </div>
    </PageShell>
  );
}

function AccountNav({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Account sections" className="md:sticky md:top-[calc(var(--header-h)+1rem)]">
      {/* One list, two presentations: a scrolling rail on a handset, a column at md.
          `rail` supplies the momentum scrolling and edge padding used elsewhere. */}
      <ul className="rail -mx-(--gutter) flex gap-2 px-(--gutter) md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0">
        {SECTIONS.map((section) => {
          const active = pathname === section.href;
          return (
            <li key={section.href} className="shrink-0 md:w-full">
              <Link
                href={section.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'tap flex min-h-11 items-center gap-2.5 rounded-full border px-3.5 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-200 ease-glass md:min-h-10 md:w-full md:rounded-2xl md:px-3',
                  active
                    ? 'border-ruby-500/35 bg-ruby-500/12 text-white'
                    : 'border-(--glass-line) text-mist-300 md:border-transparent md:hover:bg-white/6 md:hover:text-mist-100',
                )}
              >
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
      <div className="glass-2 mb-5 grid size-14 place-items-center rounded-2xl text-mist-400">
        <UserIcon className="size-6" />
      </div>
      <h1 className="font-display text-xl font-semibold text-white md:text-2xl">{title}</h1>
      <p className="mt-2.5 max-w-md text-sm leading-relaxed text-pretty text-mist-500">{body}</p>
      {action ? (
        <div className="mt-7 flex w-full max-w-xs flex-col gap-2.5">
          <ButtonLink href={action.href} variant="accent" size="lg" className="w-full">
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

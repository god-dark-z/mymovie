'use client';

import Link from 'next/link';
import { useAuth } from '@/components/account/AuthProvider';
import { VerifyEmailNotice } from '@/components/account/VerifyEmailNotice';
import { FormAlert } from '@/components/ui/Form';
import {
  BellIcon,
  BookmarkIcon,
  CheckIcon,
  ChevronRightIcon,
  DownloadIcon,
  EyeIcon,
  LockIcon,
  ShieldIcon,
  UserIcon,
} from '@/components/ui/Icons';
import { formatDay } from '@/lib/auth/labels';
import { cn } from '@/lib/utils/cn';

/**
 * The account hub home.
 *
 * This screen is a *menu*, not a dashboard: one curated column of large, quiet
 * rows — each an answer to "what can I manage here?" — with the details one tap
 * away in their own section. Everything that used to live here as cards (tiles,
 * the activity feed, account facts) still exists; it just lives in the section
 * it belongs to now — the activity log under Security, the email switches under
 * Notifications, deletion under Privacy.
 */

const HUB_ROWS: ReadonlyArray<{
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}> = [
  {
    href: '/account/profile',
    icon: <UserIcon className="size-5" />,
    title: 'Profile',
    description: 'Your name, handle, bio and profile picture.',
  },
  {
    href: '/account/security',
    icon: <ShieldIcon className="size-5" />,
    title: 'Security',
    description: 'Password, and the full account activity log.',
  },
  {
    href: '/account/sessions',
    icon: <LockIcon className="size-5" />,
    title: 'Devices',
    description: 'Everything currently signed in to your account.',
  },
  {
    href: '/account/preferences',
    icon: <EyeIcon className="size-5" />,
    title: 'Preferences',
    description: 'Appearance, languages and playback defaults.',
  },
  {
    href: '/account/notifications',
    icon: <BellIcon className="size-5" />,
    title: 'Notifications',
    description: 'What lands in your inbox, and when.',
  },
  {
    href: '/account/privacy',
    icon: <DownloadIcon className="size-5" />,
    title: 'Privacy & data',
    description: 'Export a copy of your data, or delete the account.',
  },
  {
    href: '/downloads',
    icon: <BookmarkIcon className="size-5" />,
    title: 'Downloads',
    description: 'Titles saved for offline viewing.',
  },
];

export function AccountOverview({ justReset }: { justReset: boolean }) {
  const { user } = useAuth();

  if (!user) return null;
  const zone = user.preferences.timezone;

  return (
    <>
      {justReset ? (
        <FormAlert tone="success">
          Your password was changed and every other device was signed out.
        </FormAlert>
      ) : null}

      {user.emailVerified ? null : <VerifyEmailNotice email={user.email} />}

      {/* The hub menu: large, quiet rows. Hover raises the row and lights its
          icon — the same accent language as the sidebar, one size up. */}
      <nav aria-label="Account sections" className="animate-fade-in flex flex-col gap-3">
        {HUB_ROWS.map((row) => (
          <Link
            key={row.href}
            href={row.href}
            className="tap glass-1 group/row flex items-center gap-4 rounded-3xl p-4 transition-all duration-300 ease-glass md:p-5 md:hover:-translate-y-0.5 md:hover:bg-white/[0.06]"
          >
            <span
              aria-hidden
              className={cn(
                'grid size-12 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-ruby-300 ring-1 ring-inset ring-white/10 transition-colors duration-300 md:group-hover/row:ring-white/20',
              )}
            >
              {row.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-semibold text-white md:text-base">
                {row.title}
              </span>
              <span className="mt-0.5 block truncate text-[0.8125rem] text-mist-500">
                {row.description}
              </span>
            </span>
            <ChevronRightIcon
              aria-hidden
              className="size-4 shrink-0 text-mist-600 transition-all duration-300 md:group-hover/row:translate-x-0.5 md:group-hover/row:text-white"
            />
          </Link>
        ))}
      </nav>

      {/* Tenure line — the one fact worth surfacing on this screen. */}
      <p className="mt-5 flex items-center gap-2 text-xs text-mist-500">
        <CheckIcon aria-hidden className="size-3.5 text-jade-400" />
        Member since {formatDay(user.createdAt, zone)} · {user.email}
      </p>
    </>
  );
}

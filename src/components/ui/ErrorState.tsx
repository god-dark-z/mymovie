'use client';

import { AlertIcon, InfoIcon, OfflineIcon, RetryIcon } from '@/components/ui/Icons';
import { Button, ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export type ErrorKind = 'metadata' | 'search' | 'playback' | 'offline' | 'notFound' | 'generic';

/**
 * Every failure the user can see funnels through here so the copy stays honest
 * and consistent: what failed, and what they can do next. No stack traces, no
 * raw provider payloads, no invented reasons.
 */
const PRESETS: Record<ErrorKind, { title: string; description: string; icon: 'alert' | 'offline' | 'info' }> = {
  metadata: {
    title: 'Catalogue unavailable',
    description:
      'We could not reach the metadata service just now. This is usually temporary — try again in a moment.',
    icon: 'alert',
  },
  search: {
    title: 'Search is unavailable',
    description: 'The search service did not respond. Your recent searches are still saved on this device.',
    icon: 'alert',
  },
  playback: {
    title: 'No playback source',
    description:
      'None of the available servers returned a stream for this title. Try a different server, or check back later.',
    icon: 'alert',
  },
  offline: {
    title: 'You are offline',
    description: 'Reconnect to load new titles. Anything already on screen stays available.',
    icon: 'offline',
  },
  notFound: {
    title: 'Title not found',
    description: 'This title is not in the catalogue, or the link points to an id we cannot resolve.',
    icon: 'info',
  },
  generic: {
    title: 'Something went wrong',
    description: 'An unexpected problem interrupted this page. Reloading usually clears it.',
    icon: 'alert',
  },
};

function GlyphFor({ icon }: { icon: 'alert' | 'offline' | 'info' }) {
  if (icon === 'offline') return <OfflineIcon className="size-6" />;
  if (icon === 'info') return <InfoIcon className="size-6" />;
  return <AlertIcon className="size-6" />;
}

export function ErrorState({
  kind = 'generic',
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  action,
  className,
  compact = false,
  as: Heading = 'h2',
}: {
  kind?: ErrorKind;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: { label: string; href: string };
  className?: string;
  compact?: boolean;
  /** `h1` when this state is the whole page, as on an error boundary. */
  as?: 'h1' | 'h2';
}) {
  const preset = PRESETS[kind];

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-10' : 'px-5 py-16 md:py-24',
        className,
      )}
    >
      <div
        className={cn(
          'glass-2 mb-5 flex size-14 items-center justify-center rounded-2xl',
          kind === 'offline' ? 'text-mist-400' : 'text-ruby-300',
        )}
      >
        <GlyphFor icon={preset.icon} />
      </div>

      <Heading
        className={cn(
          'font-display font-semibold tracking-[-0.01em] text-white',
          compact ? 'text-[0.9375rem]' : 'text-lg md:text-xl',
        )}
      >
        {title ?? preset.title}
      </Heading>
      <p
        className={cn(
          'mt-2 max-w-md text-pretty text-mist-500',
          compact ? 'text-[0.8125rem]' : 'text-sm leading-relaxed',
        )}
      >
        {description ?? preset.description}
      </p>

      {onRetry || action ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <Button variant="accent" size={compact ? 'sm' : 'md'} onClick={onRetry}>
              <RetryIcon className="size-4" />
              {retryLabel}
            </Button>
          ) : null}
          {action ? (
            <ButtonLink href={action.href} variant="glass" size={compact ? 'sm' : 'md'}>
              {action.label}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Compact inline notice for a single failed rail or panel. */
export function InlineNotice({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'warning';
  className?: string;
}) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed',
        tone === 'warning'
          ? 'border-ruby-500/30 bg-ruby-500/8 text-ruby-200'
          : 'border-(--glass-line) bg-white/4 text-mist-400',
        className,
      )}
    >
      <InfoIcon className="mt-px size-4 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

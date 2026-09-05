import { ButtonLink } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

/**
 * Shared "nothing here yet" panel. Server-safe: the reload affordance is a link,
 * and interactive retries live in ErrorState instead.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'px-4 py-10' : 'px-5 py-16 md:py-24',
        className,
      )}
    >
      {icon ? (
        <div className="glass-2 mb-5 flex size-14 items-center justify-center rounded-2xl text-mist-400">
          <span className="[&>svg]:size-6">{icon}</span>
        </div>
      ) : null}

      <h2
        className={cn(
          'font-display font-semibold tracking-[-0.01em] text-white',
          compact ? 'text-[0.9375rem]' : 'text-lg md:text-xl',
        )}
      >
        {title}
      </h2>

      {description ? (
        <p
          className={cn(
            'mt-2 max-w-md text-pretty text-mist-500',
            compact ? 'text-[0.8125rem]' : 'text-sm leading-relaxed',
          )}
        >
          {description}
        </p>
      ) : null}

      {action ? (
        <ButtonLink href={action.href} variant="glass" size={compact ? 'sm' : 'md'} className="mt-6">
          {action.label}
        </ButtonLink>
      ) : null}
    </div>
  );
}

/** Inline variant for empty rails, where a full-height panel would look broken. */
export function EmptyRail({ message }: { message: string }) {
  return (
    <div className="gutter-x">
      <div className="glass-1 flex min-h-24 items-center justify-center rounded-2xl px-5 py-6 text-center text-[0.8125rem] text-mist-500">
        {message}
      </div>
    </div>
  );
}

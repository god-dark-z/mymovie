import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils/cn';

/**
 * Rail / section title with an optional "see all" affordance. Kept as a server
 * component so rails render without shipping JS for their headings.
 */
export function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = 'See all',
  className,
  as: Heading = 'h2',
  id,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
  id?: string;
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <Heading
          id={id}
          className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-white md:text-xl"
        >
          {title}
        </Heading>
        {subtitle ? <p className="mt-1 truncate text-xs text-mist-500 md:text-[0.8125rem]">{subtitle}</p> : null}
      </div>

      {href ? (
        <Link
          href={href}
          className="tap group inline-flex h-11 shrink-0 items-center gap-1 rounded-full px-3 text-xs font-medium text-mist-400 transition-colors duration-200 md:h-8 md:hover:text-white"
        >
          {linkLabel}
          <ChevronRightIcon className="size-3.5 transition-transform duration-200 md:group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils/cn';

/**
 * Horizontal content rail.
 *
 * Touch devices just swipe (native momentum, snap points). Pointer devices also
 * get edge arrows, which only appear when there is actually something to scroll
 * to — so a short rail never shows a dead control.
 */
export function Rail({
  title,
  subtitle,
  href,
  linkLabel = 'See all',
  children,
  className,
  ariaLabel,
}: {
  title?: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    setEdges({ start: node.scrollLeft > 8, end: max > 8 && node.scrollLeft < max - 8 });
  }, []);

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    measure();
    node.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of Array.from(node.children)) observer.observe(child);
    return () => {
      node.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [measure]);

  const nudge = (direction: -1 | 1) => {
    const node = scroller.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth * 0.82, behavior: 'smooth' });
  };

  return (
    <section className={cn('group/rail relative', className)} aria-label={ariaLabel ?? title}>
      {title ? (
        <div className="gutter-x flex items-end justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-white md:text-xl">
              {title}
            </h2>
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
      ) : null}

      <div className="relative mt-3.5 md:mt-4">
        <div ref={scroller} className="rail gutter-x scroll-px-(--gutter)">
          {children}
        </div>

        <RailArrow side="start" visible={edges.start} onClick={() => nudge(-1)} />
        <RailArrow side="end" visible={edges.end} onClick={() => nudge(1)} />
      </div>
    </section>
  );
}

function RailArrow({
  side,
  visible,
  onClick,
}: {
  side: 'start' | 'end';
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      onClick={onClick}
      className={cn(
        'glass-flat absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full text-white transition duration-200 ease-glass md:flex',
        'opacity-0 group-hover/rail:opacity-100 hover:bg-white/14',
        side === 'start' ? 'left-2 lg:left-3' : 'right-2 lg:right-3',
        visible ? 'pointer-events-auto' : 'pointer-events-none !opacity-0',
      )}
    >
      {side === 'start' ? <ChevronLeftIcon className="size-5" /> : <ChevronRightIcon className="size-5" />}
    </button>
  );
}

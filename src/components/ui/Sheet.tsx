'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from '@/components/ui/Icons';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useMounted } from '@/hooks/useMounted';
import { cn } from '@/lib/utils/cn';
import { FOCUSABLE_SELECTOR, focusablesIn, wrapTabFocus } from '@/lib/utils/focus';

/**
 * One modal surface for the whole app: a bottom sheet on phones, a centred
 * dialog from `md` up. Handles the things that are easy to get wrong in a
 * WebView — background scroll chaining, safe-area padding, focus containment
 * and Escape — so no caller has to.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const mounted = useMounted();
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const [drag, setDrag] = useState(0);
  const dragStart = useRef<number | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useBodyScrollLock(open);

  // Remember what opened the sheet so focus can go home when it closes.
  useEffect(() => {
    if (!open) return;
    restoreTo.current = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? node)?.focus({ preventScroll: true });
    return () => {
      restoreTo.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const node = panel.current;
      if (!node) return;
      // A sheet with nothing focusable still has to hold focus, or Tab walks into
      // the page behind a surface that claims to be modal.
      if (!wrapTabFocus(event, node)) {
        if (focusablesIn(node).length === 0) {
          event.preventDefault();
          node.focus({ preventScroll: true });
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) setDrag(0);
  }, [open]);

  if (!mounted || !open) return null;

  const widths = { sm: 'md:max-w-sm', md: 'md:max-w-md', lg: 'md:max-w-xl' } as const;

  return createPortal(
    <div className="fixed inset-0 z-90 flex items-end justify-center md:items-center" onKeyDown={onKeyDown}>
      {/* The panel is `glass-3`, so it follows the reduce-transparency switch through
          the shared tokens. This scrim paints with utilities, so it opts in itself. */}
      <button
        type="button"
        aria-label="Close"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in cursor-default bg-ink-950/72 backdrop-blur-[3px] solid:bg-ink-950! solid:backdrop-blur-none!"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}
        className={cn(
          'glass-3 relative flex max-h-[86svh] w-full animate-sheet-in flex-col rounded-t-3xl outline-none',
          'md:max-h-[80svh] md:animate-pop-in md:rounded-3xl',
          widths[size],
          drag ? 'transition-none' : 'transition-transform duration-200 ease-glass',
          className,
        )}
      >
        <div
          className="shrink-0 px-5 pt-3 pb-4 md:px-6 md:pt-5"
          onTouchStart={(event) => {
            dragStart.current = event.touches[0]?.clientY ?? null;
          }}
          onTouchMove={(event) => {
            if (dragStart.current === null) return;
            const delta = (event.touches[0]?.clientY ?? 0) - dragStart.current;
            setDrag(Math.max(0, delta));
          }}
          onTouchEnd={() => {
            if (drag > 96) onClose();
            else setDrag(0);
            dragStart.current = null;
          }}
        >
          <div className="mx-auto mb-3.5 h-1 w-9 rounded-full bg-white/22 md:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="font-display text-[1.0625rem] font-semibold tracking-[-0.01em] text-white md:text-lg"
              >
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1.5 text-[0.8125rem] leading-relaxed text-mist-500">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap -mt-1 -mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-mist-400 transition-colors duration-200 hover:bg-white/8 hover:text-white"
            >
              <CloseIcon className="size-4.5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-2 md:px-6">{children}</div>

        {/* Always present: this is also what keeps the sheet clear of the Android gesture bar. */}
        <div className={cn('shrink-0 px-5 pb-safe-b md:px-6', footer ? 'pt-3' : '')}>
          <div className="pb-4">{footer}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

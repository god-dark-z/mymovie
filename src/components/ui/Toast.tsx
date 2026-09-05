'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckIcon, InfoIcon } from '@/components/ui/Icons';
import { cn } from '@/lib/utils/cn';

type ToastTone = 'neutral' | 'success';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  toast: (message: string, options?: { tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastApi | null>(null);
const LIFETIME_MS = 2600;
const MAX_VISIBLE = 3;

/**
 * Lightweight confirmations for actions the user just took (saved to My List,
 * server switched). Never used to report playback state, which we cannot observe.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback<ToastApi['toast']>(
    (message, options) => {
      const id = nextId.current++;
      setItems((current) => [...current, { id, message, tone: options?.tone ?? 'neutral' }].slice(-MAX_VISIBLE));
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), LIFETIME_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending.values()) clearTimeout(timer);
      pending.clear();
    };
  }, []);

  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 px-4 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] md:items-end md:px-7 md:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
      >
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => dismiss(item.id)}
            className={cn(
              'glass-3 pointer-events-auto flex max-w-[min(26rem,92vw)] animate-rise items-center gap-2.5 rounded-full py-2.5 pr-4 pl-3.5 text-left text-[0.8125rem] font-medium text-white',
              'shadow-[0_16px_40px_-20px_rgba(0,0,0,0.9)]',
            )}
          >
            <span className={cn('shrink-0', item.tone === 'success' ? 'text-ruby-300' : 'text-mist-400')}>
              {item.tone === 'success' ? <CheckIcon className="size-4" /> : <InfoIcon className="size-4" />}
            </span>
            <span className="min-w-0">{item.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/** Safe to call outside a provider — it just no-ops rather than throwing. */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  return context ?? { toast: () => undefined };
}

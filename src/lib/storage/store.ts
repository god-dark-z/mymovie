/**
 * Local persistence primitives.
 *
 * Everything user-owned (watchlist, recent searches, recently watched, playback
 * preferences) lives behind this tiny store so it can later be swapped for an
 * authenticated backend: swap the read/write pair, keep the hooks.
 *
 * Design notes:
 *  - values are versioned, so a schema change degrades to "empty" instead of a crash
 *  - the parsed value is cached, which keeps `useSyncExternalStore` snapshots
 *    referentially stable
 *  - writes broadcast in-tab (custom event) and cross-tab (`storage` event)
 */

const NAMESPACE = 'cineora';
const CHANGE_EVENT = 'cineora:store-change';

export interface PersistentStore<T> {
  readonly key: string;
  get(): T;
  set(next: T): void;
  update(mutate: (current: T) => T): T;
  clear(): void;
  subscribe(listener: () => void): () => void;
  /** Stable snapshot used during server rendering and first hydration. */
  getServerSnapshot(): T;
}

interface Envelope<T> {
  v: number;
  d: T;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function createStore<T>(options: {
  name: string;
  version: number;
  fallback: T;
  /** Validates and repairs a parsed payload; return null to reject it. */
  parse: (value: unknown) => T | null;
}): PersistentStore<T> {
  const { name, version, fallback, parse } = options;
  const key = `${NAMESPACE}:${name}:v${version}`;

  let cache: T = fallback;
  let loaded = false;
  const listeners = new Set<() => void>();

  function read(): T {
    if (!isBrowser()) return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      const envelope = JSON.parse(raw) as Envelope<unknown>;
      if (!envelope || envelope.v !== version) return fallback;
      return parse(envelope.d) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function write(next: T): void {
    cache = next;
    loaded = true;
    if (isBrowser()) {
      try {
        const envelope: Envelope<T> = { v: version, d: next };
        window.localStorage.setItem(key, JSON.stringify(envelope));
      } catch {
        // Storage can be full or blocked (private mode, locked-down WebView).
        // The in-memory value still works for this session.
      }
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
    }
    emit();
  }

  return {
    key,
    get(): T {
      if (!loaded) {
        cache = read();
        loaded = true;
      }
      return cache;
    },
    set(next: T): void {
      write(next);
    },
    update(mutate: (current: T) => T): T {
      const next = mutate(this.get());
      write(next);
      return next;
    },
    clear(): void {
      if (isBrowser()) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
      cache = fallback;
      loaded = true;
      emit();
    },
    subscribe(listener: () => void): () => void {
      listeners.add(listener);

      const onExternalChange = (event: Event) => {
        if (event instanceof StorageEvent) {
          if (event.key !== null && event.key !== key) return;
        } else if (event instanceof CustomEvent && event.detail !== key) {
          return;
        }
        cache = read();
        loaded = true;
        listener();
      };

      if (isBrowser()) {
        window.addEventListener('storage', onExternalChange);
        window.addEventListener(CHANGE_EVENT, onExternalChange);
      }

      return () => {
        listeners.delete(listener);
        if (isBrowser()) {
          window.removeEventListener('storage', onExternalChange);
          window.removeEventListener(CHANGE_EVENT, onExternalChange);
        }
      };
    },
    getServerSnapshot(): T {
      return fallback;
    },
  };
}

/** Narrowing helpers used by the `parse` validators below. */
export function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

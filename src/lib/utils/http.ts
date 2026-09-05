/**
 * Small fetch wrapper used by every metadata provider.
 *
 * Responsibilities:
 *  - hard timeout so a hanging upstream never blocks a page render
 *  - identical requests inside one render pass are de-duplicated by Next's
 *    fetch cache, and `revalidate` gives us shared server-side caching
 *  - upstream failures surface as `ProviderError`, never as raw JSON or stack
 *    traces reaching the UI
 */

export class ProviderError extends Error {
  readonly status: number;
  readonly provider: string;

  constructor(provider: string, message: string, status = 0) {
    super(message);
    this.name = 'ProviderError';
    this.provider = provider;
    this.status = status;
  }
}

export interface JsonRequestOptions {
  /** Seconds the response may be reused from the server-side cache. */
  revalidate?: number;
  /** Hard timeout in milliseconds. */
  timeoutMs?: number;
  /** Label used in error messages. */
  provider?: string;
  /** Cache tag, so specific data can be revalidated later. */
  tags?: string[];
}

const DEFAULT_TIMEOUT_MS = 9_000;

export async function fetchJson<T>(url: string, options: JsonRequestOptions = {}): Promise<T> {
  const { revalidate = 300, timeoutMs = DEFAULT_TIMEOUT_MS, provider = 'upstream', tags } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
      next: tags && tags.length > 0 ? { revalidate, tags } : { revalidate },
    });

    if (!response.ok) {
      throw new ProviderError(provider, `${provider} responded with ${response.status}`, response.status);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProviderError(provider, `${provider} timed out after ${timeoutMs}ms`, 504);
    }
    throw new ProviderError(provider, error instanceof Error ? error.message : 'Unknown upstream failure');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Runs a task and resolves to `fallback` when it throws. Used so one broken rail
 * never takes down a whole page.
 */
export async function safe<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await task();
  } catch {
    return fallback;
  }
}

import { ApiError } from '@/lib/auth/client';

/**
 * Turns whatever a request threw into something a form can render.
 *
 * Forms should not each decide how to word a rate limit or what to do with an
 * unexpected exception, so the translation lives here once. Nothing from the
 * original error object reaches the page — no stack, no cause, no upstream body.
 */

export interface FormFailure {
  /** Shown in the form-level alert. */
  message: string;
  /** Keyed by field name, matching the `name` on each input. */
  fields: Record<string, string>;
  /** True when the account system itself is unavailable, so the form is pointless. */
  unavailable: boolean;
}

const UNEXPECTED = 'Something went wrong. Try again in a moment.';

function waitFor(seconds: number): string {
  if (seconds <= 60) return `${Math.max(1, Math.ceil(seconds))} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? 'a minute' : `${minutes} minutes`;
}

export function toFailure(error: unknown): FormFailure {
  if (!(error instanceof ApiError)) {
    return { message: UNEXPECTED, fields: {}, unavailable: false };
  }

  if (error.status === 429) {
    const wait = error.retryAfter ? ` Try again in ${waitFor(error.retryAfter)}.` : '';
    return {
      message: `${error.message}${wait}`,
      fields: error.fields,
      unavailable: false,
    };
  }

  return {
    message: error.message,
    fields: error.fields,
    unavailable: error.isUnavailable,
  };
}

/** Empty state, so a form can reset without constructing the shape by hand. */
export const NO_FAILURE: FormFailure = { message: '', fields: {}, unavailable: false };

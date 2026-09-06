/**
 * The error type every API route throws.
 *
 * Routes never build error responses by hand. They throw one of these and the
 * wrapper in `respond.ts` turns it into a body of the documented shape, which is
 * what makes error handling consistent across twenty endpoints — and what keeps a
 * stack trace or a storage driver's message from ever reaching a browser.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  readonly retryAfter?: number;

  constructor(
    status: number,
    code: string,
    message: string,
    extra?: { fields?: Record<string, string>; retryAfter?: number },
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.fields = extra?.fields;
    this.retryAfter = extra?.retryAfter;
  }
}

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, 'bad_request', message, { fields });

export const invalidInput = (fields: Record<string, string>) =>
  new HttpError(422, 'invalid_input', 'Please check the highlighted fields.', { fields });

export const unauthorized = (message = 'Sign in to continue.') =>
  new HttpError(401, 'unauthorized', message);

export const forbidden = (message = 'You do not have access to that.') =>
  new HttpError(403, 'forbidden', message);

/**
 * The double-submit pair did not match.
 *
 * Given its own code so the client can tell "your tab has been open for a day"
 * apart from a real permission failure, refresh the token, and retry once instead
 * of showing the user an error they cannot act on.
 */
export const csrfFailed = () =>
  new HttpError(403, 'csrf_invalid', 'Your session token expired. Reload the page and try again.');

export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);

export const conflict = (code: string, message: string, fields?: Record<string, string>) =>
  new HttpError(409, code, message, { fields });

export const tooManyRequests = (retryAfter: number, message?: string) =>
  new HttpError(429, 'rate_limited', message ?? 'Too many attempts. Try again shortly.', { retryAfter });

export const payloadTooLarge = (message = 'That request is too large.') =>
  new HttpError(413, 'payload_too_large', message);

/**
 * Accounts are switched off because the deployment has not been configured.
 *
 * A 503 rather than a 404: the endpoint exists, the operator has not finished
 * setting it up, and saying so plainly is more useful than pretending otherwise.
 */
export const notConfigured = () =>
  new HttpError(503, 'accounts_disabled', 'Accounts are not available on this deployment yet.');

export const storageDown = () =>
  new HttpError(503, 'storage_unavailable', 'Account storage is temporarily unavailable. Try again shortly.');

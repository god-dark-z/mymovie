/**
 * Server logging.
 *
 * There is one rule: a log line may describe a failure but must never contain a
 * credential, a token or a person's address. Rather than audit every message that
 * could reach a log — third-party libraries quote server replies, and those replies
 * sometimes include the authenticating address — the redaction below is applied
 * unconditionally to anything derived from an error.
 */

/** Masks addresses and long opaque strings, then truncates. */
export function redact(message: string): string {
  return message
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, '<email>')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '<redacted>')
    .slice(0, 300);
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return redact(`${error.name}: ${error.message}`);
  return 'unknown error';
}

export function logFailure(scope: string, error: unknown): void {
  console.error(`[cineora] ${scope} — ${describeError(error)}`);
}

export function logInfo(scope: string, message: string): void {
  console.info(`[cineora] ${scope} — ${message}`);
}

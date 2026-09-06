import { describeDevice } from '@/server/auth/device';
import { newToken, newVerificationCode } from '@/server/crypto/tokens';
import { tokens } from '@/server/data/tokens';
import type { UserRecord } from '@/server/data/types';
import { serverConfig } from '@/server/env';
import { userAgent } from '@/server/http/request';
import { SITE } from '@/lib/site';
import { deliver, isOutboxMode } from '@/server/mail/transport';
import {
  accountDeletedMail,
  formatAt,
  newSignInMail,
  passwordChangedMail,
  passwordResetMail,
  signupAttemptMail,
  verificationMail,
  welcomeMail,
} from '@/server/mail/templates';

/**
 * The bridge between an account action and the message it sends.
 *
 * Token issuing lives here rather than in a route, so a verification link is
 * created and mailed in one step and there is no way to write a route that mints a
 * token and forgets to invalidate the previous one.
 */

/**
 * Long enough that an email delayed by a few minutes is still usable, short enough
 * that a link sitting in an unattended inbox stops working the same hour.
 */
const VERIFY_TTL_MINUTES = 60;
/** Shorter, because this one is a live path to changing the password. */
const RESET_TTL_MINUTES = 30;

/**
 * Base URL for links in outgoing mail.
 *
 * The `Host` header is attacker-controlled, and a password reset link built from it
 * is the classic host-header injection: a request with a forged host mails the
 * victim a link pointing at the attacker's copy of the site. So the request's own
 * host is used only when it matches the configured site, an explicitly allowed
 * origin, or localhost during development. Anything else falls back to the
 * canonical URL, which means a forged request produces a correct link.
 */
function mailBaseUrl(request?: Request): string {
  if (!request) return SITE.url;

  const host = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ?? request.headers.get('host');
  if (!host) return SITE.url;

  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? 'https';
  const candidate = `${proto}://${host.toLowerCase()}`;

  const canonicalHost = (() => {
    try {
      return new URL(SITE.url).host.toLowerCase();
    } catch {
      return '';
    }
  })();

  if (host.toLowerCase() === canonicalHost) return candidate;
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host.toLowerCase())) return candidate;

  const allowed = (process.env.CINEORA_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase().replace(/\/+$/, ''))
    .filter(Boolean);
  if (allowed.includes(candidate)) return candidate;

  return SITE.url;
}

export interface VerificationSend {
  delivered: boolean;
  /** Present only in outbox mode, so local development can complete the flow. */
  devUrl?: string;
  code: string;
}

/**
 * Issues a verification token and mails both a link and a typeable code.
 *
 * Two forms of the same secret: the link is one tap on the device that opened the
 * email, the code covers the case where mail is read on a phone and the account was
 * created on a laptop. Both are single-use and both die with the same record.
 */
export async function sendVerification(user: UserRecord, request?: Request): Promise<VerificationSend> {
  const token = newToken();
  const code = newVerificationCode();

  await tokens.issue({
    userId: user.id,
    purpose: 'email-verification',
    token,
    code,
    ttlSeconds: VERIFY_TTL_MINUTES * 60,
  });

  const url = `${mailBaseUrl(request)}/verify-email?token=${encodeURIComponent(token)}`;
  const message = verificationMail({
    displayName: user.displayName,
    url,
    code,
    expiresMinutes: VERIFY_TTL_MINUTES,
  });

  const result = await deliver({ ...message, to: user.email });
  return {
    delivered: result.delivered,
    // The URL is returned to the client only when mail is being written to disk
    // rather than sent, which `accountsStatus()` prevents in production.
    devUrl: isOutboxMode() ? url : undefined,
    code,
  };
}

export async function sendWelcome(user: UserRecord, request?: Request): Promise<void> {
  const message = welcomeMail({ displayName: user.displayName, url: `${mailBaseUrl(request)}/` });
  await deliver({ ...message, to: user.email });
}

export interface ResetSend {
  delivered: boolean;
  devUrl?: string;
}

export async function sendPasswordReset(user: UserRecord, request: Request): Promise<ResetSend> {
  const token = newToken();
  await tokens.issue({
    userId: user.id,
    purpose: 'password-reset',
    token,
    ttlSeconds: RESET_TTL_MINUTES * 60,
  });

  const url = `${mailBaseUrl(request)}/reset-password?token=${encodeURIComponent(token)}`;
  const message = passwordResetMail({
    displayName: user.displayName,
    url,
    expiresMinutes: RESET_TTL_MINUTES,
    device: describeDevice(userAgent(request)),
  });

  const result = await deliver({ ...message, to: user.email });
  return { delivered: result.delivered, devUrl: isOutboxMode() ? url : undefined };
}

/**
 * Password change notice.
 *
 * Sent regardless of notification preferences. Someone who has taken over an
 * account would otherwise silence the one message that reveals it, so this is not
 * an opt-out — and the message itself says why it arrived.
 */
export async function sendPasswordChanged(user: UserRecord, request: Request): Promise<void> {
  const message = passwordChangedMail({
    displayName: user.displayName,
    device: describeDevice(userAgent(request)),
    at: formatAt(Date.now(), user.preferences.timezone),
    manageUrl: `${mailBaseUrl(request)}/account/security`,
  });
  await deliver({ ...message, to: user.email });
}

/** Respects the account-activity preference; a new device is a notice, not an alarm. */
export async function sendNewSignIn(user: UserRecord, request: Request): Promise<void> {
  if (!user.preferences.notifications.accountActivity) return;
  const message = newSignInMail({
    displayName: user.displayName,
    device: describeDevice(userAgent(request)),
    at: formatAt(Date.now(), user.preferences.timezone),
    manageUrl: `${mailBaseUrl(request)}/account/security`,
  });
  await deliver({ ...message, to: user.email });
}

/**
 * Tells the owner of an address that someone tried to register with it.
 *
 * The registration endpoint cannot say "already taken" without becoming an
 * account-existence oracle, so this is where that fact goes: to the person who
 * actually controls the mailbox.
 */
export async function sendSignupAttempt(user: UserRecord, request: Request): Promise<void> {
  const message = signupAttemptMail({
    displayName: user.displayName,
    device: describeDevice(userAgent(request)),
    at: formatAt(Date.now(), user.preferences.timezone),
  });
  await deliver({ ...message, to: user.email });
}

export async function sendAccountDeleted(user: UserRecord): Promise<void> {
  const message = accountDeletedMail({
    displayName: user.displayName,
    at: formatAt(Date.now(), user.preferences.timezone),
  });
  await deliver({ ...message, to: user.email });
}

/** Exposed so the sign-up screen can state how long a code lasts. */
export const MAIL_TTL = {
  verifyMinutes: VERIFY_TTL_MINUTES,
  resetMinutes: RESET_TTL_MINUTES,
} as const;

/** True when SMTP is configured, used to decide what to tell the operator. */
export function mailConfigured(): boolean {
  return serverConfig().emailMode === 'smtp';
}

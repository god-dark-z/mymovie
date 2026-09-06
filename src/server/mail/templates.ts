import { renderMail, type MailDocument, type RenderedMail } from '@/server/mail/render';
import { serverConfig } from '@/server/env';

/**
 * The messages Cineora sends.
 *
 * Each one states plainly what happened, what to do, and what to do if it was not
 * you. None of them contains a password — not the one you chose, not a temporary
 * one — because a password sent by email is a password stored in an inbox forever.
 * Security notices carry no link to click, so that a phishing copy of one has
 * nothing to imitate.
 */

interface Recipient {
  displayName: string;
}

function support(): readonly string[] {
  const config = serverConfig();
  return [
    `Questions? Reply to this message or write to ${config.supportEmail}.`,
    'Cineora will never ask for your password, and never sends it by email.',
  ];
}

/** A readable timestamp in the account's own timezone, with the zone named. */
export function formatAt(at: number, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(at)) + ` (${timeZone})`;
  } catch {
    // An unrecognised zone from an old record must not stop a security email.
    return `${new Date(at).toISOString().replace('T', ' ').slice(0, 16)} (UTC)`;
  }
}

const render = (document: MailDocument): RenderedMail => renderMail(document);

export interface VerificationMailInput extends Recipient {
  url: string;
  code: string;
  expiresMinutes: number;
}

export function verificationMail(input: VerificationMailInput): RenderedMail {
  return render({
    subject: 'Confirm your email address',
    preheader: `Your Cineora code is ${input.code}.`,
    heading: `Welcome, ${input.displayName}`,
    blocks: [
      {
        kind: 'text',
        text: 'Confirm this address to finish setting up your Cineora account. It keeps your watchlist and settings recoverable if you ever lose access.',
      },
      { kind: 'button', label: 'Confirm email address', href: input.url },
      { kind: 'code', value: input.code, caption: 'Or enter this code on the confirmation screen:' },
      { kind: 'fallback', href: input.url },
      {
        kind: 'text',
        tone: 'muted',
        text: `The link and the code both stop working in ${input.expiresMinutes} minutes, and each can be used once.`,
      },
      { kind: 'divider' },
      {
        kind: 'text',
        tone: 'muted',
        text: 'If you did not create a Cineora account, you can ignore this message — nothing was set up without this step.',
      },
    ],
    footer: support(),
  });
}

export interface WelcomeMailInput extends Recipient {
  url: string;
}

export function welcomeMail(input: WelcomeMailInput): RenderedMail {
  return render({
    subject: 'Your Cineora account is ready',
    preheader: 'Your email is confirmed. Here is what you can do now.',
    heading: 'You are all set',
    blocks: [
      { kind: 'text', text: `Your email address is confirmed, ${input.displayName}. Your account is fully active.` },
      {
        kind: 'facts',
        rows: [
          ['Watchlist', 'Saved to your account'],
          ['Playback preferences', 'Server, language and subtitles remembered'],
          ['Security', 'Sign-in history and device management'],
        ],
      },
      { kind: 'button', label: 'Open Cineora', href: input.url },
      {
        kind: 'text',
        tone: 'muted',
        text: 'You can change what Cineora stores, or delete your account entirely, from Account settings at any time.',
      },
    ],
    footer: support(),
  });
}

export interface PasswordResetMailInput extends Recipient {
  url: string;
  expiresMinutes: number;
  device: string;
}

export function passwordResetMail(input: PasswordResetMailInput): RenderedMail {
  return render({
    subject: 'Reset your Cineora password',
    preheader: 'A password reset was requested for your account.',
    heading: 'Choose a new password',
    blocks: [
      { kind: 'text', text: `A password reset was requested for your Cineora account, ${input.displayName}.` },
      { kind: 'button', label: 'Set a new password', href: input.url },
      { kind: 'fallback', href: input.url },
      {
        kind: 'text',
        tone: 'muted',
        text: `This link expires in ${input.expiresMinutes} minutes and works once. Requesting another reset replaces it.`,
      },
      { kind: 'facts', rows: [['Requested from', input.device]] },
      { kind: 'divider' },
      {
        kind: 'notice',
        text: 'If this was not you, ignore this email. Your password has not changed, and nobody can reset it without this link.',
      },
    ],
    footer: support(),
  });
}

export interface SecurityNoticeInput extends Recipient {
  device: string;
  at: string;
  manageUrl: string;
}

export function passwordChangedMail(input: SecurityNoticeInput): RenderedMail {
  return render({
    subject: 'Your Cineora password was changed',
    preheader: 'Confirming a password change on your account.',
    heading: 'Your password was changed',
    blocks: [
      { kind: 'text', text: `${input.displayName}, the password on your Cineora account was just changed.` },
      {
        kind: 'facts',
        rows: [
          ['When', input.at],
          ['Device', input.device],
        ],
      },
      {
        kind: 'text',
        text: 'Every other signed-in device was signed out as part of the change, so anyone using an old password loses access immediately.',
      },
      { kind: 'divider' },
      {
        kind: 'notice',
        text: 'If this was not you, reset your password now from the Cineora sign-in screen and review your devices in Account settings.',
      },
    ],
    footer: support(),
  });
}

export function newSignInMail(input: SecurityNoticeInput): RenderedMail {
  return render({
    subject: 'New sign-in to your Cineora account',
    preheader: `Signed in from ${input.device}.`,
    heading: 'New sign-in detected',
    blocks: [
      { kind: 'text', text: `${input.displayName}, your Cineora account was signed in on a device we have not seen before.` },
      {
        kind: 'facts',
        rows: [
          ['When', input.at],
          ['Device', input.device],
        ],
      },
      {
        kind: 'text',
        tone: 'muted',
        text: 'Device names come from the browser and are approximate. If it looks like yours, no action is needed.',
      },
      { kind: 'divider' },
      {
        kind: 'notice',
        text: 'Not you? Change your password and sign out other devices from Account settings, then review your recent activity.',
      },
    ],
    footer: support(),
  });
}

/**
 * Sent when someone tries to register with an address that already has an account.
 *
 * The registration endpoint answers identically whether or not the address is
 * taken, so it cannot be used to discover who has an account. This message is how
 * the actual owner finds out, and it deliberately offers no link to click: the two
 * things they might need — signing in and resetting a password — are reached from
 * the site they already know.
 */
export function signupAttemptMail(input: Recipient & { device: string; at: string }): RenderedMail {
  return render({
    subject: 'Someone tried to sign up with your email address',
    preheader: 'Your existing Cineora account was not changed.',
    heading: 'This address already has an account',
    blocks: [
      {
        kind: 'text',
        text: `${input.displayName}, someone just tried to create a new Cineora account using this email address. Your existing account is untouched and no new account was created.`,
      },
      {
        kind: 'facts',
        rows: [
          ['When', input.at],
          ['Device', input.device],
        ],
      },
      {
        kind: 'text',
        text: 'If that was you, sign in with your existing password instead. If you have forgotten it, use "Forgot password" on the sign-in screen.',
      },
      { kind: 'divider' },
      {
        kind: 'text',
        tone: 'muted',
        text: 'If it was not you, no action is needed — whoever tried does not have access to your account. Consider changing your password if you reuse it elsewhere.',
      },
    ],
    footer: support(),
  });
}

export function accountDeletedMail(input: Recipient & { at: string }): RenderedMail {
  return render({
    subject: 'Your Cineora account was deleted',
    preheader: 'Confirming that your account and its data were removed.',
    heading: 'Your account is gone',
    blocks: [
      { kind: 'text', text: `${input.displayName}, your Cineora account was deleted on ${input.at}.` },
      {
        kind: 'text',
        text: 'Your profile, watchlist, preferences, sessions and activity log were removed from our storage. This message is the last one you will receive.',
      },
      {
        kind: 'text',
        tone: 'muted',
        text: 'You are welcome back at any time — signing up again creates a fresh account rather than restoring this one.',
      },
    ],
    footer: [`If you did not ask for this, write to ${serverConfig().supportEmail} straight away.`],
  });
}

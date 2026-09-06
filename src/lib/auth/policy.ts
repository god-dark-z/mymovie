/**
 * Account rules that both sides of the wire agree on.
 *
 * This module is deliberately free of secrets and of server imports so the sign-up
 * form and the API route can share one definition of "is this password acceptable".
 * The client copy exists to give instant feedback; the server copy is the one that
 * decides. They can never disagree, because there is only one.
 */

export const LIMITS = {
  emailMax: 254,
  passwordMin: 10,
  // Long passphrases are the good case. The ceiling exists only so a megabyte of
  // text cannot be pushed through a deliberately slow hash function.
  passwordMax: 200,
  displayNameMin: 2,
  displayNameMax: 48,
  usernameMin: 3,
  usernameMax: 24,
  bioMax: 240,
} as const;

/**
 * Pragmatic address check.
 *
 * Full RFC 5322 is not worth implementing, and a regex cannot tell you whether an
 * address receives mail — the verification email does that. This rejects the
 * shapes that are certainly wrong and nothing else.
 */
const EMAIL_RE = /^[^\s@"'<>();:,\\]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;

export function isValidEmail(value: string): boolean {
  return value.length <= LIMITS.emailMax && EMAIL_RE.test(value);
}

export const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_.]*[a-z0-9])?$/;

export function usernameProblem(value: string): string | null {
  if (value.length < LIMITS.usernameMin) return `At least ${LIMITS.usernameMin} characters.`;
  if (value.length > LIMITS.usernameMax) return `At most ${LIMITS.usernameMax} characters.`;
  if (!USERNAME_RE.test(value)) return 'Letters, numbers, dots and underscores only.';
  if (value.includes('..')) return 'No repeated dots.';
  if (RESERVED_USERNAMES.has(value)) return 'That handle is reserved.';
  return null;
}

/** Handles that would collide with a route or impersonate the service. */
const RESERVED_USERNAMES = new Set([
  'cineora', 'admin', 'administrator', 'root', 'support', 'help', 'staff', 'team',
  'moderator', 'mod', 'system', 'security', 'billing', 'account', 'accounts',
  'login', 'signup', 'signin', 'logout', 'settings', 'download', 'downloads',
  'api', 'auth', 'search', 'movies', 'series', 'anime', 'watch', 'me', 'null',
  'undefined', 'official', 'verified',
]);

/**
 * Passwords that a real attacker tries in the first hundred guesses.
 *
 * A short embedded list is honest about what it is: not a substitute for rate
 * limiting and slow hashing, just a way to stop the very worst choices. Shipping a
 * hundred-thousand-entry dictionary into a client bundle would cost more than it
 * catches.
 */
const WEAK = new Set([
  'password', 'password1', 'password123', 'passw0rd', '12345678', '123456789',
  '1234567890', 'qwertyuiop', 'qwerty123', 'letmein123', 'iloveyou', 'welcome1',
  'welcome123', 'admin123', 'football1', 'sunshine1', 'princess1', 'trustno1',
  'monkey123', 'dragon123', 'baseball1', 'starwars1', 'superman1', 'whatever1',
  'abc12345', 'aaaaaaaa', 'asdfghjkl', 'zxcvbnm123', 'cineora123', 'netflix123',
]);

const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', '01234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

function hasRun(lower: string): boolean {
  for (const sequence of SEQUENCES) {
    for (let i = 0; i + 4 <= sequence.length; i += 1) {
      const run = sequence.slice(i, i + 4);
      if (lower.includes(run) || lower.includes([...run].reverse().join(''))) return true;
    }
  }
  return false;
}

export interface PasswordContext {
  email?: string;
  displayName?: string;
  username?: string;
}

/**
 * The hard gate. A non-null result is a refusal, and the string is shown as-is.
 *
 * Composition rules ("one uppercase, one symbol") are deliberately absent: they
 * push people towards `Password1!` and are no longer recommended. Length, plus
 * rejecting the passwords that are actually guessed, does more.
 */
export function passwordProblem(password: string, context: PasswordContext = {}): string | null {
  if (password.length < LIMITS.passwordMin) {
    return `Use at least ${LIMITS.passwordMin} characters.`;
  }
  if (password.length > LIMITS.passwordMax) {
    return `Use at most ${LIMITS.passwordMax} characters.`;
  }
  if (/^\s|\s$/.test(password)) {
    return 'Remove the space at the start or end.';
  }
  const lower = password.toLowerCase();
  if (WEAK.has(lower)) {
    return 'That password is one of the most commonly guessed. Choose another.';
  }
  if (new Set(lower).size <= 3) {
    return 'That is too repetitive. Mix in more variety.';
  }
  const local = context.email?.split('@')[0]?.toLowerCase() ?? '';
  for (const personal of [local, context.username?.toLowerCase() ?? '', context.displayName?.toLowerCase() ?? '']) {
    if (personal.length >= 4 && lower.includes(personal)) {
      return 'Do not use your name or email address in your password.';
    }
  }
  return null;
}

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export interface PasswordAssessment {
  strength: PasswordStrength;
  label: string;
  /** Concrete, actionable suggestions. Empty once the password is strong. */
  hints: string[];
}

const LABELS: Record<PasswordStrength, string> = {
  0: 'Too weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Strong',
  4: 'Excellent',
};

/**
 * A rough strength estimate for the meter.
 *
 * This is presentational. It approximates how much variety and length a password
 * has; it does not claim to compute entropy, and a high score is never what allows
 * a password through — `passwordProblem` is.
 */
export function assessPassword(password: string, context: PasswordContext = {}): PasswordAssessment {
  const hints: string[] = [];
  if (password.length === 0) return { strength: 0, label: LABELS[0], hints: ['Aim for a memorable phrase.'] };

  const lower = password.toLowerCase();
  const classes =
    Number(/[a-z]/.test(password)) +
    Number(/[A-Z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^A-Za-z0-9]/.test(password));
  const unique = new Set(password).size;

  let points = 0;
  if (password.length >= 10) points += 1;
  if (password.length >= 14) points += 1;
  if (password.length >= 20) points += 1;
  if (classes >= 2) points += 1;
  if (classes >= 3) points += 1;
  if (unique >= 10) points += 1;

  if (WEAK.has(lower)) points = 0;
  if (hasRun(lower)) points -= 1;
  if (unique <= 4) points -= 2;

  const local = context.email?.split('@')[0]?.toLowerCase() ?? '';
  if (local.length >= 4 && lower.includes(local)) points -= 2;

  if (password.length < 14) hints.push('Longer is stronger — a short phrase beats a complex word.');
  if (classes < 3) hints.push('Mix in numbers or punctuation.');
  if (hasRun(lower)) hints.push('Avoid keyboard runs like "qwerty" or "1234".');

  const strength = Math.max(0, Math.min(4, points - 2)) as PasswordStrength;
  return { strength, label: LABELS[strength], hints: strength >= 3 ? [] : hints.slice(0, 2) };
}

export function displayNameProblem(value: string): string | null {
  if (value.length < LIMITS.displayNameMin) return `At least ${LIMITS.displayNameMin} characters.`;
  if (value.length > LIMITS.displayNameMax) return `At most ${LIMITS.displayNameMax} characters.`;
  // Control characters and bidirectional overrides can rewrite how a name renders
  // next to other people's names, so they are not accepted.
  if (/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/.test(value)) {
    return 'Remove unsupported characters.';
  }
  return null;
}

/** Text confirmation required before an account is destroyed. */
export const DELETE_CONFIRMATION = 'DELETE MY ACCOUNT';

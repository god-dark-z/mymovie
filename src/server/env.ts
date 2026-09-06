/**
 * Server-side configuration.
 *
 * Every secret this application uses is read here and nowhere else, so there is
 * exactly one place to audit. Nothing in this file may be imported from a client
 * component: the guard below turns a mistaken import into an immediate, obvious
 * failure instead of a secret shipped in a JavaScript bundle.
 *
 * Accounts are deliberately *optional*. Cineora's browsing, search and playback
 * surfaces still deploy with zero environment variables — if the account
 * variables are absent, the account endpoints answer "not configured" and the UI
 * hides sign-in, rather than the whole site failing to build. What we never do
 * is invent a session secret at runtime: that would silently forge sessions
 * that stop validating on the next cold start.
 */

if (typeof window !== 'undefined') {
  throw new Error('src/server/env.ts was imported from browser code.');
}

const trimmed = (value: string | undefined): string => (value ?? '').trim();

/** Reads a variable, treating blank as absent — Netlify's UI stores empties. */
const read = (name: string): string | undefined => {
  const value = trimmed(process.env[name]);
  return value.length > 0 ? value : undefined;
};

const readInt = (name: string, fallback: number): number => {
  const raw = read(name);
  if (raw === undefined) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readBool = (name: string, fallback: boolean): boolean => {
  const raw = read(name)?.toLowerCase();
  if (raw === undefined) return fallback;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
};

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/** True inside Netlify build and Netlify Functions. Netlify sets both. */
export const ON_NETLIFY = Boolean(read('NETLIFY') ?? read('NETLIFY_LOCAL'));

export type DataDriver = 'blobs' | 'fs' | 'memory';

const resolveDataDriver = (): DataDriver => {
  const explicit = read('CINEORA_DATA_DRIVER')?.toLowerCase();
  if (explicit === 'blobs' || explicit === 'fs' || explicit === 'memory') return explicit;
  if (ON_NETLIFY) return 'blobs';
  return IS_PRODUCTION ? 'memory' : 'fs';
};

export type EmailMode = 'smtp' | 'outbox';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

export interface ServerConfig {
  dataDriver: DataDriver;
  /** Directory for the `fs` driver and the development outbox. */
  dataDir: string;
  blobsStore: string;
  sessionSecret: string | undefined;
  smtp: SmtpConfig | undefined;
  emailMode: EmailMode;
  mailFrom: string;
  supportEmail: string;
  /** Session lifetimes in seconds. */
  sessionTtl: number;
  rememberTtl: number;
  /**
   * The authorized download catalogue, as JSON. Absent means Cineora hands out
   * no files, which is the correct default: the schema is in
   * `docs/DOWNLOADS.md`, and every entry has to name the licence that permits
   * distribution. Asset URLs live here rather than in the repository because a
   * signed storage URL is a credential.
   */
  downloadCatalog: string | undefined;
}

let cached: ServerConfig | undefined;

export function serverConfig(): ServerConfig {
  if (cached) return cached;

  const smtpHost = read('SMTP_HOST');
  const smtpUser = read('SMTP_USER');
  const smtpPassword = read('SMTP_PASSWORD');
  const port = readInt('SMTP_PORT', 587);

  const smtp: SmtpConfig | undefined =
    smtpHost && smtpUser && smtpPassword
      ? {
          host: smtpHost,
          port,
          // Port 465 is implicit TLS; 587 is STARTTLS, which nodemailer
          // negotiates when `secure` is false. Overridable for odd relays.
          secure: readBool('SMTP_SECURE', port === 465),
          user: smtpUser,
          password: smtpPassword,
        }
      : undefined;

  const support = read('SUPPORT_EMAIL') ?? smtpUser ?? 'support@cineora.app';

  cached = Object.freeze({
    dataDriver: resolveDataDriver(),
    dataDir: read('CINEORA_DATA_DIR') ?? '.data',
    blobsStore: read('CINEORA_BLOBS_STORE') ?? 'cineora-accounts',
    sessionSecret: read('SESSION_SECRET'),
    smtp,
    // Without SMTP credentials, mail is written to the outbox instead of sent.
    // That is a development convenience, never a production fallback — see
    // `accountsStatus()`.
    emailMode: smtp ? 'smtp' : 'outbox',
    mailFrom: read('MAIL_FROM') ?? (smtpUser ? `Cineora <${smtpUser}>` : 'Cineora <no-reply@cineora.app>'),
    supportEmail: support,
    sessionTtl: readInt('CINEORA_SESSION_TTL', 60 * 60 * 24 * 7),
    rememberTtl: readInt('CINEORA_REMEMBER_TTL', 60 * 60 * 24 * 30),
    downloadCatalog: read('CINEORA_DOWNLOAD_CATALOG'),
  });

  return cached;
}

export interface AccountsStatus {
  enabled: boolean;
  /** Operator-facing explanations. Never rendered to an end user verbatim. */
  missing: string[];
}

/**
 * Whether this deployment can run accounts end to end.
 *
 * A session secret is non-negotiable. Mail is required in production only,
 * because the outbox driver genuinely completes the flow in development while
 * in production it would leave people unable to verify their address.
 */
export function accountsStatus(): AccountsStatus {
  const config = serverConfig();
  const missing: string[] = [];

  if (!config.sessionSecret || config.sessionSecret.length < 32) {
    missing.push('SESSION_SECRET (at least 32 characters)');
  }
  if (IS_PRODUCTION && !config.smtp) {
    missing.push('SMTP_HOST, SMTP_USER and SMTP_PASSWORD');
  }
  if (IS_PRODUCTION && config.dataDriver === 'memory') {
    missing.push('a durable data driver (CINEORA_DATA_DRIVER=blobs on Netlify)');
  }

  return { enabled: missing.length === 0, missing };
}

/** The secret, or a hard failure. Call only behind `accountsStatus().enabled`. */
export function sessionSecret(): string {
  const secret = serverConfig().sessionSecret;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is not configured.');
  }
  return secret;
}

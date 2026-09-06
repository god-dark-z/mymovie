import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Transporter } from 'nodemailer';
import { serverConfig } from '@/server/env';
import { logFailure, logInfo, redact } from '@/server/log';
import type { RenderedMail } from '@/server/mail/render';

/**
 * Mail delivery, in two modes.
 *
 * `smtp` is the real one, configured entirely from environment variables — the
 * host, the user and the app password are read in `src/server/env.ts` and never
 * appear anywhere else, never in a log line, and never in a response body.
 *
 * `outbox` is what runs when no SMTP credentials are present. It writes the
 * rendered message to disk instead of sending it, so the sign-up and reset flows
 * can be walked end to end locally without a mail server and without sending real
 * mail to a real address during development. It is not a production fallback:
 * `accountsStatus()` refuses to enable accounts in production without SMTP.
 */

export interface OutgoingMail extends RenderedMail {
  to: string;
}

export interface DeliveryResult {
  delivered: boolean;
  mode: 'smtp' | 'outbox';
  /** Set in outbox mode: where the message was written. */
  path?: string;
}

let transporter: Transporter | undefined;

async function smtpTransport(): Promise<Transporter> {
  if (transporter) return transporter;
  const { smtp } = serverConfig();
  if (!smtp) throw new Error('SMTP transport requested without configuration.');

  const { default: nodemailer } = await import('nodemailer');
  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.password },
    // A serverless invocation is short-lived, so a pooled connection would be
    // torn down before it could be reused.
    pool: false,
    // Without these, a silent network stall would hold the function open until the
    // platform killed it, and the caller would never learn the send failed.
    connectionTimeout: 10_000,
    greetingTimeout: 8_000,
    socketTimeout: 20_000,
    // Downgrade attacks are not worth accepting for the sake of an ancient relay.
    tls: { minVersion: 'TLSv1.2' },
  });
  return transporter;
}

function safeName(subject: string): string {
  return subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
}

async function writeToOutbox(message: OutgoingMail): Promise<string> {
  const { dataDir } = serverConfig();
  const dir = path.resolve(process.cwd(), dataDir, 'outbox');
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `${stamp}-${safeName(message.subject)}`);
  // Both parts are written: the HTML to open in a browser, the text to read in a
  // terminal, which is also how the plain-text alternative gets eyeballed.
  await writeFile(`${file}.html`, message.html, 'utf8');
  await writeFile(`${file}.txt`, `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`, 'utf8');
  return `${file}.html`;
}

/**
 * Sends one message, and never throws.
 *
 * A failed email must not fail the operation that triggered it: an account that
 * exists but whose verification mail bounced is recoverable by resending, whereas a
 * 500 in the middle of registration leaves the person unable to sign in with the
 * account that was just created. Callers get a boolean and decide what to say.
 */
export async function deliver(message: OutgoingMail): Promise<DeliveryResult> {
  const config = serverConfig();

  if (config.emailMode === 'outbox') {
    try {
      const file = await writeToOutbox(message);
      // The address is logged only in this mode, which never runs in production.
      logInfo('mail', `outbox → ${message.to}: "${message.subject}" (${path.basename(file)})`);
      return { delivered: true, mode: 'outbox', path: file };
    } catch (error) {
      logFailure('mail outbox write', error);
      return { delivered: false, mode: 'outbox' };
    }
  }

  try {
    const transport = await smtpTransport();
    await transport.sendMail({
      from: config.mailFrom,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      // Marks the message as transactional so mailbox providers keep it out of
      // promotional tabs, and tells well-behaved auto-responders not to reply.
      headers: {
        'auto-submitted': 'auto-generated',
        'x-auto-response-suppress': 'All',
      },
    });
    return { delivered: true, mode: 'smtp' };
  } catch (error) {
    // `redact` runs over the message because SMTP rejections quote the server's
    // reply, which can contain the authenticating address.
    logFailure(`mail send "${redact(message.subject)}"`, error);
    return { delivered: false, mode: 'smtp' };
  }
}

/** True when mail is written to disk rather than sent — development only. */
export function isOutboxMode(): boolean {
  return serverConfig().emailMode === 'outbox';
}

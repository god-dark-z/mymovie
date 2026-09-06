import { accountsStatus, serverConfig, IS_PRODUCTION, ON_NETLIFY } from '@/server/env';
import { jsonOk, route } from '@/server/http/respond';

/**
 * Diagnostic endpoint — reports whether accounts are enabled and why not.
 *
 * This is the single place that names the culprit, because `/api/auth/session`
 * deliberately does not (a public endpoint should not discuss configuration).
 * It reveals nothing secret: which variables are *missing*, never their values.
 */
export const dynamic = 'force-dynamic';

export const GET = route('auth/diagnose', async () => {
  const status = accountsStatus();
  const config = serverConfig();

  return jsonOk({
    enabled: status.enabled,
    missing: status.missing,
    environment: {
      IS_PRODUCTION,
      ON_NETLIFY,
      NODE_ENV: process.env.NODE_ENV,
    },
    config: {
      dataDriver: config.dataDriver,
      hasSessionSecret: Boolean(config.sessionSecret),
      sessionSecretLength: config.sessionSecret?.length ?? 0,
      hasSmtp: Boolean(config.smtp),
      smtpHost: config.smtp?.host,
      smtpUser: config.smtp?.user ? `${config.smtp.user.slice(0, 3)}…` : null,
      mailFrom: config.mailFrom,
    },
  });
});

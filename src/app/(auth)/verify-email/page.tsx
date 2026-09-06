import type { Metadata } from 'next';
import { AuthShell } from '@/components/account/AuthShell';
import { VerifyEmailForm } from '@/components/account/VerifyEmailForm';
import { safeNextPath } from '@/lib/auth/redirect';

export const metadata: Metadata = {
  title: 'Confirm your email',
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;

  // Length-checked here only so an absurd query string is not handed to a fetch.
  // The token is never inspected on the server: this page is statically served and
  // the endpoint is what validates it.
  const token = rawToken && rawToken.length <= 200 ? rawToken : null;

  return (
    <AuthShell
      title="Confirm your email"
      description="One step and your account is ready. This also proves the address is yours, which is what protects it if you ever need to reset your password."
      width="sm"
    >
      <VerifyEmailForm token={token} next={safeNextPath(rawNext)} />
    </AuthShell>
  );
}

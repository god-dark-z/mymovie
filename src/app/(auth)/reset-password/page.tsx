import type { Metadata } from 'next';
import { AuthShell } from '@/components/account/AuthShell';
import { ResetPasswordForm } from '@/components/account/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Set a new password',
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = raw && raw.length <= 200 ? raw : null;

  return (
    <AuthShell
      title="Set a new password"
      description="Choose something you have not used elsewhere. Length does more for you than punctuation does."
      width="sm"
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}

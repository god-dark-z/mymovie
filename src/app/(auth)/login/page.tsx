import type { Metadata } from 'next';
import { AuthShell, AuthSwitch } from '@/components/account/AuthShell';
import { LoginForm } from '@/components/account/LoginForm';
import { safeNextPath } from '@/lib/auth/redirect';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to Cineora to sync your list, preferences and downloads.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to pick up your list, your preferences and your downloads on this device."
      footer={<AuthSwitch label="New to Cineora?" href="/signup" cta="Create an account" />}
    >
      {/* Validated on the server so an open-redirect link never reaches the client. */}
      <LoginForm next={safeNextPath(raw)} />
    </AuthShell>
  );
}

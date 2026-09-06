import type { Metadata } from 'next';
import { AuthShell } from '@/components/account/AuthShell';
import { WelcomePanel } from '@/components/account/WelcomePanel';
import { safeNextPath } from '@/lib/auth/redirect';

export const metadata: Metadata = {
  title: 'Welcome to Cineora',
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;

  return (
    <AuthShell title="Welcome to Cineora" width="sm">
      <WelcomePanel next={safeNextPath(raw, '/')} />
    </AuthShell>
  );
}

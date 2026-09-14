import type { Metadata } from 'next';
import { AccountOverview } from '@/components/account/AccountOverview';
import { AccountShell } from '@/components/account/AccountShell';

export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string | string[] }>;
}) {
  const params = await searchParams;

  return (
    <AccountShell
      title="Your account"
      description="Manage everything about your membership — pick a section below."
    >
      <AccountOverview justReset={params.reset === '1'} />
    </AccountShell>
  );
}

import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { SessionList } from '@/components/account/SessionList';

export const metadata: Metadata = {
  title: 'Devices',
  robots: { index: false, follow: false },
};

export default function SessionsPage() {
  return (
    <AccountShell
      title="Devices"
      description="Every browser and app signed in to this account. Sign out any you do not recognise."
    >
      <SessionList />
    </AccountShell>
  );
}

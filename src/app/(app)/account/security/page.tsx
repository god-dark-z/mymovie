import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { ActivityLog } from '@/components/account/ActivityLog';
import { ChangePasswordForm, DevicesShortcut, SecurityStatusCard } from '@/components/account/SecurityPanel';

export const metadata: Metadata = {
  title: 'Security',
  robots: { index: false, follow: false },
};

export default function SecurityPage() {
  return (
    <AccountShell
      title="Security"
      description="Your password, how this account is protected, and everything it has recorded."
    >
      <ChangePasswordForm />
      <SecurityStatusCard />
      <DevicesShortcut />
      <ActivityLog />
    </AccountShell>
  );
}

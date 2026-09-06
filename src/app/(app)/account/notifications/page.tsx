import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { NotificationsForm } from '@/components/account/NotificationsForm';

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return (
    <AccountShell
      title="Notifications"
      description="Cineora only emails you. There are no push notifications, and there is nothing to install."
    >
      <NotificationsForm />
    </AccountShell>
  );
}

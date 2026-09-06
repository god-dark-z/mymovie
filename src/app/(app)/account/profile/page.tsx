import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { ProfileForm } from '@/components/account/ProfileForm';

export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <AccountShell
      title="Profile"
      description="Your name, handle and picture. Nothing here is published to other people."
    >
      <ProfileForm />
    </AccountShell>
  );
}

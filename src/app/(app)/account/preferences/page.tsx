import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { PreferencesForm } from '@/components/account/PreferencesForm';

export const metadata: Metadata = {
  title: 'Preferences',
  robots: { index: false, follow: false },
};

export default function PreferencesPage() {
  return (
    <AccountShell
      title="Preferences"
      description="How Cineora looks, what language it asks for, and how it behaves on the devices you sign in to."
    >
      <PreferencesForm />
    </AccountShell>
  );
}

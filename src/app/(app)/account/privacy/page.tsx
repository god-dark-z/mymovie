import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell';
import { DataInventory, DeleteAccountCard, ExportCard, LocalDataCard } from '@/components/account/PrivacyPanel';

export const metadata: Metadata = {
  title: 'Privacy and data',
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <AccountShell
      title="Privacy and data"
      description="What is stored, where it lives, how to take it with you, and how to remove it."
    >
      <DataInventory />
      <LocalDataCard />
      <ExportCard />
      <DeleteAccountCard />
    </AccountShell>
  );
}

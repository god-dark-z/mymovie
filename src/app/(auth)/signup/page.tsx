import type { Metadata } from 'next';
import { AuthShell, AuthSwitch } from '@/components/account/AuthShell';
import { SignupForm } from '@/components/account/SignupForm';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a free Cineora account to sync your list, preferences and downloads.',
};

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Free, and takes about a minute. Your list and preferences follow you to any device you sign in on."
      footer={<AuthSwitch label="Already have an account?" href="/login" cta="Sign in" />}
    >
      <SignupForm />
    </AuthShell>
  );
}

import type { Metadata } from 'next';
import { AuthShell, AuthSwitch } from '@/components/account/AuthShell';
import { ForgotPasswordForm } from '@/components/account/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset your password',
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Tell us the address on your account and we will email you a single-use link to set a new password."
      width="sm"
      footer={<AuthSwitch label="Remembered it?" href="/login" cta="Back to sign in" />}
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

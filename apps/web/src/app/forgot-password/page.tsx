import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { redirectIfAuthenticated } from '@/lib/vowgrid/auth';

export default async function ForgotPasswordPage() {
  await redirectIfAuthenticated('/app');

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Reset the dashboard password without resorting to local database surgery."
      description="Password recovery now exists as a real product flow. When SMTP is configured, VowGrid sends a reset link by email. In local development without SMTP, the reset link is written to the API logs."
      footer="Password reset now lives in the actual auth flow. It is no longer documented as missing."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}

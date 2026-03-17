import { AuthShell } from '@/components/auth/auth-shell';
import { SignupForm } from '@/components/auth/signup-form';
import { redirectIfAuthenticated } from '@/lib/vowgrid/auth';

export default async function SignupPage() {
  await redirectIfAuthenticated('/app');

  return (
    <AuthShell
      eyebrow="14-day trial"
      title="Create the first workspace owner and start validating governed AI execution."
      description="Signup creates the workspace owner, starts the app-managed trial, and opens a dashboard session immediately. No fake access shortcuts, no static API key pretending to be user auth."
      footer="Email verification, password reset, SSO, and invites are still out of scope for this release and are documented as remaining work."
    >
      <SignupForm />
    </AuthShell>
  );
}

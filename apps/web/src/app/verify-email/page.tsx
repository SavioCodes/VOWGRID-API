import { Button } from '@vowgrid/ui';
import { AuthShell } from '@/components/auth/auth-shell';
import { VerifyEmailForm } from '@/components/auth/verify-email-form';
import { CsrfTokenField } from '@/components/security/csrf-token-field';
import { getCurrentSession } from '@/lib/vowgrid/auth';
import { requestEmailVerificationAction } from '@/lib/vowgrid/auth-actions';

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await getCurrentSession();

  return (
    <AuthShell
      eyebrow="Verification"
      title="Make operator identity explicit before the dashboard drifts into guesswork."
      description="Email verification is now a real step in the VowGrid account lifecycle. Verification links come from the backend, not from fake client-only state."
      footer="When SMTP is not configured locally, verification links are written to the API logs so the flow still stays testable."
    >
      {token ? (
        <VerifyEmailForm token={token} />
      ) : session ? (
        <form action={requestEmailVerificationAction} className="space-y-5">
          <CsrfTokenField />
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
              Verification
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)]">
              Send a fresh verification link
            </h2>
            <p className="text-sm leading-7 text-[var(--color-text-secondary)]">
              Current account: {session.user.email}
            </p>
          </div>
          <Button type="submit" block>
            Send verification email
          </Button>
        </form>
      ) : (
        <div className="rounded-[20px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm text-[var(--color-text-secondary)]">
          Sign in first or open a verification link from your email.
        </div>
      )}
    </AuthShell>
  );
}

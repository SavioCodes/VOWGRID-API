import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      eyebrow="Recovery"
      title="Write a new password and return to the control plane."
      description="This route consumes a password reset token issued by the VowGrid backend and rotates the stored password hash."
      footer="Expired or already-consumed reset tokens are rejected explicitly."
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className="rounded-[20px] border border-[rgba(245,89,89,0.28)] bg-[rgba(245,89,89,0.08)] px-4 py-4 text-sm text-[var(--color-danger)]">
          Missing password reset token.
        </div>
      )}
    </AuthShell>
  );
}

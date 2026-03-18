import { AuthShell } from '@/components/auth/auth-shell';
import { AcceptInviteForm } from '@/components/auth/accept-invite-form';

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      eyebrow="Workspace invite"
      title="Join an existing VowGrid workspace without pretending every account starts as an owner."
      description="Invites now create a real path into shared workspace access. Existing users can join another workspace; new users can create an account as part of invite acceptance."
      footer="Multi-workspace membership now starts at the invite edge instead of being hidden behind manual database changes."
    >
      {token ? (
        <AcceptInviteForm token={token} />
      ) : (
        <div className="rounded-[20px] border border-[rgba(245,89,89,0.28)] bg-[rgba(245,89,89,0.08)] px-4 py-4 text-sm text-[var(--color-danger)]">
          Missing workspace invite token.
        </div>
      )}
    </AuthShell>
  );
}

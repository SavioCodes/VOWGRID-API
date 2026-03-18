import { AuthShell } from '@/components/auth/auth-shell';
import { OAuthProviderLinks } from '@/components/auth/oauth-provider-links';
import { SignupForm } from '@/components/auth/signup-form';
import { redirectIfAuthenticated } from '@/lib/vowgrid/auth';
import { getConfiguredOAuthProviders, getPendingOauthCandidateCookie } from '@/lib/vowgrid/oauth';

export default async function SignupPage() {
  await redirectIfAuthenticated('/app');
  const providers = getConfiguredOAuthProviders();
  const oauthCandidate = await getPendingOauthCandidateCookie();

  return (
    <AuthShell
      eyebrow="14-day trial"
      title="Create the first workspace owner and start validating governed AI execution."
      description="Signup creates the workspace owner, starts the app-managed trial, and opens a dashboard session immediately. No fake access shortcuts, no static API key pretending to be user auth."
      footer="Email verification and password reset now exist in the real auth flow. Invites can add users into existing workspaces without forcing every account through owner signup."
    >
      <>
        {!oauthCandidate ? <OAuthProviderLinks providers={providers} mode="signup" /> : null}
        <SignupForm oauthCandidate={oauthCandidate} />
      </>
    </AuthShell>
  );
}

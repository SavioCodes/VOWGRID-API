import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { OAuthProviderLinks } from '@/components/auth/oauth-provider-links';
import { redirectIfAuthenticated } from '@/lib/vowgrid/auth';
import { getConfiguredOAuthProviders } from '@/lib/vowgrid/oauth';

export default async function LoginPage() {
  await redirectIfAuthenticated('/app');
  const providers = getConfiguredOAuthProviders();

  return (
    <AuthShell
      eyebrow="Dashboard access"
      title="Log in to inspect intent, approval, execution, and receipt state."
      description="Dashboard authentication is now session-backed. API keys remain the programmatic trust surface for agents and external automation."
      footer="The dashboard uses an HttpOnly session cookie on the web app. The backend still accepts API keys directly for machine-to-machine usage."
    >
      <>
        <OAuthProviderLinks providers={providers} mode="login" />
        <LoginForm />
      </>
    </AuthShell>
  );
}

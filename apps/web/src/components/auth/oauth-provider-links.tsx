import Link from 'next/link';
import { Button } from '@vowgrid/ui';
import type { OAuthProvider } from '@vowgrid/contracts';
import type { OAuthMode } from '@/lib/vowgrid/oauth';

const providerLabels: Record<OAuthProvider, string> = {
  github: 'GitHub',
  google: 'Google',
  oidc: 'Enterprise SSO',
};

export function OAuthProviderLinks({
  providers,
  mode,
}: {
  providers: OAuthProvider[];
  mode: OAuthMode;
}) {
  if (providers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
          Social login
        </p>
        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
          Continue with a verified identity provider instead of typing a password.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {providers.map((provider) => (
          <Link
            key={provider}
            href={`/auth/oauth/start/${provider}?mode=${mode}`}
            className="block"
          >
            <Button block tone="secondary">
              Continue with {providerLabels[provider]}
            </Button>
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
          Or continue with email
        </span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
    </div>
  );
}

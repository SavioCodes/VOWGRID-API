import { Badge, Card, CardContent } from '@vowgrid/ui';
import { IntegrationBanner } from '@/components/vowgrid/integration-banner';
import { PageHeader } from '@/components/vowgrid/page-header';
import { getWorkspaceSnapshot } from '@/lib/vowgrid/repository';

export default async function SettingsPage() {
  const snapshot = await getWorkspaceSnapshot();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Keep auth, adapter configuration, and known integration gaps explicit."
        description="The dashboard now uses session-backed auth for human operators. API keys remain the programmatic access layer for agents, and user-facing API key management still is not implemented."
      />
      <IntegrationBanner integration={snapshot.integration} />
      <section className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Authentication</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Current backend truth
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p>Dashboard pages use a session token stored in an HttpOnly cookie on the web app.</p>
              <p>Programmatic clients still authenticate directly with an <span className="mono">X-Api-Key</span> header.</p>
              <p>There is still no API route for creating or rotating API keys from the UI.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Web app adapter</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Connection model
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Badge tone={snapshot.integration.mode === 'live' ? 'mint' : 'warning'}>
                {snapshot.integration.mode}
              </Badge>
              {snapshot.integration.apiBaseUrl ? (
                <Badge tone="neutral">{snapshot.integration.apiBaseUrl}</Badge>
              ) : null}
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p>Signed-in user: <span className="font-semibold text-[var(--color-text-primary)]">{snapshot.currentUser.name}</span></p>
              {snapshot.integration.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Billing provider</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Mercado Pago readiness
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p>Billing is now modeled internally in VowGrid, with Mercado Pago isolated as the payment provider layer.</p>
              <p>The full billing surface lives at <span className="mono">/app/billing</span>, including trial state, usage meters, and provider setup requirements.</p>
              <p>Checkout remains environment-driven: missing Mercado Pago env vars are called out explicitly instead of being hidden behind fake success states.</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

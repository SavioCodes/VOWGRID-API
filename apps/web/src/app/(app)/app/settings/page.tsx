import { Badge, Card, CardContent } from '@vowgrid/ui';
import { DangerZone } from '@/components/vowgrid/danger-zone';
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
        description="The backend currently uses API keys for access. Dashboard JWT auth and user-facing key management are not yet implemented, so this page stays honest about what is and is not wired."
      />
      <IntegrationBanner integration={snapshot.integration} />
      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Authentication</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Current backend truth
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p>Routes require an <span className="mono">X-Api-Key</span> header.</p>
              <p>JWT dashboard auth is planned but not implemented in the backend yet.</p>
              <p>There is no API route for creating API keys from the UI at the moment.</p>
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
              {snapshot.integration.notes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
      <DangerZone />
    </div>
  );
}

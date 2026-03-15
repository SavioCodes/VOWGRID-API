import { Badge, Card, CardContent, EmptyState } from '@vowgrid/ui';
import { IntegrationBanner } from '@/components/vowgrid/integration-banner';
import { PageHeader } from '@/components/vowgrid/page-header';
import { getWorkspaceSnapshot } from '@/lib/vowgrid/repository';
import { titleFromSlug } from '@/lib/vowgrid/status';

export default async function PoliciesPage() {
  const snapshot = await getWorkspaceSnapshot();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Policies"
        title="See the governance rules that shape approval pressure and execution posture."
        description="Policies stay readable in the UI so operators can understand why an action is blocked, approved, or escalated."
      />
      <IntegrationBanner integration={snapshot.integration} />
      {snapshot.policies.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.policies.map((policy) => (
            <Card key={policy.id}>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
                      {titleFromSlug(policy.type)}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                      {policy.name}
                    </h2>
                  </div>
                  <Badge tone={policy.enabled ? 'mint' : 'neutral'}>
                    {policy.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                  {policy.description ?? 'No description provided.'}
                </p>
                <div className="rounded-[24px] border border-[var(--color-border)] bg-[rgba(6,10,20,0.82)] p-4">
                  <p className="mb-3 text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Rules payload</p>
                  <pre className="mono overflow-x-auto text-xs leading-6 text-[var(--color-text-secondary)]">
                    {JSON.stringify(policy.rules, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No policies configured"
          description="Once policies exist in the workspace, this catalog will show their rule payloads and current enabled state."
        />
      )}
    </div>
  );
}

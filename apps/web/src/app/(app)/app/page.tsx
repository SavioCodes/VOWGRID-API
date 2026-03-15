import Link from 'next/link';
import { Badge, Button, Card, CardContent, EmptyState, MetricCard } from '@vowgrid/ui';
import { AuditEventTable } from '@/components/vowgrid/audit-event-table';
import { IntegrationBanner } from '@/components/vowgrid/integration-banner';
import { IntentCard } from '@/components/vowgrid/intent-card';
import { PageHeader } from '@/components/vowgrid/page-header';
import { getWorkspaceSnapshot } from '@/lib/vowgrid/repository';

export default async function OverviewPage() {
  const snapshot = await getWorkspaceSnapshot();

  const pendingApprovals = snapshot.intents.filter((intent) => intent.status === 'pending_approval').length;
  const activeExecutions = snapshot.intents.filter((intent) =>
    ['queued', 'executing'].includes(intent.status),
  ).length;
  const completedReceipts = snapshot.intents.filter((intent) => intent.status === 'succeeded').length;
  const rollbackExposure = snapshot.connectors.connectors.filter(
    (connector) => connector.rollbackSupport !== 'supported',
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="See what actions exist, what is risky, and what proof already exists."
        description="The VowGrid control plane keeps the workflow legible from intent intake through receipt generation and rollback visibility."
        actions={
          <Link href="/app/intents">
            <Button tone="secondary">View all intents</Button>
          </Link>
        }
      />
      <IntegrationBanner integration={snapshot.integration} />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending approvals" value={String(pendingApprovals)} trend="Needs review">
          Human reviewers are still in the loop on these items.
        </MetricCard>
        <MetricCard label="Active executions" value={String(activeExecutions)} tone="warning" trend="In flight">
          Queue and worker activity visible in the same shell.
        </MetricCard>
        <MetricCard label="Receipts generated" value={String(completedReceipts)} tone="mint" trend="Proof available">
          Completed work already has inspectable execution receipts.
        </MetricCard>
        <MetricCard label="Rollback exposure" value={String(rollbackExposure)} tone="danger" trend="Connector posture">
          Connectors with partial or unsupported rollback stay visible.
        </MetricCard>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Recent intents</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Trust workflow queue
              </h2>
            </div>
            <Badge tone="neutral">{snapshot.intents.length} items</Badge>
          </div>
          {snapshot.intents.length > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {snapshot.intents.slice(0, 4).map((intent) => (
                <IntentCard key={intent.id} intent={intent} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No intents yet"
              description="As soon as agents begin proposing work, the queue, approval pressure, and receipt coverage will show up here."
            />
          )}
        </div>
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Health and posture</p>
              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Control plane signal
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Health status</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">
                  {snapshot.health?.status ?? 'Unknown'}
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Database: {snapshot.health?.services.database ?? 'n/a'} · Redis: {snapshot.health?.services.redis ?? 'n/a'}
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Connectors</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">
                  {snapshot.connectors.connectors.length}
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  {snapshot.connectors.registeredTypes.length} registered runtime types.
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Policies</p>
                <p className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">
                  {snapshot.policies.length}
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Active governance rules visible to the operator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Audit trail</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
            Recent proof events
          </h2>
        </div>
        {snapshot.auditEvents.length > 0 ? (
          <AuditEventTable events={snapshot.auditEvents.slice(0, 6)} />
        ) : (
          <EmptyState
            title="No audit events yet"
            description="The explorer will populate when actions begin moving through the trust workflow."
          />
        )}
      </section>
    </div>
  );
}

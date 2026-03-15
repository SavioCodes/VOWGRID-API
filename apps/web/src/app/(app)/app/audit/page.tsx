import { Badge, EmptyState } from '@vowgrid/ui';
import { AuditEventTable } from '@/components/vowgrid/audit-event-table';
import { IntegrationBanner } from '@/components/vowgrid/integration-banner';
import { PageHeader } from '@/components/vowgrid/page-header';
import { getWorkspaceSnapshot } from '@/lib/vowgrid/repository';

export default async function AuditPage() {
  const snapshot = await getWorkspaceSnapshot();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audit trail"
        title="Investigate what happened, who triggered it, and what proof remains."
        description="The explorer is optimized for operator clarity first: action, entity, actor, and timing all stay legible in one table."
      />
      <IntegrationBanner integration={snapshot.integration} />
      <div className="flex flex-wrap gap-3">
        <Badge tone="neutral">Entity: intent</Badge>
        <Badge tone="neutral">Actors: user, system, agent</Badge>
        <Badge tone="neutral">Recent first</Badge>
      </div>
      {snapshot.auditEvents.length > 0 ? (
        <AuditEventTable events={snapshot.auditEvents} />
      ) : (
        <EmptyState
          title="No audit events available"
          description="Once the API begins emitting audit records, the explorer will populate automatically."
        />
      )}
    </div>
  );
}

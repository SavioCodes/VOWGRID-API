import { Badge, EmptyState } from '@vowgrid/ui';
import { ConnectorCard } from '@/components/vowgrid/connector-card';
import { IntegrationBanner } from '@/components/vowgrid/integration-banner';
import { PageHeader } from '@/components/vowgrid/page-header';
import { getWorkspaceSnapshot } from '@/lib/vowgrid/repository';

export default async function ConnectorsPage() {
  const snapshot = await getWorkspaceSnapshot();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Connectors"
        title="Understand the real-world surfaces your agents can touch."
        description="Connector cards keep rollback support, catalog coverage, and configuration posture visible without pretending every system is equally reversible."
      />
      <IntegrationBanner integration={snapshot.integration} />
      <section className="flex flex-wrap gap-3">
        {snapshot.connectors.registeredTypes.map((item) => (
          <Badge key={item.type} tone="neutral">
            {item.type} · {item.rollbackSupport}
          </Badge>
        ))}
      </section>
      {snapshot.connectors.connectors.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {snapshot.connectors.connectors.map((connector) => (
            <ConnectorCard key={connector.id} connector={connector} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No connectors registered"
          description="Registered connectors will appear here alongside their rollback posture and runtime type."
        />
      )}
    </div>
  );
}

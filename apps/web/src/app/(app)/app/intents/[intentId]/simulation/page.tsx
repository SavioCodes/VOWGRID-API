import { Badge, Card, CardContent, EmptyState } from '@vowgrid/ui';
import { notFound } from 'next/navigation';
import { DiffPreview } from '@/components/vowgrid/diff-preview';
import {
  ReversibilityBadge,
  RiskBadge,
  StatusBadge,
} from '@/components/vowgrid/badges';
import { PageHeader } from '@/components/vowgrid/page-header';
import { PayloadViewer } from '@/components/vowgrid/payload-viewer';
import { getIntentRecord } from '@/lib/vowgrid/repository';

export default async function SimulationPage({
  params,
}: {
  params: Promise<{ intentId: string }>;
}) {
  const { intentId } = await params;
  const intent = await getIntentRecord(intentId);

  if (!intent) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Simulation"
        title={`Simulation for ${intent.title}`}
        description="Simulation surfaces keep risk, reversibility, affected resources, and diffs visible before a real execution is queued."
      />
      <StatusBadge status={intent.status} />
      {intent.simulationResult ? (
        <>
          <section className="flex flex-wrap gap-3">
            <RiskBadge risk={intent.simulationResult.riskLevel} />
            <ReversibilityBadge value={intent.simulationResult.reversibility} />
            <Badge tone="neutral">{intent.simulationResult.estimatedImpact} impact</Badge>
          </section>
          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Summary</p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                  {intent.simulationResult.summary}
                </h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {intent.simulationResult.affectedResources.map((resource) => (
                  <div
                    key={`${resource.type}-${resource.id}`}
                    className="rounded-[22px] border border-[var(--color-border)] p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                      {resource.type}
                    </p>
                    <p className="mt-2 font-medium text-[var(--color-text-primary)]">{resource.name}</p>
                    <p className="mono mt-2 text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                      {resource.id}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <DiffPreview diff={intent.simulationResult.diffPreview} title="Simulation diff" />
          <PayloadViewer
            title="Simulation payload"
            description="Warnings and metadata returned by the connector simulation."
            payload={intent.simulationResult}
          />
        </>
      ) : (
        <EmptyState
          title="No simulation result yet"
          description="This intent does not yet have a persisted simulation record. In live mode that usually means it has not reached a simulatable state."
        />
      )}
    </div>
  );
}

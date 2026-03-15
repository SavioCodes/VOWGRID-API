import Link from 'next/link';
import { Badge, Button, Card, CardContent, MetricCard } from '@vowgrid/ui';
import { notFound } from 'next/navigation';
import {
  ApprovalBadge,
  ReversibilityBadge,
  RiskBadge,
  StatusBadge,
} from '@/components/vowgrid/badges';
import { DiffPreview } from '@/components/vowgrid/diff-preview';
import { PageHeader } from '@/components/vowgrid/page-header';
import { PayloadViewer } from '@/components/vowgrid/payload-viewer';
import { ReceiptPanel } from '@/components/vowgrid/receipt-panel';
import { Timeline } from '@/components/vowgrid/timeline';
import {
  findDirectoryLabel,
  getIntentRecord,
  getReceiptLinkCandidate,
  getWorkspaceSnapshot,
} from '@/lib/vowgrid/repository';
import { compactId, formatDateTime, formatDuration } from '@/lib/vowgrid/format';

export default async function IntentDetailPage({
  params,
}: {
  params: Promise<{ intentId: string }>;
}) {
  const { intentId } = await params;
  const [snapshot, intent] = await Promise.all([
    getWorkspaceSnapshot(),
    getIntentRecord(intentId),
  ]);

  if (!intent) {
    notFound();
  }

  const receiptId = getReceiptLinkCandidate(intent);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intent detail"
        title={intent.title}
        description={intent.description ?? 'No description provided.'}
        actions={
          <>
            <Badge tone="neutral">{compactId(intent.id)}</Badge>
            <Link href={`/app/intents/${intent.id}/simulation`}>
              <Button tone="secondary">Simulation</Button>
            </Link>
            <Link href={`/app/intents/${intent.id}/policy`}>
              <Button tone="secondary">Policy review</Button>
            </Link>
            {receiptId ? (
              <Link href={`/app/receipts/${receiptId}`}>
                <Button>Open receipt</Button>
              </Link>
            ) : null}
          </>
        }
      />
      <section className="flex flex-wrap gap-3">
        <StatusBadge status={intent.status} />
        {intent.approvalRequest ? <ApprovalBadge status={intent.approvalRequest.status} /> : null}
        {intent.simulationResult ? <RiskBadge risk={intent.simulationResult.riskLevel} /> : null}
        {intent.simulationResult ? (
          <ReversibilityBadge value={intent.simulationResult.reversibility} />
        ) : null}
        <Badge tone="neutral">{intent.environment}</Badge>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Connector" value={intent.connector?.name ?? 'Unassigned'}>
          {intent.action}
        </MetricCard>
        <MetricCard
          label="Approvals"
          value={
            intent.approvalRequest
              ? `${intent.approvalRequest.currentCount}/${intent.approvalRequest.requiredCount}`
              : '0'
          }
          tone="warning"
        >
          {intent.approvalRequest ? intent.approvalRequest.status : 'No approval request'}
        </MetricCard>
        <MetricCard label="Receipts" value={String(intent.receipts.length)} tone="mint">
          {intent.receipts.length > 0 ? 'Proof exists' : 'No receipt yet'}
        </MetricCard>
        <MetricCard
          label="Execution duration"
          value={formatDuration(
            intent.executionJob?.completedAt && intent.executionJob.startedAt
              ? new Date(intent.executionJob.completedAt).getTime() -
                  new Date(intent.executionJob.startedAt).getTime()
              : undefined,
          )}
          tone="accent"
        >
          {intent.executionJob?.status ?? 'No execution job'}
        </MetricCard>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {intent.simulationResult ? (
            <>
              <Card>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Simulation summary</p>
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
              <DiffPreview diff={intent.simulationResult.diffPreview} />
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-sm leading-6 text-[var(--color-text-secondary)]">
                This intent has not been simulated yet, so no risk summary or diff preview is available.
              </CardContent>
            </Card>
          )}
          <PayloadViewer
            title="Intent payload"
            description="Parameters and metadata as the frontend received them."
            payload={{
              id: intent.id,
              action: intent.action,
              parameters: intent.parameters,
              environment: intent.environment,
              agentId: intent.agentId,
              connectorId: intent.connectorId,
            }}
          />
        </div>
        <div className="space-y-6">
          {intent.approvalRequest ? (
            <Timeline
              title="Approval timeline"
              items={intent.approvalRequest.decisions.map((decision) => ({
                title: findDirectoryLabel(snapshot.directory, decision.userId),
                detail: decision.rationale ?? 'No rationale was recorded.',
                timestamp: decision.createdAt,
                meta: decision.decision,
                tone: decision.decision === 'approved' ? 'mint' : 'danger',
              }))}
            />
          ) : null}
          {intent.executionJob ? (
            <Timeline
              title="Execution timeline"
              items={[
                {
                  title: 'Execution queued',
                  detail: `Execution job ${intent.executionJob.id} was created for this intent.`,
                  timestamp: intent.executionJob.createdAt,
                  meta: intent.executionJob.status,
                  tone: intent.executionJob.status === 'failed' ? 'danger' : 'warning',
                },
                {
                  title: 'Execution runtime',
                  detail:
                    intent.executionJob.error ??
                    `Attempt ${intent.executionJob.attempts} of ${intent.executionJob.maxAttempts}.`,
                  timestamp: intent.executionJob.startedAt,
                  meta: formatDuration(
                    intent.executionJob.completedAt && intent.executionJob.startedAt
                      ? new Date(intent.executionJob.completedAt).getTime() -
                          new Date(intent.executionJob.startedAt).getTime()
                      : undefined,
                  ),
                },
              ]}
            />
          ) : null}
          <Card>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Lifecycle facts</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                  Operator context
                </h2>
              </div>
              <div className="space-y-3 text-sm text-[var(--color-text-secondary)]">
                <p>Created: {formatDateTime(intent.createdAt)}</p>
                <p>Updated: {formatDateTime(intent.updatedAt)}</p>
                <p>Agent: {intent.agent?.name ?? intent.agentId}</p>
                <p>Connector: {intent.connector?.name ?? 'None assigned'}</p>
              </div>
            </CardContent>
          </Card>
          {intent.receipts.map((receipt) => (
            <ReceiptPanel key={receipt.id} receipt={receipt} />
          ))}
        </div>
      </section>
    </div>
  );
}

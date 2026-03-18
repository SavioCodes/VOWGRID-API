import { EmptyState } from '@vowgrid/ui';
import { IntegrationBanner } from '@/components/vowgrid/integration-banner';
import { PageHeader } from '@/components/vowgrid/page-header';
import { ReceiptPanel } from '@/components/vowgrid/receipt-panel';
import { Timeline } from '@/components/vowgrid/timeline';
import { StatusBadge } from '@/components/vowgrid/badges';
import { getExecutionQueue, getWorkspaceSnapshot } from '@/lib/vowgrid/repository';
import { formatDuration } from '@/lib/vowgrid/format';

export default async function ExecutionsPage() {
  const [snapshot, executions] = await Promise.all([getWorkspaceSnapshot(), getExecutionQueue()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Executions"
        title="Monitor runtime progress and keep receipt generation close to the action."
        description="The execution monitor keeps queue state, attempts, failures, and rollback posture visible so operators can respond without digging through logs."
      />
      <IntegrationBanner integration={snapshot.integration} />
      {executions.length > 0 ? (
        <div className="space-y-6">
          {executions.map((intent) => (
            <div key={intent.id} className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status={intent.status} />
                <p className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                  {intent.title}
                </p>
              </div>
              {intent.executionJob ? (
                <Timeline
                  title="Execution timeline"
                  items={[
                    {
                      title: 'Job created',
                      detail: `Execution job ${intent.executionJob.id} entered ${intent.executionJob.status}.`,
                      timestamp: intent.executionJob.createdAt,
                      meta: intent.executionJob.status,
                      tone: intent.executionJob.status === 'failed' ? 'danger' : 'warning',
                    },
                    {
                      title: 'Execution started',
                      detail: `Attempt ${intent.executionJob.attempts} of ${intent.executionJob.maxAttempts}.`,
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
              {intent.receipts[0] ? <ReceiptPanel receipt={intent.receipts[0]} /> : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No execution activity"
          description="Queued, executing, succeeded, failed, and rollback-related intents will show up here once the workflow starts moving."
        />
      )}
    </div>
  );
}

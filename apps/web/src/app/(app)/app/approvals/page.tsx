import { Badge, Card, CardContent, EmptyState } from '@vowgrid/ui';
import { ApprovalBadge, PolicyChip, RiskBadge, StatusBadge } from '@/components/vowgrid/badges';
import { IntegrationBanner } from '@/components/vowgrid/integration-banner';
import { PageHeader } from '@/components/vowgrid/page-header';
import { Timeline } from '@/components/vowgrid/timeline';
import {
  findDirectoryLabel,
  getApprovalQueue,
  getWorkspaceSnapshot,
} from '@/lib/vowgrid/repository';

export default async function ApprovalsPage() {
  const [snapshot, approvals] = await Promise.all([getWorkspaceSnapshot(), getApprovalQueue()]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Approvals"
        title="Give reviewers context before they take responsibility for a decision."
        description="Approval surfaces combine risk, policy posture, rationale, and execution readiness so sign-off feels clear instead of opaque."
      />
      <IntegrationBanner integration={snapshot.integration} />
      {approvals.length > 0 ? (
        <div className="space-y-6">
          {approvals.map((intent) => (
            <Card key={intent.id}>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-3">
                      <StatusBadge status={intent.status} />
                      {intent.approvalRequest ? (
                        <ApprovalBadge status={intent.approvalRequest.status} />
                      ) : null}
                      {intent.simulationResult ? (
                        <RiskBadge risk={intent.simulationResult.riskLevel} />
                      ) : null}
                    </div>
                    <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                      {intent.title}
                    </h2>
                    <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
                      {intent.description ?? 'No description provided.'}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-[var(--color-border)] px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                      Decision progress
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[var(--color-text-primary)]">
                      {intent.approvalRequest
                        ? `${intent.approvalRequest.currentCount}/${intent.approvalRequest.requiredCount}`
                        : 'n/a'}
                    </p>
                  </div>
                </div>
                {intent.approvalRequest ? (
                  <Timeline
                    title="Approval timeline"
                    items={intent.approvalRequest.decisions.map((decision) => ({
                      title: findDirectoryLabel(snapshot.directory, decision.userId),
                      detail: decision.stageLabel
                        ? `${decision.stageLabel}: ${decision.rationale ?? 'Decision recorded without rationale.'}`
                        : (decision.rationale ?? 'Decision recorded without rationale.'),
                      timestamp: decision.createdAt,
                      meta: decision.decision,
                      tone: decision.decision === 'approved' ? 'mint' : 'danger',
                    }))}
                  />
                ) : null}
                {intent.approvalRequest?.stages && intent.approvalRequest.stages.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {intent.approvalRequest.stages.map((stage) => (
                      <div
                        key={`${intent.approvalRequest?.id}-${stage.index}`}
                        className="rounded-[22px] border border-[var(--color-border)] p-4"
                      >
                        <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                          Stage {stage.index + 1}
                        </p>
                        <p className="mt-2 font-medium text-[var(--color-text-primary)]">
                          {stage.label}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                          {stage.currentCount}/{stage.requiredCount} approvals from{' '}
                          {stage.reviewerRoles.join(', ')}
                        </p>
                        <div className="mt-3">
                          <Badge
                            tone={
                              stage.status === 'approved'
                                ? 'mint'
                                : stage.status === 'active'
                                  ? 'accent'
                                  : stage.status === 'rejected'
                                    ? 'danger'
                                    : 'neutral'
                            }
                          >
                            {stage.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                {intent.simulationResult ? (
                  <div className="flex flex-wrap gap-3">
                    <PolicyChip result="require_approval" />
                    <Badge tone="neutral">{intent.simulationResult.summary}</Badge>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No approval activity"
          description="Once intents begin reaching approval gates, the reviewer center will summarize counts, rationales, and timing here."
        />
      )}
    </div>
  );
}

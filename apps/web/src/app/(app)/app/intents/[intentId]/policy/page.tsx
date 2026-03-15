import { Badge, Card, CardContent, EmptyState } from '@vowgrid/ui';
import { notFound } from 'next/navigation';
import { PolicyChip, StatusBadge } from '@/components/vowgrid/badges';
import { PageHeader } from '@/components/vowgrid/page-header';
import { getPolicyReviewContext } from '@/lib/vowgrid/repository';
import { titleFromSlug } from '@/lib/vowgrid/status';

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ intentId: string }>;
}) {
  const { intentId } = await params;
  const context = await getPolicyReviewContext(intentId);

  if (!context.intent) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Policy review"
        title={`Policy posture for ${context.intent.title}`}
        description="This surface separates active governance rules from historical policy evaluation output, and it stays explicit when the backend does not expose the latter."
      />
      <StatusBadge status={context.intent.status} />
      {context.note ? (
        <Card>
          <CardContent className="text-sm leading-6 text-[var(--color-text-secondary)]">
            {context.note}
          </CardContent>
        </Card>
      ) : null}
      {context.evaluations && context.evaluations.length > 0 ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {context.evaluations.map((evaluation) => (
            <Card key={evaluation.policyId}>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                    {evaluation.policyName}
                  </h2>
                  <PolicyChip result={evaluation.result} />
                </div>
                <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{evaluation.reason}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No policy decision history exposed"
          description="The current backend does not return historical policy decisions on intent detail routes in live mode. The active policy catalog is still visible below."
        />
      )}
      <section className="grid gap-4 xl:grid-cols-2">
        {context.policies.map((policy) => (
          <Card key={policy.id}>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
                    {titleFromSlug(policy.type)}
                  </p>
                  <h2 className="text-xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
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
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

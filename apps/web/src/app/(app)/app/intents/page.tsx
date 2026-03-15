import { Badge, EmptyState } from '@vowgrid/ui';
import { IntegrationBanner } from '@/components/vowgrid/integration-banner';
import { IntentCard } from '@/components/vowgrid/intent-card';
import { PageHeader } from '@/components/vowgrid/page-header';
import { getWorkspaceSnapshot } from '@/lib/vowgrid/repository';
import { getIntentStatusMeta } from '@/lib/vowgrid/status';

export default async function IntentsPage() {
  const snapshot = await getWorkspaceSnapshot();

  const groups = Array.from(
    snapshot.intents.reduce((accumulator, intent) => {
      const current = accumulator.get(intent.status) ?? [];
      current.push(intent);
      accumulator.set(intent.status, current);
      return accumulator;
    }, new Map<typeof snapshot.intents[number]['status'], typeof snapshot.intents>()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intents"
        title="Track every proposed action before it becomes a real-world change."
        description="This queue makes state transitions, risk posture, and action context visible at a glance."
      />
      <IntegrationBanner integration={snapshot.integration} />
      {snapshot.intents.length > 0 ? (
        <div className="space-y-8">
          {groups.map(([status, intents]) => {
            const meta = getIntentStatusMeta(status);

            return (
              <section key={status} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                      {meta.label}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{meta.detail}</p>
                  </div>
                  <Badge tone={meta.tone}>{intents.length} intents</Badge>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {intents.map((intent) => (
                    <IntentCard key={intent.id} intent={intent} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No intents available"
          description="When the backend begins returning intents, this page will group them by lifecycle state automatically."
        />
      )}
    </div>
  );
}

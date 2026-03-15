import { Card, CardContent, CardHeader } from '@vowgrid/ui';

export function DiffPreview({
  diff,
  title = 'Diff preview',
}: {
  diff?: Record<string, unknown> | null;
  title?: string;
}) {
  if (!diff) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-[var(--color-text-secondary)]">
          No structured diff preview is available for this intent yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">{title}</h3>
          <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
            Before and after snapshots keep high-risk changes inspectable.
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-[var(--color-border)] bg-[rgba(6,10,20,0.82)] p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">Before</p>
          <pre className="mono overflow-x-auto text-xs leading-6 text-[var(--color-text-secondary)]">
            {JSON.stringify(diff.before ?? {}, null, 2)}
          </pre>
        </div>
        <div className="rounded-[24px] border border-[rgba(46,211,183,0.2)] bg-[rgba(4,28,29,0.52)] p-4">
          <p className="mb-3 text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">After</p>
          <pre className="mono overflow-x-auto text-xs leading-6 text-[var(--color-text-secondary)]">
            {JSON.stringify(diff.after ?? {}, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}

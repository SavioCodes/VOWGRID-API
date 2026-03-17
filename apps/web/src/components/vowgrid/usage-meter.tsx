import { Card, CardContent } from '@vowgrid/ui';
import type { UsageMetricResponse } from '@vowgrid/contracts';
import { formatMetricSummary } from '@/lib/vowgrid/billing';

export function UsageMeter({ metric }: { metric: UsageMetricResponse }) {
  const percent =
    metric.limit && metric.limit > 0 ? Math.min((metric.used / metric.limit) * 100, 100) : 0;
  const barTone =
    metric.status === 'blocked'
      ? 'bg-[var(--color-danger)]'
      : metric.status === 'warning'
        ? 'bg-[var(--color-warning)]'
        : 'bg-[var(--color-accent)]';

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
              {metric.label}
            </p>
            <p className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
              {formatMetricSummary(metric)}
            </p>
          </div>
          <div className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            {metric.period === 'monthly' ? 'Monthly' : 'Current'}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
            <div className={`h-full rounded-full ${barTone}`} style={{ width: `${percent}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
            <span>{metric.limit === null ? 'Custom limit' : `${Math.round(percent)}% used`}</span>
            <span>
              {metric.remaining === null
                ? 'Contact sales'
                : `${metric.remaining.toLocaleString('pt-BR')} remaining`}
            </span>
          </div>
          {metric.resetsAt ? (
            <p className="text-xs text-[var(--color-text-dim)]">
              Resets at {new Date(metric.resetsAt).toLocaleDateString('pt-BR')}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

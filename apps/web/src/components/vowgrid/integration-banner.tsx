import { Badge, Card, CardContent } from '@vowgrid/ui';
import type { IntegrationState } from '@/lib/vowgrid/repository';

export function IntegrationBanner({ integration }: { integration: IntegrationState }) {
  return (
    <Card className="border-[var(--color-border-strong)] bg-[rgba(14,20,37,0.88)]">
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={integration.mode === 'live' ? 'mint' : 'warning'}>
              {integration.label}
            </Badge>
            {integration.apiBaseUrl ? (
              <span className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                {integration.apiBaseUrl}
              </span>
            ) : null}
          </div>
          <p className="max-w-4xl text-sm leading-6 text-[var(--color-text-secondary)]">
            {integration.description}
          </p>
        </div>
        <div className="space-y-2 text-sm text-[var(--color-text-secondary)] md:max-w-xl">
          {integration.notes.slice(0, 3).map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

import Link from 'next/link';
import { Badge, Card, CardContent } from '@vowgrid/ui';
import type { IntentResponse } from '@vowgrid/contracts';
import { compactId, formatShortDate } from '@/lib/vowgrid/format';
import { StatusBadge } from './badges';

export function IntentCard({ intent }: { intent: IntentResponse }) {
  return (
    <Link href={`/app/intents/${intent.id}`}>
      <Card className="h-full transition duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-highlight)]">
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StatusBadge status={intent.status} />
            <Badge tone="neutral">{intent.environment}</Badge>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              {intent.title}
            </h3>
            <p className="line-clamp-2 text-sm leading-6 text-[var(--color-text-secondary)]">
              {intent.description ?? 'No description was supplied for this intent.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-[20px] border border-[var(--color-border)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                Action
              </p>
              <p className="mt-2 font-medium text-[var(--color-text-primary)]">{intent.action}</p>
            </div>
            <div className="rounded-[20px] border border-[var(--color-border)] p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                Intent ID
              </p>
              <p className="mono mt-2 text-[var(--color-text-primary)]">{compactId(intent.id)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
            <span>{intent.connector?.name ?? 'No connector attached'}</span>
            <span>{formatShortDate(intent.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

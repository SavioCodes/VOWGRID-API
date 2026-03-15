import Link from 'next/link';
import { Badge, Button, Card, CardContent } from '@vowgrid/ui';
import type { ReceiptResponse } from '@vowgrid/contracts';
import { compactId, formatDuration, formatShortDate } from '@/lib/vowgrid/format';

export function ReceiptPanel({ receipt }: { receipt: ReceiptResponse }) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
              Receipt {compactId(receipt.id)}
            </p>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
              {receipt.summary}
            </h3>
          </div>
          <Badge tone="mint">{receipt.type}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-[var(--color-border)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Created</p>
            <p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
              {formatShortDate(receipt.createdAt)}
            </p>
          </div>
          <div className="rounded-[20px] border border-[var(--color-border)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Duration</p>
            <p className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
              {formatDuration(receipt.duration)}
            </p>
          </div>
          <div className="rounded-[20px] border border-[var(--color-border)] p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Intent</p>
            <p className="mono mt-2 text-sm font-medium text-[var(--color-text-primary)]">{compactId(receipt.intentId)}</p>
          </div>
        </div>
        <Link href={`/app/receipts/${receipt.id}`}>
          <Button tone="secondary">Open receipt detail</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

import Link from 'next/link';
import { Badge, Button, Card, CardContent } from '@vowgrid/ui';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/vowgrid/page-header';
import { PayloadViewer } from '@/components/vowgrid/payload-viewer';
import { getReceiptRecord } from '@/lib/vowgrid/repository';
import { compactId, formatDateTime, formatDuration } from '@/lib/vowgrid/format';

export default async function ReceiptPage({ params }: { params: Promise<{ receiptId: string }> }) {
  const { receiptId } = await params;
  const receipt = await getReceiptRecord(receiptId);

  if (!receipt) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Receipt detail"
        title={receipt.summary}
        description="Receipts are the proof layer for what actually happened. Keep them readable for operators and inspectable for developers."
        actions={
          <Link href={`/app/intents/${receipt.intent.id}`}>
            <Button tone="secondary">Open related intent</Button>
          </Link>
        }
      />
      <section className="flex flex-wrap gap-3">
        <Badge tone="mint">{receipt.type}</Badge>
        <Badge tone="neutral">{compactId(receipt.id)}</Badge>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
              Created
            </p>
            <p className="text-xl font-semibold text-[var(--color-text-primary)]">
              {formatDateTime(receipt.createdAt)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
              Duration
            </p>
            <p className="text-xl font-semibold text-[var(--color-text-primary)]">
              {formatDuration(receipt.duration)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">
              Intent
            </p>
            <p className="text-xl font-semibold text-[var(--color-text-primary)]">
              {receipt.intent.title}
            </p>
          </CardContent>
        </Card>
      </section>
      <PayloadViewer
        title="Receipt payload"
        description="Structured execution proof returned by the current adapter."
        payload={receipt.data}
      />
    </div>
  );
}

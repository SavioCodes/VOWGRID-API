import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Button, Card, CardContent } from '@vowgrid/ui';
import { getPreviewSnapshot } from '@/lib/vowgrid/repository';

export const dynamic = 'force-dynamic';

export default async function PreviewPage() {
  if (process.env.VOWGRID_ENABLE_PROVISIONAL_DATA !== 'true') {
    notFound();
  }

  const snapshot = await getPreviewSnapshot();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col gap-8 px-4 py-6 lg:px-6">
      <header className="surface-ring rounded-[36px] border border-[var(--color-border)] bg-[rgba(8,13,25,0.82)] px-6 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <Badge tone="warning">Explicit preview only</Badge>
            <div>
              <h1 className="text-4xl font-semibold tracking-[-0.06em] text-[var(--color-text-primary)]">
                Provisional workspace preview
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-text-secondary)]">
                This route exists only for local UI exploration. The authenticated product flow lives behind real session auth at <span className="mono">/app</span>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/login">
              <Button>Open real app</Button>
            </Link>
            <Link href="/">
              <Button tone="secondary">Back to site</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Preview state</p>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              {snapshot.workspaceName}
            </h2>
            <p className="text-sm leading-7 text-[var(--color-text-secondary)]">
              {snapshot.integration.description}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Intents</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{snapshot.intents.length}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Connectors</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                  {snapshot.connectors.connectors.length}
                </p>
              </div>
              <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Policies</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{snapshot.policies.length}</p>
              </div>
              <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">Audit events</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">
                  {snapshot.auditEvents.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Notes</p>
            {snapshot.integration.notes.map((note) => (
              <p key={note} className="text-sm leading-7 text-[var(--color-text-secondary)]">
                {note}
              </p>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

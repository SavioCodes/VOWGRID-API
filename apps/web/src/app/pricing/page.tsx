import Link from 'next/link';
import { Badge, Button } from '@vowgrid/ui';
import { PricingPageContent } from '@/components/vowgrid/pricing-page-content';

export default function PricingPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-16 px-4 py-6 lg:px-6">
        <header className="surface-ring rounded-[36px] border border-[var(--color-border)] bg-[rgba(8,13,25,0.8)] px-6 py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <Link
                href="/"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(79,124,255,0.24)] bg-[rgba(79,124,255,0.14)] text-lg font-semibold text-[var(--color-accent-soft)]"
              >
                VG
              </Link>
              <div>
                <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  VowGrid pricing
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Serious trust infrastructure with an accessible launch entry point.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">14-day free trial</Badge>
              <Link href="/signup">
                <Button>Start trial</Button>
              </Link>
              <Link href="/login">
                <Button tone="secondary">Log in</Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="space-y-5">
            <Badge tone="mint">Mercado Pago powered billing</Badge>
            <h1 className="max-w-5xl text-balance text-5xl font-semibold tracking-[-0.07em] text-[var(--color-text-primary)] md:text-7xl">
              Price VowGrid around governed execution value, not commodity API volume.
            </h1>
            <p className="max-w-3xl text-lg leading-8 text-[var(--color-text-secondary)]">
              Launch starts low enough for market validation, but the packaging still reflects what
              VowGrid really is: trust infrastructure for AI actions, approvals, receipts, rollback
              posture, and operator visibility.
            </p>
          </div>
          <div className="rounded-[30px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-6">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
              Commercial posture
            </p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-text-secondary)]">
              <p>Primary value metric: executed actions per month.</p>
              <p>Secondary usage guardrail: intents per month.</p>
              <p>No automatic overage charging in this launch release.</p>
              <p>
                Enterprise remains sales-assisted instead of pretending every deployment can be
                self-serve.
              </p>
            </div>
          </div>
        </section>

        <PricingPageContent />
      </div>
    </div>
  );
}

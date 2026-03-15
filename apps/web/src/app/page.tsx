import Link from 'next/link';
import { Badge, Button, Card, CardContent, MetricCard } from '@vowgrid/ui';

const workflow = [
  'Propose',
  'Simulate',
  'Evaluate policy',
  'Approve',
  'Execute',
  'Generate receipt',
  'Rollback visibility',
];

const principles = [
  'Make risky actions inspectable before they run.',
  'Preserve an approval chain operators can understand quickly.',
  'Leave behind durable proof and a visible rollback story.',
];

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-24 px-4 py-6 lg:px-6">
        <header className="surface-ring rounded-[36px] border border-[var(--color-border)] bg-[rgba(8,13,25,0.8)] px-6 py-5">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[rgba(79,124,255,0.24)] bg-[rgba(79,124,255,0.14)] text-lg font-semibold text-[var(--color-accent-soft)]">
                VG
              </div>
              <div>
                <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">VowGrid</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  The trust layer between AI agents and real-world actions.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="accent">Enterprise control plane</Badge>
              <Link href="/app">
                <Button>Open product</Button>
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-8">
            <div className="space-y-5">
              <Badge tone="mint">Every AI action needs context, permission, and proof.</Badge>
              <h1 className="max-w-5xl text-balance text-5xl font-semibold tracking-[-0.07em] text-[var(--color-text-primary)] md:text-7xl">
                Ship AI agents into the real world without losing control of what they touch.
              </h1>
              <p className="max-w-3xl text-lg leading-8 text-[var(--color-text-secondary)]">
                VowGrid turns risky automation into an accountable workflow. Operators can see intent, simulate consequences, evaluate policy, approve with context, monitor execution, and inspect receipts after the fact.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/app">
                <Button>Enter control plane</Button>
              </Link>
              <Link href="#workflow">
                <Button tone="secondary">See the trust workflow</Button>
              </Link>
            </div>
          </div>
          <Card className="overflow-hidden">
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">Operator signal</p>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                  One surface for intent, approvals, receipts, and rollback posture.
                </h2>
              </div>
              <div className="grid gap-3">
                {workflow.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center gap-4 rounded-[22px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(79,124,255,0.14)] text-sm font-semibold text-[var(--color-accent-soft)]">
                      {index + 1}
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)]">{step}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <MetricCard label="Decisions captured" value="100%" trend="Chain of proof">
            From simulation warnings through receipt payloads.
          </MetricCard>
          <MetricCard label="Operator posture" value="High signal" tone="mint" trend="Calm interface">
            Risk, state, and reversibility stay visible without dashboard clutter.
          </MetricCard>
          <MetricCard label="Rollback honesty" value="Explicit" tone="warning" trend="No false safety">
            Connectors declare whether rollback is supported, partial, or unavailable.
          </MetricCard>
        </section>

        <section id="workflow" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--color-accent-soft)]">Why teams use it</p>
                <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)]">
                  Serious automation needs a serious trust layer.
                </h2>
              </div>
              <div className="space-y-4">
                {principles.map((principle) => (
                  <div key={principle} className="rounded-[22px] border border-[var(--color-border)] px-4 py-4">
                    <p className="text-base leading-7 text-[var(--color-text-secondary)]">{principle}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[var(--color-border)] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">For operators</p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  Approval clarity
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Timelines show who approved, what policy mattered, which connector will execute, and what receipt will be generated.
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--color-border)] p-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">For developers</p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  Contract-aware integration
                </h3>
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                  Shared contracts drive the UI, and any missing backend surface is called out instead of papered over with made-up states.
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--color-border)] p-5 md:col-span-2">
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-text-dim)]">Control plane feel</p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  Premium, modern, and security-grade without visual noise.
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
                  Dark-first surfaces, precise spacing, strong typography, and restrained motion keep the product confident without falling into generic AI-dashboard styling.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

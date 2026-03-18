'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@vowgrid/ui';
import type { BillingCycle } from '@vowgrid/contracts';
import {
  billingPlans,
  formatApprovalsMode,
  formatPlanPrice,
  formatSupportTier,
  getEnterpriseContactHref,
} from '@/lib/vowgrid/billing';

const faqItems = [
  {
    question: 'How does the 14-day trial work?',
    answer:
      'The trial is managed by the VowGrid backend, not by Mercado Pago. The workspace keeps live visibility into trial state, countdown, and what will be blocked when the trial expires.',
  },
  {
    question: 'What counts toward billing?',
    answer:
      'The primary commercial metric is executed actions per month. Intents per month are tracked as a secondary limit so teams can see proposal volume before they hit execution pressure.',
  },
  {
    question: 'Do you charge overages automatically?',
    answer:
      'Paid subscriptions can accrue automatic overage billing for executed actions and intents after the included allowance is exceeded. Trials still stop at their included limits.',
  },
  {
    question: 'Why is Enterprise marked as contact sales?',
    answer:
      'Enterprise deals require custom limits, support, and governance posture. Self-serve checkout is intentionally disabled for that segment in this launch release.',
  },
];

export function PricingPageContent() {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const enterpriseContactHref = getEnterpriseContactHref();

  return (
    <div className="space-y-10">
      <section className="grid gap-4 xl:grid-cols-4">
        {billingPlans.map((plan) => (
          <Card
            key={plan.key}
            className={plan.key === 'pro' ? 'border-[var(--color-border-highlight)]' : undefined}
          >
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                    {plan.label}
                  </h2>
                  <Badge tone={plan.key === 'pro' ? 'accent' : 'neutral'}>{plan.badge}</Badge>
                </div>
                <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                  {plan.key === 'launch'
                    ? 'For first trusted automations and early operational validation.'
                    : plan.key === 'pro'
                      ? 'For teams that need advanced approvals and heavier production signal.'
                      : plan.key === 'business'
                        ? 'For governed, multi-team operations with materially higher action volume.'
                        : 'For custom trust infrastructure, procurement review, and enterprise controls.'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)]">
                  {formatPlanPrice(plan, cycle)}
                </p>
                {plan.selfServeCheckout ? (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Also available as{' '}
                    {formatPlanPrice(plan, cycle === 'monthly' ? 'yearly' : 'monthly')}.
                  </p>
                ) : (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Starting around R$ {plan.suggestedStartingTicketBrl?.toLocaleString('pt-BR')}{' '}
                    with custom scoping.
                  </p>
                )}
              </div>

              <div className="space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                <p>{plan.limits.executedActionsPerMonth ?? 'Custom'} executed actions / month</p>
                <p>{plan.limits.intentsPerMonth ?? 'Custom'} intents / month</p>
                <p>{plan.limits.activeConnectors ?? 'Custom'} active connectors</p>
                <p>{plan.limits.internalUsers ?? 'Custom'} internal users</p>
                <p>{plan.limits.auditRetentionDays ?? 'Custom'} days of audit retention</p>
                <p>
                  {plan.features.advancedPolicies
                    ? 'Advanced policies included'
                    : 'Core policy types only'}
                </p>
                <p>{formatApprovalsMode(plan.features.approvalsMode)}</p>
                <p>{formatSupportTier(plan.features.supportTier)}</p>
              </div>

              {plan.selfServeCheckout ? (
                <Link href={plan.key === 'launch' ? '/signup' : '/login'}>
                  <Button block>
                    {plan.key === 'launch' ? 'Start 14-day trial' : 'Choose plan after login'}
                  </Button>
                </Link>
              ) : enterpriseContactHref ? (
                <Link href={enterpriseContactHref}>
                  <Button block tone="secondary">
                    Contact sales
                  </Button>
                </Link>
              ) : (
                <Button block tone="secondary" disabled>
                  Enterprise contact not configured
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
              Pricing view
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              Compare the plans in the commercial language operators actually care about.
            </h2>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-1">
            <button
              className={`rounded-full px-4 py-2 text-sm font-medium ${cycle === 'monthly' ? 'bg-[var(--color-accent)] text-[var(--color-bg)]' : 'text-[var(--color-text-secondary)]'}`}
              type="button"
              onClick={() => setCycle('monthly')}
            >
              Monthly
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm font-medium ${cycle === 'yearly' ? 'bg-[var(--color-accent)] text-[var(--color-bg)]' : 'text-[var(--color-text-secondary)]'}`}
              type="button"
              onClick={() => setCycle('yearly')}
            >
              Yearly
            </button>
          </div>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Capability</TableHeaderCell>
              {billingPlans.map((plan) => (
                <TableHeaderCell key={plan.key}>{plan.label}</TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Price</TableCell>
              {billingPlans.map((plan) => (
                <TableCell key={plan.key}>{formatPlanPrice(plan, cycle)}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Executed actions / month</TableCell>
              {billingPlans.map((plan) => (
                <TableCell key={plan.key}>
                  {plan.limits.executedActionsPerMonth ?? 'Custom'}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Intents / month</TableCell>
              {billingPlans.map((plan) => (
                <TableCell key={plan.key}>{plan.limits.intentsPerMonth ?? 'Custom'}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Active connectors</TableCell>
              {billingPlans.map((plan) => (
                <TableCell key={plan.key}>{plan.limits.activeConnectors ?? 'Custom'}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Internal users</TableCell>
              {billingPlans.map((plan) => (
                <TableCell key={plan.key}>{plan.limits.internalUsers ?? 'Custom'}</TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Audit retention</TableCell>
              {billingPlans.map((plan) => (
                <TableCell key={plan.key}>
                  {plan.limits.auditRetentionDays === null
                    ? 'Custom'
                    : `${plan.limits.auditRetentionDays} days`}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Advanced policies</TableCell>
              {billingPlans.map((plan) => (
                <TableCell key={plan.key}>
                  {plan.features.advancedPolicies ? 'Included' : 'No'}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Approvals mode</TableCell>
              {billingPlans.map((plan) => (
                <TableCell key={plan.key}>
                  {formatApprovalsMode(plan.features.approvalsMode)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Support tier</TableCell>
              {billingPlans.map((plan) => (
                <TableCell key={plan.key}>{formatSupportTier(plan.features.supportTier)}</TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {faqItems.map((item) => (
          <Card key={item.question}>
            <CardContent className="space-y-3">
              <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                {item.question}
              </h3>
              <p className="text-sm leading-7 text-[var(--color-text-secondary)]">{item.answer}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}

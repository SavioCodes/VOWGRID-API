import Link from 'next/link';
import { Badge, Button, Card, CardContent, EmptyState } from '@vowgrid/ui';
import { BillingStatusBadge } from '@/components/vowgrid/billing-status-badge';
import { IntegrationBanner } from '@/components/vowgrid/integration-banner';
import { PageHeader } from '@/components/vowgrid/page-header';
import { UsageMeter } from '@/components/vowgrid/usage-meter';
import {
  billingPlans,
  formatApprovalsMode,
  formatBrlCents,
  formatInvoiceTitle,
  getEnterpriseContactHref,
  formatPlanPrice,
  formatSupportTier,
  getCurrentPlan,
  getUpgradeRecommendation,
  getWorkspaceBillingStatus,
} from '@/lib/vowgrid/billing';
import { getWorkspaceSnapshot } from '@/lib/vowgrid/repository';
import { cancelSubscriptionAction, startCheckoutAction } from './actions';

export default async function BillingPage() {
  const snapshot = await getWorkspaceSnapshot();
  const account = snapshot.billingAccount;
  const currentPlan = getCurrentPlan(account);
  const currentStatus = getWorkspaceBillingStatus(account);
  const recommendedUpgrade = getUpgradeRecommendation(account);
  const enterpriseContactHref = getEnterpriseContactHref();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Turn trust infrastructure into a clear commercial surface with real limits, real trials, and an honest upgrade path."
        description="Billing truth stays inside the VowGrid backend. This page shows the current plan, subscription status, trial countdown, usage pressure, automatic overage posture, invoices, and the current Mercado Pago setup state for the workspace."
        actions={
          <Link href="/pricing">
            <Button tone="secondary">View public pricing</Button>
          </Link>
        }
      />
      <IntegrationBanner integration={snapshot.integration} />

      {account ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardContent className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
                      Current workspace
                    </p>
                    <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)]">
                      {currentPlan?.label ?? 'No paid plan yet'}
                    </h2>
                    <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)]">
                      {account.entitlements.source === 'trial'
                        ? `Trial currently mirrors the ${currentPlan?.label ?? 'Pro'} entitlement profile so teams can evaluate advanced controls before converting.`
                        : account.entitlements.readOnlyMode
                          ? 'The workspace is currently in read-only billing mode. Existing receipts, audit history, and control-plane visibility remain accessible.'
                          : 'The workspace can keep proposing, approving, executing, and auditing actions inside the current commercial envelope.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <BillingStatusBadge status={currentStatus} />
                    {account.entitlements.source === 'trial' ? (
                      <Badge tone="accent">14-day trial</Badge>
                    ) : null}
                    {currentPlan ? <Badge tone="neutral">{currentPlan.badge}</Badge> : null}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                      Plan source
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
                      {account.entitlements.source === 'subscription'
                        ? 'Paid subscription'
                        : account.entitlements.source === 'trial'
                          ? 'App-managed trial'
                          : 'Upgrade required'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                      Trial remaining
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
                      {account.trial.isActive
                        ? `${account.trial.daysRemaining} day(s)`
                        : 'Not active'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                      Support tier
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
                      {currentPlan
                        ? formatSupportTier(currentPlan.features.supportTier)
                        : 'Upgrade required'}
                    </p>
                  </div>
                  <div className="rounded-[22px] border border-[var(--color-border)] p-4">
                    <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                      Overage
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
                      {account.entitlements.automaticOverageBilling
                        ? 'Automatic billing enabled'
                        : 'Hard limit enforcement'}
                    </p>
                  </div>
                </div>

                {account.entitlements.warnings.length > 0 ||
                account.entitlements.blocks.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[22px] border border-[rgba(245,185,66,0.24)] bg-[rgba(245,185,66,0.08)] p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-warning)]">
                        Warnings
                      </p>
                      <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                        {account.entitlements.warnings.length > 0 ? (
                          account.entitlements.warnings.map((warning) => (
                            <p key={warning}>{warning}</p>
                          ))
                        ) : (
                          <p>No current warning thresholds are firing.</p>
                        )}
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-[rgba(245,89,89,0.24)] bg-[rgba(245,89,89,0.08)] p-4">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-danger)]">
                        Blocks
                      </p>
                      <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                        {account.entitlements.blocks.length > 0 ? (
                          account.entitlements.blocks.map((block) => <p key={block}>{block}</p>)
                        ) : (
                          <p>No hard billing blocks are active right now.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card id="billing-provider">
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
                    Mercado Pago
                  </p>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                    Provider readiness
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={account.provider.configured ? 'mint' : 'warning'}>
                    {account.provider.configured ? 'Configured' : 'Needs setup'}
                  </Badge>
                  <Badge tone={account.provider.checkoutEnabled ? 'accent' : 'neutral'}>
                    {account.provider.checkoutEnabled ? 'Checkout enabled' : 'Checkout disabled'}
                  </Badge>
                </div>
                <div className="space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {account.provider.manualSetupRequired.length > 0 ? (
                    account.provider.manualSetupRequired.map((item) => <p key={item}>{item}</p>)
                  ) : (
                    <p>
                      Mercado Pago env and webhook configuration look ready for self-serve checkout.
                    </p>
                  )}
                </div>
                {account.subscription ? (
                  <form action={cancelSubscriptionAction} className="space-y-3">
                    <input type="hidden" name="immediate" value="false" />
                    <Button
                      type="submit"
                      tone="ghost"
                      disabled={account.subscription.status !== 'active'}
                    >
                      Cancel at period end
                    </Button>
                  </form>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
                Usage and limits
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Make limit pressure visible before it turns into billing confusion.
              </h2>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {account.usage.metrics.map((metric) => (
                <UsageMeter key={metric.key} metric={metric} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
                Invoices and adjustments
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                Overage and proration stay inspectable instead of turning into opaque provider math.
              </h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {account.invoices.length > 0 ? (
                account.invoices.map((invoice) => (
                  <Card key={invoice.id}>
                    <CardContent className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
                            {formatInvoiceTitle(invoice)}
                          </p>
                          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                            {formatBrlCents(invoice.totalBrlCents)}
                          </h3>
                        </div>
                        <Badge tone={invoice.status === 'paid' ? 'mint' : 'warning'}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                        {invoice.lineItems.map((item) => (
                          <p key={item.id}>
                            {item.label}: {formatBrlCents(item.subtotalBrlCents)}
                          </p>
                        ))}
                        <p>Tax: {formatBrlCents(invoice.taxAmountBrlCents)}</p>
                        {invoice.dueAt ? (
                          <p>Due: {new Date(invoice.dueAt).toLocaleDateString('pt-BR')}</p>
                        ) : null}
                      </div>
                      {invoice.paymentUrl ? (
                        <Link href={invoice.paymentUrl}>
                          <Button block tone="secondary">
                            Open invoice checkout
                          </Button>
                        </Link>
                      ) : (
                        <Button block tone="secondary" disabled>
                          No payment link yet
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  title="No invoice activity yet"
                  description="Automatic overage and proration invoices will appear here when paid workspaces exceed included usage or change plan mid-cycle."
                />
              )}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
                  Plan comparison
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
                  Upgrade paths stay aligned with executed action value, not raw API volume.
                </h2>
              </div>
              <Badge tone="neutral">Recommended: {recommendedUpgrade}</Badge>
            </div>
            <div className="grid gap-4 xl:grid-cols-4">
              {billingPlans.map((plan) => {
                const isCurrent = account.entitlements.effectivePlanKey === plan.key;

                return (
                  <Card
                    key={plan.key}
                    className={isCurrent ? 'border-[var(--color-border-highlight)]' : undefined}
                  >
                    <CardContent className="space-y-5">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-text-primary)]">
                            {plan.label}
                          </h3>
                          {isCurrent ? (
                            <Badge tone="accent">Current</Badge>
                          ) : (
                            <Badge tone="neutral">{plan.badge}</Badge>
                          )}
                        </div>
                        <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                          {plan.displayText}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                        <p>
                          {plan.limits.executedActionsPerMonth ?? 'Custom'} executed actions / month
                        </p>
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

                      <div className="space-y-3">
                        {account.subscription?.planKey &&
                        account.subscription.planKey !== plan.key &&
                        account.subscription.status === 'active' ? (
                          <div className="rounded-[18px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                            Changing plans mid-cycle creates a proration credit and charge on the
                            current billing period instead of hiding the delta inside provider
                            metadata.
                          </div>
                        ) : null}
                        {plan.selfServeCheckout ? (
                          <>
                            <form action={startCheckoutAction}>
                              <input type="hidden" name="planKey" value={plan.key} />
                              <input type="hidden" name="billingCycle" value="monthly" />
                              <Button
                                type="submit"
                                block
                                disabled={!account.provider.checkoutEnabled || isCurrent}
                              >
                                {isCurrent
                                  ? 'Current monthly plan'
                                  : `Choose ${formatPlanPrice(plan, 'monthly')}`}
                              </Button>
                            </form>
                            <form action={startCheckoutAction}>
                              <input type="hidden" name="planKey" value={plan.key} />
                              <input type="hidden" name="billingCycle" value="yearly" />
                              <Button
                                type="submit"
                                block
                                tone="secondary"
                                disabled={!account.provider.checkoutEnabled || isCurrent}
                              >
                                {isCurrent
                                  ? 'Current yearly plan'
                                  : `Choose ${formatPlanPrice(plan, 'yearly')}`}
                              </Button>
                            </form>
                          </>
                        ) : enterpriseContactHref ? (
                          <Link href={enterpriseContactHref}>
                            <Button block tone="secondary">
                              Talk to sales
                            </Button>
                          </Link>
                        ) : (
                          <Button block tone="secondary" disabled>
                            Enterprise contact not configured
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <EmptyState
          title="Billing data unavailable"
          description="The workspace billing surface could not be resolved from the live session adapter. Confirm the API connection and current workspace billing state."
        />
      )}
    </div>
  );
}

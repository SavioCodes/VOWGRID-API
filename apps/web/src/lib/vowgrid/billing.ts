import type {
  BillingAccountResponse,
  BillingCycle,
  BillingPlanCatalogEntry,
  BillingPlanKey,
  BillingSubscriptionStatus,
  UsageMetricResponse,
} from '@vowgrid/contracts';
import { PLAN_CATALOG } from '@vowgrid/contracts';

export const billingPlans = Object.values(PLAN_CATALOG);

export function getEnterpriseContactHref() {
  const email = process.env.NEXT_PUBLIC_VOWGRID_ENTERPRISE_CONTACT_EMAIL?.trim();

  if (!email) {
    return null;
  }

  return `mailto:${email}?subject=VowGrid%20Enterprise`;
}

export function formatBrlAmount(amount: number | null) {
  if (amount === null) {
    return 'Sob consulta';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPlanPrice(plan: BillingPlanCatalogEntry, cycle: BillingCycle) {
  const amount = cycle === 'monthly' ? plan.monthlyBrl : plan.yearlyBrl;

  if (amount === null) {
    return plan.displayText;
  }

  return `${formatBrlAmount(amount)}${cycle === 'monthly' ? '/month' : '/year'}`;
}

export function formatSupportTier(value: BillingPlanCatalogEntry['features']['supportTier']) {
  switch (value) {
    case 'priority_email':
      return 'Priority email';
    case 'priority':
      return 'Priority support';
    case 'enterprise':
      return 'Enterprise support';
    default:
      return 'Email support';
  }
}

export function formatApprovalsMode(value: BillingPlanCatalogEntry['features']['approvalsMode']) {
  switch (value) {
    case 'advanced':
      return 'Advanced approvals';
    case 'custom':
      return 'Custom approvals';
    default:
      return 'Basic approvals';
  }
}

export function getBillingStatusTone(status: BillingSubscriptionStatus) {
  switch (status) {
    case 'active':
      return 'mint';
    case 'trialing':
      return 'accent';
    case 'past_due':
      return 'danger';
    case 'paused':
      return 'warning';
    case 'canceled':
    case 'expired':
      return 'danger';
    default:
      return 'neutral';
  }
}

export function getWorkspaceBillingStatus(
  account: BillingAccountResponse | null,
): BillingSubscriptionStatus {
  if (!account) {
    return 'incomplete';
  }

  if (account.subscription?.status) {
    return account.subscription.status;
  }

  if (account.trial.isActive) {
    return 'trialing';
  }

  if (account.trial.isExpired) {
    return 'expired';
  }

  return 'incomplete';
}

export function getCurrentPlan(
  account: BillingAccountResponse | null,
): BillingPlanCatalogEntry | null {
  const planKey = account?.entitlements.effectivePlanKey ?? null;
  return planKey ? PLAN_CATALOG[planKey] : null;
}

export function formatMetricSummary(metric: UsageMetricResponse) {
  if (metric.limit === null) {
    return `${metric.used} ${metric.unit}`;
  }

  return `${metric.used.toLocaleString('pt-BR')} / ${metric.limit.toLocaleString('pt-BR')} ${metric.unit}`;
}

export function getUpgradeRecommendation(account: BillingAccountResponse | null): BillingPlanKey {
  const currentPlan = account?.entitlements.effectivePlanKey ?? null;

  if (!currentPlan || currentPlan === 'launch') {
    return 'pro';
  }

  if (currentPlan === 'pro') {
    return 'business';
  }

  return 'enterprise';
}

import type {
  BillingAccountResponse,
  BillingPlanLimits,
  BillingPlanKey,
  TrialStateResponse,
  UsageMetricKey,
  WorkspaceSubscriptionResponse,
} from '@vowgrid/contracts';
import { PLAN_CATALOG, BILLING_TRIAL_DAYS } from '@vowgrid/contracts';
import { prisma } from '../../lib/prisma.js';
import { NotFoundError, PaymentRequiredError } from '../../common/errors.js';
import { DEFAULT_TRIAL_PLAN_KEY, ADVANCED_POLICY_TYPES, getPlan } from './catalog.js';
import {
  parseBillingCustomerMetadata,
  resolveBillingTaxRateBps,
  serializeBillingCustomer,
} from './customer.js';
import { getMercadoPagoProviderState } from './mercado-pago.js';
import { getCurrentUsageMetrics, incrementMonthlyUsageCounter } from './usage.js';
import { listWorkspaceInvoices, recordAutomaticOverageBilling } from './invoices.js';

const EMPTY_LIMITS: BillingPlanLimits = {
  workspaces: 0,
  internalUsers: 0,
  activeConnectors: 0,
  intentsPerMonth: 0,
  executedActionsPerMonth: 0,
  auditRetentionDays: 0,
};

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getDaysRemaining(endsAt?: Date | null) {
  if (!endsAt) {
    return 0;
  }

  return Math.max(Math.ceil((endsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)), 0);
}

function pickBillingContact(users: Array<{ email: string; role: string }>) {
  const rolePriority = ['owner', 'admin', 'member', 'viewer'];
  return (
    [...users].sort(
      (left, right) => rolePriority.indexOf(left.role) - rolePriority.indexOf(right.role),
    )[0] ?? null
  );
}

async function ensureBillingState(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      memberships: {
        where: {
          disabledAt: null,
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      },
      billingCustomer: true,
      subscription: true,
      trialState: true,
    },
  });

  if (!workspace) {
    throw new NotFoundError('Workspace', workspaceId);
  }

  let trialState = workspace.trialState;

  if (!trialState) {
    trialState = await prisma.trialState.create({
      data: {
        workspaceId,
        status: 'active',
        startsAt: workspace.createdAt,
        endsAt: addDays(workspace.createdAt, BILLING_TRIAL_DAYS),
      },
    });
  }

  if (trialState.status === 'active' && trialState.endsAt <= new Date()) {
    trialState = await prisma.trialState.update({
      where: { workspaceId },
      data: {
        status: 'expired',
        expiredAt: new Date(),
      },
    });
  }

  let billingCustomer = workspace.billingCustomer;

  if (!billingCustomer) {
    const contact = pickBillingContact(
      workspace.memberships.map((membership) => ({
        email: membership.user.email,
        role: membership.role,
      })),
    );

    if (contact) {
      billingCustomer = await prisma.billingCustomer.create({
        data: {
          workspaceId,
          email: contact.email,
          legalName: workspace.name,
        },
      });
    }
  }

  let subscription = workspace.subscription;

  if (subscription?.status === 'active' && trialState.status === 'active') {
    trialState = await prisma.trialState.update({
      where: { workspaceId },
      data: {
        status: 'converted',
        convertedAt: subscription.startedAt ?? new Date(),
      },
    });
  }

  return {
    workspace,
    billingCustomer: billingCustomer ?? null,
    subscription: subscription ?? null,
    trialState,
  };
}

function toSubscriptionResponse(
  subscription: {
    id: string;
    workspaceId: string;
    provider: string;
    planKey: string | null;
    billingCycle: string | null;
    status: string;
    mercadoPagoPreapprovalId: string | null;
    mercadoPagoPlanId: string | null;
    checkoutUrl: string | null;
    externalReference: string | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    startedAt: Date | null;
    canceledAt: Date | null;
    lastProviderSyncAt: Date | null;
    cancelAtPeriodEnd: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null,
): WorkspaceSubscriptionResponse | null {
  if (!subscription) {
    return null;
  }

  return {
    id: subscription.id,
    workspaceId: subscription.workspaceId,
    provider: 'mercado_pago',
    planKey: subscription.planKey as BillingPlanKey | null,
    billingCycle: subscription.billingCycle as 'monthly' | 'yearly' | null,
    status: subscription.status as WorkspaceSubscriptionResponse['status'],
    providerSubscriptionId: subscription.mercadoPagoPreapprovalId,
    providerPlanId: subscription.mercadoPagoPlanId,
    checkoutUrl: subscription.checkoutUrl,
    externalReference: subscription.externalReference,
    currentPeriodStart: subscription.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
    startedAt: subscription.startedAt?.toISOString() ?? null,
    canceledAt: subscription.canceledAt?.toISOString() ?? null,
    lastProviderSyncAt: subscription.lastProviderSyncAt?.toISOString() ?? null,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    createdAt: subscription.createdAt.toISOString(),
    updatedAt: subscription.updatedAt.toISOString(),
  };
}

function toTrialResponse(trialState: {
  status: string;
  startsAt: Date;
  endsAt: Date;
  convertedAt: Date | null;
}): TrialStateResponse {
  return {
    status: trialState.status as TrialStateResponse['status'],
    startedAt: trialState.startsAt.toISOString(),
    endsAt: trialState.endsAt.toISOString(),
    convertedAt: trialState.convertedAt?.toISOString() ?? null,
    daysRemaining: trialState.status === 'active' ? getDaysRemaining(trialState.endsAt) : 0,
    isActive: trialState.status === 'active',
    isExpired: trialState.status === 'expired',
  };
}

function resolveEntitlements({
  subscription,
  trial,
  customer,
}: {
  subscription: WorkspaceSubscriptionResponse | null;
  trial: TrialStateResponse;
  customer: {
    metadata: unknown;
  } | null;
}) {
  let source: BillingAccountResponse['entitlements']['source'] = 'none';
  let effectivePlanKey: BillingPlanKey | null = null;
  let limits = EMPTY_LIMITS;
  let supportTier: BillingAccountResponse['entitlements']['supportTier'] = 'email';
  let advancedPolicies = false;
  let approvalsMode: BillingAccountResponse['entitlements']['approvalsMode'] = 'basic';
  let readOnlyMode = true;
  let selfServeCheckout = true;
  let automaticOverageBilling = false;
  let taxRateBps = resolveBillingTaxRateBps(customer);
  const warnings: string[] = [];
  const blocks: string[] = [];

  if (subscription?.planKey && subscription.status === 'active') {
    const plan = getPlan(subscription.planKey);
    source = 'subscription';
    effectivePlanKey = plan.key;
    limits = plan.limits;
    supportTier = plan.features.supportTier;
    advancedPolicies = plan.features.advancedPolicies;
    approvalsMode = plan.features.approvalsMode;
    readOnlyMode = false;
    selfServeCheckout = plan.selfServeCheckout;
    automaticOverageBilling =
      plan.overage.intentsUnitBrlCents !== null ||
      plan.overage.executedActionsUnitBrlCents !== null;
  } else if (subscription?.planKey) {
    const plan = getPlan(subscription.planKey);
    source = 'subscription';
    effectivePlanKey = plan.key;
    limits = plan.limits;
    supportTier = plan.features.supportTier;
    advancedPolicies = plan.features.advancedPolicies;
    approvalsMode = plan.features.approvalsMode;
    readOnlyMode = true;
    selfServeCheckout = plan.selfServeCheckout;
    automaticOverageBilling = false;
    blocks.push(
      'The paid subscription is not currently active. Upgrade or reactivate billing to resume write actions.',
    );
  } else if (trial.isActive) {
    const plan = PLAN_CATALOG[DEFAULT_TRIAL_PLAN_KEY];
    source = 'trial';
    effectivePlanKey = plan.key;
    limits = plan.limits;
    supportTier = plan.features.supportTier;
    advancedPolicies = plan.features.advancedPolicies;
    approvalsMode = plan.features.approvalsMode;
    readOnlyMode = false;
    selfServeCheckout = true;
    automaticOverageBilling = false;
    warnings.push(`Free trial active: ${trial.daysRemaining} day(s) remaining.`);
  } else if (trial.isExpired) {
    source = 'expired_trial';
    blocks.push('The 14-day free trial has expired. Upgrade to restore write access.');
  }

  return {
    source,
    effectivePlanKey,
    readOnlyMode,
    selfServeCheckout,
    automaticOverageBilling,
    supportTier,
    advancedPolicies,
    approvalsMode,
    limits,
    taxRateBps,
    warnings,
    blocks,
  } as BillingAccountResponse['entitlements'];
}

export async function getBillingAccount(workspaceId: string): Promise<BillingAccountResponse> {
  const state = await ensureBillingState(workspaceId);
  const trial = toTrialResponse(state.trialState);
  const subscription = toSubscriptionResponse(state.subscription);
  const entitlements = resolveEntitlements({
    subscription,
    trial,
    customer: state.billingCustomer,
  });
  const customerMetadata = parseBillingCustomerMetadata(state.billingCustomer?.metadata);
  const [usage, invoices] = await Promise.all([
    getCurrentUsageMetrics(workspaceId, entitlements.limits, {
      intentsOverageAllowed:
        entitlements.automaticOverageBilling && entitlements.source === 'subscription',
      executedActionsOverageAllowed:
        entitlements.automaticOverageBilling && entitlements.source === 'subscription',
    }),
    listWorkspaceInvoices(workspaceId),
  ]);

  for (const metric of usage) {
    if (metric.status === 'warning') {
      entitlements.warnings.push(`${metric.label} is nearing the plan limit.`);
    }

    if (metric.status === 'overage') {
      entitlements.warnings.push(
        `${metric.label} is above the included plan allowance and is now billing as overage.`,
      );
    }

    if (metric.status === 'blocked') {
      entitlements.blocks.push(`${metric.label} has reached the current plan limit.`);
    }
  }

  return {
    workspaceId,
    customer: state.billingCustomer ? serializeBillingCustomer(state.billingCustomer) : null,
    activeCoupon: customerMetadata.activeCoupon ?? null,
    subscription,
    trial,
    entitlements,
    usage: { metrics: usage },
    invoices,
    provider: getMercadoPagoProviderState(),
  };
}

function requireWritableBilling(account: BillingAccountResponse) {
  if (account.entitlements.readOnlyMode) {
    throw new PaymentRequiredError(
      'This workspace is in read-only billing mode. Upgrade or reactivate billing to continue.',
      'BILLING_READ_ONLY_MODE',
      {
        source: account.entitlements.source,
        blocks: account.entitlements.blocks,
      },
    );
  }
}

function getUsageMetric(account: BillingAccountResponse, key: UsageMetricKey) {
  return account.usage.metrics.find((metric) => metric.key === key);
}

export async function assertCanCreateIntent(workspaceId: string) {
  const account = await getBillingAccount(workspaceId);
  requireWritableBilling(account);
  const metric = getUsageMetric(account, 'intents');

  if (metric?.status === 'blocked' && !metric.overageAllowed) {
    throw new PaymentRequiredError(
      'This workspace has reached its monthly intent limit. Upgrade to continue creating new intents.',
      'BILLING_INTENT_LIMIT_REACHED',
      metric,
    );
  }

  return account;
}

export async function assertCanQueueExecution(workspaceId: string) {
  const account = await getBillingAccount(workspaceId);
  requireWritableBilling(account);
  const metric = getUsageMetric(account, 'executed_actions');

  if (metric?.status === 'blocked' && !metric.overageAllowed) {
    throw new PaymentRequiredError(
      'This workspace has reached its monthly executed action limit. Upgrade to continue executing critical actions.',
      'BILLING_EXECUTION_LIMIT_REACHED',
      metric,
    );
  }

  return account;
}

export async function assertCanCreateConnector(workspaceId: string, enabled: boolean) {
  const account = await getBillingAccount(workspaceId);
  requireWritableBilling(account);

  if (!enabled) {
    return account;
  }

  const metric = getUsageMetric(account, 'active_connectors');

  if (metric?.status === 'blocked') {
    throw new PaymentRequiredError(
      'This workspace has reached its active connector limit. Upgrade to connect more action surfaces.',
      'BILLING_CONNECTOR_LIMIT_REACHED',
      metric,
    );
  }

  return account;
}

export async function assertCanManageInternalUsers(workspaceId: string) {
  const account = await getBillingAccount(workspaceId);
  requireWritableBilling(account);
  const metric = getUsageMetric(account, 'internal_users');

  if (metric?.status === 'blocked') {
    throw new PaymentRequiredError(
      'This workspace has reached its internal user limit. Upgrade to add or re-enable more members.',
      'BILLING_INTERNAL_USER_LIMIT_REACHED',
      metric,
    );
  }

  return account;
}

export async function assertCanCreatePolicy(workspaceId: string, policyType: string) {
  const account = await getBillingAccount(workspaceId);
  requireWritableBilling(account);

  if (ADVANCED_POLICY_TYPES.has(policyType) && !account.entitlements.advancedPolicies) {
    throw new PaymentRequiredError(
      'Advanced policy types are not available on the current plan. Upgrade to Pro or Business to use this policy.',
      'BILLING_ADVANCED_POLICIES_REQUIRED',
      { policyType },
    );
  }

  return account;
}

export async function assertCanRequireApprovalCount(workspaceId: string, requiredCount: number) {
  const account = await getBillingAccount(workspaceId);
  requireWritableBilling(account);

  if (requiredCount > 1 && account.entitlements.approvalsMode !== 'advanced') {
    throw new PaymentRequiredError(
      'Multi-step approvals are not available on the current plan. Upgrade to Pro or Business to require more than one approver.',
      'BILLING_ADVANCED_APPROVALS_REQUIRED',
      { requiredCount },
    );
  }

  return account;
}

export async function trackIntentCreation(workspaceId: string, account: BillingAccountResponse) {
  const counter = await incrementMonthlyUsageCounter(
    workspaceId,
    'intents',
    1,
    account.entitlements.limits.intentsPerMonth,
  );

  if (account.entitlements.automaticOverageBilling && account.subscription?.status === 'active') {
    await recordAutomaticOverageBilling({
      workspaceId,
      subscriptionId: account.subscription.id,
      planKey: account.subscription.planKey ?? null,
      metric: 'intents',
      used: counter.count,
      limit: account.entitlements.limits.intentsPerMonth,
    });
  }

  return counter;
}

export async function trackExecutionStart(workspaceId: string, account: BillingAccountResponse) {
  const counter = await incrementMonthlyUsageCounter(
    workspaceId,
    'executed_actions',
    1,
    account.entitlements.limits.executedActionsPerMonth,
  );

  if (account.entitlements.automaticOverageBilling && account.subscription?.status === 'active') {
    await recordAutomaticOverageBilling({
      workspaceId,
      subscriptionId: account.subscription.id,
      planKey: account.subscription.planKey ?? null,
      metric: 'executed_actions',
      used: counter.count,
      limit: account.entitlements.limits.executedActionsPerMonth,
    });
  }

  return counter;
}

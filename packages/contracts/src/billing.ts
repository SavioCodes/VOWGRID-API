import { z } from 'zod';

export const BILLING_PLAN_KEYS = ['launch', 'pro', 'business', 'enterprise'] as const;
export const SELF_SERVE_BILLING_PLAN_KEYS = ['launch', 'pro', 'business'] as const;
export const BILLING_CYCLES = ['monthly', 'yearly'] as const;
export const BILLING_SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'paused',
  'canceled',
  'expired',
  'incomplete',
] as const;
export const BILLING_PROVIDER_KEYS = ['mercado_pago'] as const;
export const TRIAL_STATUSES = ['active', 'expired', 'converted'] as const;
export const SUPPORT_TIERS = ['email', 'priority_email', 'priority', 'enterprise'] as const;
export const APPROVALS_MODES = ['basic', 'advanced'] as const;
export const USAGE_METRIC_KEYS = [
  'workspaces',
  'internal_users',
  'active_connectors',
  'intents',
  'executed_actions',
] as const;
export const USAGE_METRIC_STATUSES = ['ok', 'warning', 'blocked'] as const;
export const ENTITLEMENT_SOURCES = ['trial', 'subscription', 'expired_trial', 'none'] as const;

export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number];
export type SelfServeBillingPlanKey = (typeof SELF_SERVE_BILLING_PLAN_KEYS)[number];
export type BillingCycle = (typeof BILLING_CYCLES)[number];
export type BillingSubscriptionStatus = (typeof BILLING_SUBSCRIPTION_STATUSES)[number];
export type BillingProviderKey = (typeof BILLING_PROVIDER_KEYS)[number];
export type TrialStatus = (typeof TRIAL_STATUSES)[number];
export type SupportTier = (typeof SUPPORT_TIERS)[number];
export type ApprovalsMode = (typeof APPROVALS_MODES)[number];
export type UsageMetricKey = (typeof USAGE_METRIC_KEYS)[number];
export type UsageMetricStatus = (typeof USAGE_METRIC_STATUSES)[number];
export type EntitlementSource = (typeof ENTITLEMENT_SOURCES)[number];

export interface BillingPlanLimits {
  workspaces: number | null;
  internalUsers: number | null;
  activeConnectors: number | null;
  intentsPerMonth: number | null;
  executedActionsPerMonth: number | null;
  auditRetentionDays: number | null;
}

export interface BillingPlanFeatures {
  supportTier: SupportTier;
  advancedPolicies: boolean;
  approvalsMode: ApprovalsMode | 'custom';
  advancedFeatures: 'standard' | 'custom';
}

export interface BillingPlanCatalogEntry {
  key: BillingPlanKey;
  label: string;
  badge: string;
  monthlyBrl: number | null;
  yearlyBrl: number | null;
  displayText: string;
  suggestedStartingTicketBrl: number | null;
  selfServeCheckout: boolean;
  limits: BillingPlanLimits;
  features: BillingPlanFeatures;
}

export const PLAN_CATALOG: Record<BillingPlanKey, BillingPlanCatalogEntry> = {
  launch: {
    key: 'launch',
    label: 'Launch',
    badge: 'Accessible entry',
    monthlyBrl: 79,
    yearlyBrl: 790,
    displayText: 'R$ 79/mo or R$ 790/yr',
    suggestedStartingTicketBrl: null,
    selfServeCheckout: true,
    limits: {
      workspaces: 1,
      internalUsers: 2,
      activeConnectors: 2,
      intentsPerMonth: 2000,
      executedActionsPerMonth: 300,
      auditRetentionDays: 15,
    },
    features: {
      supportTier: 'email',
      advancedPolicies: false,
      approvalsMode: 'basic',
      advancedFeatures: 'standard',
    },
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    badge: 'Operational scale',
    monthlyBrl: 249,
    yearlyBrl: 2490,
    displayText: 'R$ 249/mo or R$ 2.490/yr',
    suggestedStartingTicketBrl: null,
    selfServeCheckout: true,
    limits: {
      workspaces: 3,
      internalUsers: 10,
      activeConnectors: 8,
      intentsPerMonth: 15000,
      executedActionsPerMonth: 3000,
      auditRetentionDays: 90,
    },
    features: {
      supportTier: 'priority_email',
      advancedPolicies: true,
      approvalsMode: 'advanced',
      advancedFeatures: 'standard',
    },
  },
  business: {
    key: 'business',
    label: 'Business',
    badge: 'Governed production',
    monthlyBrl: 799,
    yearlyBrl: 7990,
    displayText: 'R$ 799/mo or R$ 7.990/yr',
    suggestedStartingTicketBrl: null,
    selfServeCheckout: true,
    limits: {
      workspaces: 10,
      internalUsers: 50,
      activeConnectors: 25,
      intentsPerMonth: 100000,
      executedActionsPerMonth: 20000,
      auditRetentionDays: 365,
    },
    features: {
      supportTier: 'priority',
      advancedPolicies: true,
      approvalsMode: 'advanced',
      advancedFeatures: 'standard',
    },
  },
  enterprise: {
    key: 'enterprise',
    label: 'Enterprise',
    badge: 'Custom governance',
    monthlyBrl: null,
    yearlyBrl: null,
    displayText: 'Sob consulta',
    suggestedStartingTicketBrl: 1990,
    selfServeCheckout: false,
    limits: {
      workspaces: null,
      internalUsers: null,
      activeConnectors: null,
      intentsPerMonth: null,
      executedActionsPerMonth: null,
      auditRetentionDays: null,
    },
    features: {
      supportTier: 'enterprise',
      advancedPolicies: true,
      approvalsMode: 'custom',
      advancedFeatures: 'custom',
    },
  },
} as const;

export const BILLING_TRIAL_DAYS = 14;
export const BILLING_WARNING_RATIO = 0.8;
export const TRIAL_EFFECTIVE_PLAN_KEY: BillingPlanKey = 'pro';

export const createCheckoutSchema = z.object({
  planKey: z.enum(SELF_SERVE_BILLING_PLAN_KEYS),
  billingCycle: z.enum(BILLING_CYCLES),
});

export const cancelSubscriptionSchema = z.object({
  immediate: z.boolean().default(false),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionSchema>;

export interface BillingCustomerResponse {
  id: string;
  workspaceId: string;
  email: string;
  legalName?: string | null;
  providerCustomerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSubscriptionResponse {
  id: string;
  workspaceId: string;
  provider: BillingProviderKey;
  planKey?: BillingPlanKey | null;
  billingCycle?: BillingCycle | null;
  status: BillingSubscriptionStatus;
  providerSubscriptionId?: string | null;
  providerPlanId?: string | null;
  checkoutUrl?: string | null;
  externalReference?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  startedAt?: string | null;
  canceledAt?: string | null;
  lastProviderSyncAt?: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrialStateResponse {
  status: TrialStatus;
  startedAt?: string | null;
  endsAt?: string | null;
  convertedAt?: string | null;
  daysRemaining: number;
  isActive: boolean;
  isExpired: boolean;
}

export interface UsageMetricResponse {
  key: UsageMetricKey;
  label: string;
  unit: string;
  period: 'current' | 'monthly';
  used: number;
  limit: number | null;
  remaining: number | null;
  warningThreshold: number;
  status: UsageMetricStatus;
  hardLimit: boolean;
  resetsAt?: string | null;
}

export interface EntitlementSnapshotResponse {
  source: EntitlementSource;
  effectivePlanKey?: BillingPlanKey | null;
  readOnlyMode: boolean;
  selfServeCheckout: boolean;
  supportTier: SupportTier;
  advancedPolicies: boolean;
  approvalsMode: ApprovalsMode | 'custom';
  limits: BillingPlanLimits;
  warnings: string[];
  blocks: string[];
}

export interface BillingProviderStateResponse {
  name: BillingProviderKey;
  configured: boolean;
  checkoutEnabled: boolean;
  manualSetupRequired: string[];
}

export interface BillingAccountResponse {
  workspaceId: string;
  customer: BillingCustomerResponse | null;
  subscription: WorkspaceSubscriptionResponse | null;
  trial: TrialStateResponse;
  entitlements: EntitlementSnapshotResponse;
  usage: {
    metrics: UsageMetricResponse[];
  };
  provider: BillingProviderStateResponse;
}

export interface BillingCheckoutResponse {
  provider: BillingProviderKey;
  planKey: SelfServeBillingPlanKey;
  billingCycle: BillingCycle;
  checkoutUrl: string;
  providerSubscriptionId: string;
}

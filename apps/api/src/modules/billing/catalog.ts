import type { BillingPlanKey, UsageMetricKey } from '@vowgrid/contracts';
import {
  BILLING_WARNING_RATIO,
  PLAN_CATALOG,
  SELF_SERVE_BILLING_PLAN_KEYS,
  TRIAL_EFFECTIVE_PLAN_KEY,
} from '@vowgrid/contracts';

export const ADVANCED_POLICY_TYPES = new Set([
  'connector_restriction',
  'environment_restriction',
  'role_constraint',
]);

export const MONTHLY_USAGE_METRICS = ['intents', 'executed_actions'] as const;

export const USAGE_METRIC_META: Record<
  UsageMetricKey,
  { label: string; unit: string; period: 'current' | 'monthly' }
> = {
  workspaces: { label: 'Workspaces', unit: 'workspaces', period: 'current' },
  internal_users: { label: 'Internal users', unit: 'users', period: 'current' },
  active_connectors: { label: 'Active connectors', unit: 'connectors', period: 'current' },
  intents: { label: 'Intents this month', unit: 'intents', period: 'monthly' },
  executed_actions: { label: 'Executed actions this month', unit: 'actions', period: 'monthly' },
};

export const SELF_SERVE_PLANS = new Set<BillingPlanKey>(SELF_SERVE_BILLING_PLAN_KEYS);
export const DEFAULT_TRIAL_PLAN_KEY = TRIAL_EFFECTIVE_PLAN_KEY;
export const DEFAULT_WARNING_RATIO = BILLING_WARNING_RATIO;

export function getPlan(planKey: BillingPlanKey) {
  return PLAN_CATALOG[planKey];
}

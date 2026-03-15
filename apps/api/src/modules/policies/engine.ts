// ──────────────────────────────────────────
// VowGrid — Policy Engine (MVP)
// ──────────────────────────────────────────

import type { Intent, Policy } from '@prisma/client';

export type PolicyResult = 'allow' | 'deny' | 'require_approval';

export interface PolicyEvaluationResult {
  policyId: string;
  policyName: string;
  result: PolicyResult;
  reason: string;
}

export interface PolicyRules {
  // Amount threshold
  maxAmount?: number;
  amountField?: string;

  // Action restriction
  allowedActions?: string[];
  blockedActions?: string[];

  // Connector restriction
  allowedConnectors?: string[];
  blockedConnectors?: string[];

  // Environment restriction
  allowedEnvironments?: string[];
  blockedEnvironments?: string[];

  // Role constraint
  requiredRoles?: string[];

  // Custom condition
  requireApprovalAbove?: number;
}

/**
 * Evaluate a single policy against an intent.
 * Pure function — no database access.
 */
export function evaluatePolicy(
  policy: Policy,
  intent: Intent,
  context: { userRole?: string; connectorType?: string },
): PolicyEvaluationResult {
  const rules = policy.rules as PolicyRules;
  const params = (intent.parameters as Record<string, unknown>) ?? {};

  // ── Amount threshold ─────────────────
  if (rules.maxAmount !== undefined || rules.requireApprovalAbove !== undefined) {
    const amountField = rules.amountField ?? 'amount';
    const amount = Number(params[amountField]);
    if (!isNaN(amount)) {
      // Hard deny if above maxAmount
      if (rules.maxAmount !== undefined && amount > rules.maxAmount) {
        return {
          policyId: policy.id,
          policyName: policy.name,
          result: 'deny',
          reason: `Amount ${amount} exceeds maximum ${rules.maxAmount}`,
        };
      }
      // Require approval if above approval threshold
      if (rules.requireApprovalAbove !== undefined && amount > rules.requireApprovalAbove) {
        return {
          policyId: policy.id,
          policyName: policy.name,
          result: 'require_approval',
          reason: `Amount ${amount} exceeds approval threshold ${rules.requireApprovalAbove}`,
        };
      }
    }
  }

  // ── Action restriction ───────────────
  if (rules.blockedActions?.includes(intent.action)) {
    return {
      policyId: policy.id,
      policyName: policy.name,
      result: 'deny',
      reason: `Action "${intent.action}" is blocked by policy`,
    };
  }

  if (rules.allowedActions && !rules.allowedActions.includes(intent.action)) {
    return {
      policyId: policy.id,
      policyName: policy.name,
      result: 'deny',
      reason: `Action "${intent.action}" is not in the allowed list`,
    };
  }

  // ── Connector restriction ────────────
  if (context.connectorType) {
    if (rules.blockedConnectors?.includes(context.connectorType)) {
      return {
        policyId: policy.id,
        policyName: policy.name,
        result: 'deny',
        reason: `Connector "${context.connectorType}" is blocked by policy`,
      };
    }

    if (rules.allowedConnectors && !rules.allowedConnectors.includes(context.connectorType)) {
      return {
        policyId: policy.id,
        policyName: policy.name,
        result: 'deny',
        reason: `Connector "${context.connectorType}" is not in the allowed list`,
      };
    }
  }

  // ── Environment restriction ──────────
  if (rules.blockedEnvironments?.includes(intent.environment)) {
    return {
      policyId: policy.id,
      policyName: policy.name,
      result: 'deny',
      reason: `Environment "${intent.environment}" is blocked by policy`,
    };
  }

  if (rules.allowedEnvironments && !rules.allowedEnvironments.includes(intent.environment)) {
    return {
      policyId: policy.id,
      policyName: policy.name,
      result: 'deny',
      reason: `Environment "${intent.environment}" is not in the allowed list`,
    };
  }

  // ── Role constraint ──────────────────
  if (rules.requiredRoles && context.userRole) {
    if (!rules.requiredRoles.includes(context.userRole)) {
      return {
        policyId: policy.id,
        policyName: policy.name,
        result: 'deny',
        reason: `Role "${context.userRole}" does not meet required roles: ${rules.requiredRoles.join(', ')}`,
      };
    }
  }

  // ── All checks passed ────────────────
  return {
    policyId: policy.id,
    policyName: policy.name,
    result: 'allow',
    reason: 'All policy checks passed',
  };
}

/**
 * Evaluate all applicable policies against an intent.
 * Returns the most restrictive result.
 */
export function evaluatePolicies(
  policies: Policy[],
  intent: Intent,
  context: { userRole?: string; connectorType?: string },
): { overallResult: PolicyResult; decisions: PolicyEvaluationResult[] } {
  const decisions = policies
    .filter((p) => p.enabled)
    .sort((a, b) => b.priority - a.priority) // Higher priority first
    .map((policy) => evaluatePolicy(policy, intent, context));

  // Most restrictive wins: deny > require_approval > allow
  let overallResult: PolicyResult = 'allow';
  for (const decision of decisions) {
    if (decision.result === 'deny') {
      overallResult = 'deny';
      break;
    }
    if (decision.result === 'require_approval') {
      overallResult = 'require_approval';
    }
  }

  return { overallResult, decisions };
}

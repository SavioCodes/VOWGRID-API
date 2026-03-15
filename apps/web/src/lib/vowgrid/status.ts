import type {
  ApprovalRequestStatus,
  IntentState,
  PolicyResult,
  Reversibility,
  RiskLevel,
  RollbackSupport,
} from '@vowgrid/contracts';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'mint';

export function titleFromSlug(value: string) {
  return value
    .split(/[_\-.]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getIntentStatusMeta(status: IntentState): {
  label: string;
  tone: Tone;
  detail: string;
} {
  const map: Record<IntentState, { label: string; tone: Tone; detail: string }> = {
    draft: {
      label: 'Draft',
      tone: 'neutral',
      detail: 'Captured but not yet promoted to a simulatable state.',
    },
    proposed: {
      label: 'Proposed',
      tone: 'accent',
      detail: 'Ready for simulation.',
    },
    simulated: {
      label: 'Simulated',
      tone: 'accent',
      detail: 'Simulation complete. Policy gate is next.',
    },
    pending_approval: {
      label: 'Pending approval',
      tone: 'warning',
      detail: 'Awaiting reviewer decisions.',
    },
    approved: {
      label: 'Approved',
      tone: 'success',
      detail: 'Cleared to enter execution.',
    },
    rejected: {
      label: 'Rejected',
      tone: 'danger',
      detail: 'Stopped by policy or reviewer action.',
    },
    queued: {
      label: 'Queued',
      tone: 'warning',
      detail: 'Accepted for execution and waiting for a worker.',
    },
    executing: {
      label: 'Executing',
      tone: 'warning',
      detail: 'Connector execution is in progress.',
    },
    succeeded: {
      label: 'Succeeded',
      tone: 'success',
      detail: 'Execution completed and a receipt exists.',
    },
    failed: {
      label: 'Failed',
      tone: 'danger',
      detail: 'Execution failed. Retry or rollback analysis may be needed.',
    },
    rollback_pending: {
      label: 'Rollback pending',
      tone: 'warning',
      detail: 'Rollback has been requested and is awaiting completion.',
    },
    rolled_back: {
      label: 'Rolled back',
      tone: 'neutral',
      detail: 'Rollback completed.',
    },
    rollback_failed: {
      label: 'Rollback failed',
      tone: 'danger',
      detail: 'Rollback attempted but did not complete cleanly.',
    },
  };

  return map[status];
}

export function getApprovalStatusMeta(status: ApprovalRequestStatus) {
  const map: Record<ApprovalRequestStatus, { label: string; tone: Tone }> = {
    pending: { label: 'Pending', tone: 'warning' },
    approved: { label: 'Approved', tone: 'success' },
    rejected: { label: 'Rejected', tone: 'danger' },
    expired: { label: 'Expired', tone: 'neutral' },
  };

  return map[status];
}

export function getRiskMeta(risk: RiskLevel): { label: string; tone: Tone } {
  const map: Record<RiskLevel, { label: string; tone: Tone }> = {
    low: { label: 'Low risk', tone: 'mint' },
    medium: { label: 'Medium risk', tone: 'warning' },
    high: { label: 'High risk', tone: 'danger' },
    critical: { label: 'Critical risk', tone: 'danger' },
  };

  return map[risk];
}

export function getPolicyResultMeta(result: PolicyResult): { label: string; tone: Tone } {
  const map: Record<PolicyResult, { label: string; tone: Tone }> = {
    allow: { label: 'Allow', tone: 'mint' },
    deny: { label: 'Deny', tone: 'danger' },
    require_approval: { label: 'Require approval', tone: 'warning' },
  };

  return map[result];
}

export function getRollbackSupportMeta(value: RollbackSupport): { label: string; tone: Tone } {
  const map: Record<RollbackSupport, { label: string; tone: Tone }> = {
    supported: { label: 'Rollback supported', tone: 'mint' },
    partial: { label: 'Rollback partial', tone: 'warning' },
    unsupported: { label: 'Rollback unavailable', tone: 'danger' },
  };

  return map[value];
}

export function getReversibilityMeta(value: Reversibility): { label: string; tone: Tone } {
  const map: Record<Reversibility, { label: string; tone: Tone }> = {
    full: { label: 'Fully reversible', tone: 'mint' },
    partial: { label: 'Partially reversible', tone: 'warning' },
    none: { label: 'Not reversible', tone: 'danger' },
  };

  return map[value];
}

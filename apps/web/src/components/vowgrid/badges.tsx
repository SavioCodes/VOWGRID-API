import { Badge } from '@vowgrid/ui';
import type {
  ApprovalRequestStatus,
  IntentState,
  PolicyResult,
  Reversibility,
  RiskLevel,
  RollbackSupport,
} from '@vowgrid/contracts';
import {
  getApprovalStatusMeta,
  getIntentStatusMeta,
  getPolicyResultMeta,
  getReversibilityMeta,
  getRiskMeta,
  getRollbackSupportMeta,
} from '@/lib/vowgrid/status';

export function StatusBadge({ status }: { status: IntentState }) {
  const meta = getIntentStatusMeta(status);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function ApprovalBadge({ status }: { status: ApprovalRequestStatus }) {
  const meta = getApprovalStatusMeta(status);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  const meta = getRiskMeta(risk);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function PolicyChip({ result }: { result: PolicyResult }) {
  const meta = getPolicyResultMeta(result);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function ReversibilityBadge({ value }: { value: Reversibility }) {
  const meta = getReversibilityMeta(value);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function RollbackSupportBadge({ value }: { value: RollbackSupport }) {
  const meta = getRollbackSupportMeta(value);
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

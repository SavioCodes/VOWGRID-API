// ──────────────────────────────────────────
// VowGrid Contracts — Intent States
// ──────────────────────────────────────────

export const INTENT_STATES = [
  'draft',
  'proposed',
  'simulated',
  'pending_approval',
  'approved',
  'rejected',
  'queued',
  'executing',
  'succeeded',
  'failed',
  'rollback_pending',
  'rolled_back',
  'rollback_failed',
] as const;

export type IntentState = (typeof INTENT_STATES)[number];

export const STATE_TRANSITIONS: Record<IntentState, readonly IntentState[]> = {
  draft: ['proposed'],
  proposed: ['simulated', 'rejected'],
  simulated: ['pending_approval', 'rejected'],
  pending_approval: ['approved', 'rejected'],
  approved: ['queued', 'rejected'],
  rejected: [],
  queued: ['executing'],
  executing: ['succeeded', 'failed'],
  succeeded: ['rollback_pending'],
  failed: ['rollback_pending', 'queued'],
  rollback_pending: ['rolled_back', 'rollback_failed'],
  rolled_back: [],
  rollback_failed: ['rollback_pending'],
};

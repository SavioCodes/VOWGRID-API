// ──────────────────────────────────────────
// VowGrid — Intent State Machine
// Pure domain logic — no database dependencies
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

/**
 * Valid state transitions for the Intent lifecycle.
 * Each key maps to an array of states it can transition TO.
 */
export const STATE_TRANSITIONS: Record<IntentState, readonly IntentState[]> = {
  draft: ['proposed'],
  proposed: ['simulated', 'rejected'],
  simulated: ['pending_approval', 'rejected'],
  pending_approval: ['approved', 'rejected'],
  approved: ['queued', 'rejected'],
  rejected: [], // terminal
  queued: ['executing'],
  executing: ['succeeded', 'failed'],
  succeeded: ['rollback_pending'],
  failed: ['rollback_pending', 'queued'], // can retry via re-queue
  rollback_pending: ['rolled_back', 'rollback_failed'],
  rolled_back: [], // terminal
  rollback_failed: ['rollback_pending'], // can retry rollback
};

/**
 * Check if a state transition is valid.
 */
export function isValidTransition(from: IntentState, to: IntentState): boolean {
  return STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all valid next states from the current state.
 */
export function getNextStates(state: IntentState): readonly IntentState[] {
  return STATE_TRANSITIONS[state] ?? [];
}

/**
 * Check if a state is terminal (no further transitions possible).
 */
export function isTerminalState(state: IntentState): boolean {
  return getNextStates(state).length === 0;
}

/**
 * Check if the intent can be rolled back from its current state.
 */
export function canRollback(state: IntentState): boolean {
  return isValidTransition(state, 'rollback_pending');
}

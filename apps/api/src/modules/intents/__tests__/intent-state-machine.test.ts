// ──────────────────────────────────────────
// VowGrid — Intent State Machine Tests
// ──────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  getNextStates,
  isTerminalState,
  canRollback,
  INTENT_STATES,
  STATE_TRANSITIONS,
  type IntentState,
} from '../state-machine.js';

describe('Intent State Machine', () => {
  describe('INTENT_STATES', () => {
    it('should have 13 states', () => {
      expect(INTENT_STATES).toHaveLength(13);
    });

    it('should include all expected states', () => {
      const expected = [
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
      ];
      expect(INTENT_STATES).toEqual(expected);
    });
  });

  describe('isValidTransition', () => {
    // ── Happy path transitions ─────────
    const validTransitions: [IntentState, IntentState][] = [
      ['draft', 'proposed'],
      ['proposed', 'simulated'],
      ['proposed', 'rejected'],
      ['simulated', 'pending_approval'],
      ['simulated', 'rejected'],
      ['pending_approval', 'approved'],
      ['pending_approval', 'rejected'],
      ['approved', 'queued'],
      ['approved', 'rejected'],
      ['queued', 'executing'],
      ['executing', 'succeeded'],
      ['executing', 'failed'],
      ['succeeded', 'rollback_pending'],
      ['failed', 'rollback_pending'],
      ['failed', 'queued'], // retry
      ['rollback_pending', 'rolled_back'],
      ['rollback_pending', 'rollback_failed'],
      ['rollback_failed', 'rollback_pending'], // retry rollback
    ];

    it.each(validTransitions)('%s → %s should be valid', (from, to) => {
      expect(isValidTransition(from, to)).toBe(true);
    });

    // ── Invalid transitions ────────────
    const invalidTransitions: [IntentState, IntentState][] = [
      ['draft', 'simulated'], // must go through proposed
      ['draft', 'approved'], // can't skip ahead
      ['draft', 'executing'], // can't skip ahead
      ['proposed', 'approved'], // must simulate first
      ['simulated', 'queued'], // must go through approval
      ['rejected', 'proposed'], // terminal state
      ['rejected', 'approved'], // terminal state
      ['rolled_back', 'draft'], // terminal state
      ['succeeded', 'queued'], // can't re-execute directly
      ['executing', 'queued'], // can't go back to queued
      ['queued', 'approved'], // can't go backward
    ];

    it.each(invalidTransitions)('%s → %s should be invalid', (from, to) => {
      expect(isValidTransition(from, to)).toBe(false);
    });
  });

  describe('getNextStates', () => {
    it('should return valid next states for draft', () => {
      expect(getNextStates('draft')).toEqual(['proposed']);
    });

    it('should return valid next states for proposed', () => {
      expect(getNextStates('proposed')).toEqual(['simulated', 'rejected']);
    });

    it('should return valid next states for executing', () => {
      expect(getNextStates('executing')).toEqual(['succeeded', 'failed']);
    });

    it('should return empty array for terminal states', () => {
      expect(getNextStates('rejected')).toEqual([]);
      expect(getNextStates('rolled_back')).toEqual([]);
    });
  });

  describe('isTerminalState', () => {
    it('should identify rejected as terminal', () => {
      expect(isTerminalState('rejected')).toBe(true);
    });

    it('should identify rolled_back as terminal', () => {
      expect(isTerminalState('rolled_back')).toBe(true);
    });

    it('should not identify draft as terminal', () => {
      expect(isTerminalState('draft')).toBe(false);
    });

    it('should not identify executing as terminal', () => {
      expect(isTerminalState('executing')).toBe(false);
    });
  });

  describe('canRollback', () => {
    it('should allow rollback from succeeded', () => {
      expect(canRollback('succeeded')).toBe(true);
    });

    it('should allow rollback from failed', () => {
      expect(canRollback('failed')).toBe(true);
    });

    it('should not allow rollback from draft', () => {
      expect(canRollback('draft')).toBe(false);
    });

    it('should not allow rollback from executing', () => {
      expect(canRollback('executing')).toBe(false);
    });

    it('should not allow rollback from rejected', () => {
      expect(canRollback('rejected')).toBe(false);
    });
  });

  describe('Full lifecycle path', () => {
    it('should support the happy path: draft → proposed → simulated → pending_approval → approved → queued → executing → succeeded', () => {
      const happyPath: IntentState[] = [
        'draft',
        'proposed',
        'simulated',
        'pending_approval',
        'approved',
        'queued',
        'executing',
        'succeeded',
      ];

      for (let i = 0; i < happyPath.length - 1; i++) {
        expect(isValidTransition(happyPath[i], happyPath[i + 1])).toBe(true);
      }
    });

    it('should support the rollback path: succeeded → rollback_pending → rolled_back', () => {
      expect(isValidTransition('succeeded', 'rollback_pending')).toBe(true);
      expect(isValidTransition('rollback_pending', 'rolled_back')).toBe(true);
    });

    it('should support retry on failure: failed → queued → executing', () => {
      expect(isValidTransition('failed', 'queued')).toBe(true);
      expect(isValidTransition('queued', 'executing')).toBe(true);
    });
  });
});

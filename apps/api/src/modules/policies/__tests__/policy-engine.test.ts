// ──────────────────────────────────────────
// VowGrid — Policy Engine Tests
// ──────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { evaluatePolicy, evaluatePolicies, type PolicyRules } from '../engine.js';
import type { Intent, Policy } from '@prisma/client';

// ── Test Helpers ────────────────────────

function makePolicy(overrides: Partial<Policy> & { rules: PolicyRules }): Policy {
  return {
    id: 'policy-1',
    name: 'Test Policy',
    description: null,
    type: 'amount_threshold',
    rules: overrides.rules as any,
    priority: 0,
    enabled: true,
    workspaceId: 'ws-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Policy;
}

function makeIntent(overrides: Partial<Intent> = {}): Intent {
  return {
    id: 'intent-1',
    title: 'Test Intent',
    description: null,
    action: 'send_message',
    connectorId: null,
    agentId: 'agent-1',
    workspaceId: 'ws-1',
    status: 'simulated',
    parameters: {},
    environment: 'production',
    idempotencyKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Intent;
}

// ── Tests ───────────────────────────────

describe('Policy Engine', () => {
  describe('evaluatePolicy', () => {
    // ── Amount threshold ─────────────
    describe('amount_threshold', () => {
      it('should allow when amount is under threshold', () => {
        const policy = makePolicy({
          type: 'amount_threshold',
          rules: { maxAmount: 1000 },
        });
        const intent = makeIntent({ parameters: { amount: 500 } });

        const result = evaluatePolicy(policy, intent, {});
        expect(result.result).toBe('allow');
      });

      it('should deny when amount exceeds threshold', () => {
        const policy = makePolicy({
          type: 'amount_threshold',
          rules: { maxAmount: 1000 },
        });
        const intent = makeIntent({ parameters: { amount: 1500 } });

        const result = evaluatePolicy(policy, intent, {});
        expect(result.result).toBe('deny');
        expect(result.reason).toContain('1500');
        expect(result.reason).toContain('1000');
      });

      it('should require approval when above approval threshold', () => {
        const policy = makePolicy({
          type: 'amount_threshold',
          rules: { maxAmount: 10000, requireApprovalAbove: 500 },
        });
        const intent = makeIntent({ parameters: { amount: 750 } });

        const result = evaluatePolicy(policy, intent, {});
        expect(result.result).toBe('require_approval');
      });

      it('should use custom amountField', () => {
        const policy = makePolicy({
          type: 'amount_threshold',
          rules: { maxAmount: 100, amountField: 'total_cost' },
        });
        const intent = makeIntent({ parameters: { total_cost: 200 } });

        const result = evaluatePolicy(policy, intent, {});
        expect(result.result).toBe('deny');
      });
    });

    // ── Action restriction ───────────
    describe('action_restriction', () => {
      it('should deny blocked actions', () => {
        const policy = makePolicy({
          type: 'action_restriction',
          rules: { blockedActions: ['delete_user', 'drop_table'] },
        });
        const intent = makeIntent({ action: 'delete_user' });

        const result = evaluatePolicy(policy, intent, {});
        expect(result.result).toBe('deny');
        expect(result.reason).toContain('delete_user');
      });

      it('should allow non-blocked actions', () => {
        const policy = makePolicy({
          type: 'action_restriction',
          rules: { blockedActions: ['delete_user'] },
        });
        const intent = makeIntent({ action: 'send_message' });

        const result = evaluatePolicy(policy, intent, {});
        expect(result.result).toBe('allow');
      });

      it('should deny actions not in allowed list', () => {
        const policy = makePolicy({
          type: 'action_restriction',
          rules: { allowedActions: ['send_message', 'create_record'] },
        });
        const intent = makeIntent({ action: 'delete_user' });

        const result = evaluatePolicy(policy, intent, {});
        expect(result.result).toBe('deny');
      });
    });

    // ── Connector restriction ────────
    describe('connector_restriction', () => {
      it('should deny blocked connectors', () => {
        const policy = makePolicy({
          type: 'connector_restriction',
          rules: { blockedConnectors: ['production_db'] },
        });
        const intent = makeIntent();

        const result = evaluatePolicy(policy, intent, { connectorType: 'production_db' });
        expect(result.result).toBe('deny');
      });

      it('should allow non-blocked connectors', () => {
        const policy = makePolicy({
          type: 'connector_restriction',
          rules: { blockedConnectors: ['production_db'] },
        });
        const intent = makeIntent();

        const result = evaluatePolicy(policy, intent, { connectorType: 'mock' });
        expect(result.result).toBe('allow');
      });
    });

    // ── Environment restriction ──────
    describe('environment_restriction', () => {
      it('should deny blocked environments', () => {
        const policy = makePolicy({
          type: 'environment_restriction',
          rules: { blockedEnvironments: ['production'] },
        });
        const intent = makeIntent({ environment: 'production' });

        const result = evaluatePolicy(policy, intent, {});
        expect(result.result).toBe('deny');
      });

      it('should allow non-blocked environments', () => {
        const policy = makePolicy({
          type: 'environment_restriction',
          rules: { blockedEnvironments: ['production'] },
        });
        const intent = makeIntent({ environment: 'staging' });

        const result = evaluatePolicy(policy, intent, {});
        expect(result.result).toBe('allow');
      });
    });

    // ── Role constraint ──────────────
    describe('role_constraint', () => {
      it('should deny when user role does not match', () => {
        const policy = makePolicy({
          type: 'role_constraint',
          rules: { requiredRoles: ['admin', 'owner'] },
        });
        const intent = makeIntent();

        const result = evaluatePolicy(policy, intent, { userRole: 'member' });
        expect(result.result).toBe('deny');
      });

      it('should allow when user role matches', () => {
        const policy = makePolicy({
          type: 'role_constraint',
          rules: { requiredRoles: ['admin', 'owner'] },
        });
        const intent = makeIntent();

        const result = evaluatePolicy(policy, intent, { userRole: 'admin' });
        expect(result.result).toBe('allow');
      });
    });
  });

  describe('evaluatePolicies', () => {
    it('should return allow when no policies exist', () => {
      const intent = makeIntent();
      const result = evaluatePolicies([], intent, {});
      expect(result.overallResult).toBe('allow');
      expect(result.decisions).toHaveLength(0);
    });

    it('should return deny when any policy denies', () => {
      const policies = [
        makePolicy({ id: 'p1', rules: { maxAmount: 1000 }, priority: 1 }),
        makePolicy({ id: 'p2', rules: { blockedActions: ['other'] }, priority: 0 }),
      ];
      const intent = makeIntent({ parameters: { amount: 2000 } });

      const result = evaluatePolicies(policies, intent, {});
      expect(result.overallResult).toBe('deny');
    });

    it('should return require_approval when no policy denies but one requires approval', () => {
      const policies = [
        makePolicy({
          id: 'p1',
          rules: { maxAmount: 10000, requireApprovalAbove: 500 },
          priority: 1,
        }),
        makePolicy({
          id: 'p2',
          rules: { allowedActions: ['send_message'] },
          priority: 0,
        }),
      ];
      const intent = makeIntent({ parameters: { amount: 750 } });

      const result = evaluatePolicies(policies, intent, {});
      expect(result.overallResult).toBe('require_approval');
    });

    it('should skip disabled policies', () => {
      const policies = [
        makePolicy({
          id: 'p1',
          rules: { blockedActions: ['send_message'] },
          enabled: false,
        }),
      ];
      const intent = makeIntent({ action: 'send_message' });

      const result = evaluatePolicies(policies, intent, {});
      expect(result.overallResult).toBe('allow');
    });

    it('should evaluate higher priority policies first', () => {
      const policies = [
        makePolicy({
          id: 'p1',
          name: 'Low Priority',
          rules: { blockedActions: ['send_message'] },
          priority: 0,
        }),
        makePolicy({
          id: 'p2',
          name: 'High Priority',
          rules: { maxAmount: 1000 },
          priority: 10,
        }),
      ];
      const intent = makeIntent({
        action: 'send_message',
        parameters: { amount: 500 },
      });

      const result = evaluatePolicies(policies, intent, {});
      // Both will run, but high priority should be first in decisions
      expect(result.decisions[0].policyName).toBe('High Priority');
    });
  });
});

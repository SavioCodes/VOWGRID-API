// ──────────────────────────────────────────
// VowGrid — Approval Service
// ──────────────────────────────────────────

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors.js';
import { transitionIntent } from '../intents/service.js';
import { evaluatePolicies } from '../policies/engine.js';
import { emitAuditEvent } from '../audits/service.js';
import { assertCanRequireApprovalCount } from '../billing/entitlements.js';
import { z } from 'zod';

export const submitForApprovalSchema = z.object({
  requiredCount: z.number().int().min(1).max(10).default(1),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  rationale: z.string().max(2000).optional(),
  userId: z.string().cuid().optional(),
});

export async function submitForApproval(
  intentId: string,
  workspaceId: string,
  requiredCount: number,
  actorId: string,
  actorType: 'user' | 'agent',
) {
  await assertCanRequireApprovalCount(workspaceId, requiredCount);

  const intent = await prisma.intent.findFirst({
    where: { id: intentId, workspaceId },
    include: { connector: true },
  });

  if (!intent) {
    throw new NotFoundError('Intent', intentId);
  }

  if (intent.status !== 'simulated') {
    throw new ValidationError(
      `Intent must be in "simulated" state to submit for approval. Current state: "${intent.status}"`,
    );
  }

  // Run policy evaluation
  const policies = await prisma.policy.findMany({
    where: { workspaceId, enabled: true },
  });

  const policyResult = evaluatePolicies(policies, intent, {
    connectorType: intent.connector?.type,
  });

  // Persist policy decisions
  for (const decision of policyResult.decisions) {
    await prisma.policyDecision.create({
      data: {
        policyId: decision.policyId,
        intentId,
        result: decision.result,
        reason: decision.reason,
      },
    });
  }

  // If policy denies, reject the intent
  if (policyResult.overallResult === 'deny') {
    await transitionIntent(intentId, workspaceId, 'rejected', actorId, actorType);
    return {
      approved: false,
      policyResult: policyResult.overallResult,
      decisions: policyResult.decisions,
    };
  }

  // Create approval request
  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      intentId,
      requiredCount,
      status: 'pending',
    },
  });

  // Transition intent
  await transitionIntent(intentId, workspaceId, 'pending_approval', actorId, actorType);

  await emitAuditEvent({
    action: 'approval.requested',
    entityType: 'intent',
    entityId: intentId,
    actorType,
    actorId,
    workspaceId,
    metadata: {
      approvalRequestId: approvalRequest.id,
      requiredCount,
      policyResult: policyResult.overallResult,
    },
  });

  return {
    approvalRequest,
    policyResult: policyResult.overallResult,
    decisions: policyResult.decisions,
  };
}

export async function processApprovalDecision(
  approvalRequestId: string,
  userId: string,
  decision: 'approved' | 'rejected',
  rationale: string | undefined,
  workspaceId: string,
) {
  const approvalRequest = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: { intent: true },
  });

  if (!approvalRequest) {
    throw new NotFoundError('ApprovalRequest', approvalRequestId);
  }

  if (approvalRequest.intent.workspaceId !== workspaceId) {
    throw new NotFoundError('ApprovalRequest', approvalRequestId);
  }

  if (approvalRequest.status !== 'pending') {
    throw new ConflictError(`Approval request is already "${approvalRequest.status}"`);
  }

  // Check for duplicate decisions from same user
  const existingDecision = await prisma.approvalDecision.findFirst({
    where: { approvalRequestId, userId },
  });

  if (existingDecision) {
    throw new ConflictError('User has already submitted a decision for this approval request');
  }

  // Record the decision
  const approvalDecision = await prisma.approvalDecision.create({
    data: {
      approvalRequestId,
      userId,
      decision,
      rationale,
    },
  });

  await emitAuditEvent({
    action: `approval.${decision}`,
    entityType: 'intent',
    entityId: approvalRequest.intentId,
    actorType: 'user',
    actorId: userId,
    workspaceId,
    metadata: { approvalRequestId, decision, rationale },
  });

  if (decision === 'rejected') {
    // Any rejection rejects the whole request
    await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: { status: 'rejected' },
    });
    await transitionIntent(approvalRequest.intentId, workspaceId, 'rejected', userId, 'user');
    return { approvalRequest: { ...approvalRequest, status: 'rejected' }, decision: approvalDecision };
  }

  // Count approvals
  const newCount = approvalRequest.currentCount + 1;
  const isFullyApproved = newCount >= approvalRequest.requiredCount;

  await prisma.approvalRequest.update({
    where: { id: approvalRequestId },
    data: {
      currentCount: newCount,
      status: isFullyApproved ? 'approved' : 'pending',
    },
  });

  if (isFullyApproved) {
    await transitionIntent(approvalRequest.intentId, workspaceId, 'approved', userId, 'user');
  }

  return {
    approvalRequest: {
      ...approvalRequest,
      currentCount: newCount,
      status: isFullyApproved ? 'approved' : 'pending',
    },
    decision: approvalDecision,
  };
}

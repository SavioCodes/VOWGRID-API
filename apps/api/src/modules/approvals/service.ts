import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors.js';
import { prisma } from '../../lib/prisma.js';
import { emitAuditEvent } from '../audits/service.js';
import { assertCanRequireApprovalCount } from '../billing/entitlements.js';
import { transitionIntent } from '../intents/service.js';
import { evaluatePolicies } from '../policies/engine.js';
import {
  normalizeApprovalStages,
  parseApprovalStages,
  serializeApprovalDecision,
  serializeApprovalRequest,
} from './model.js';

const ROLE_PRIORITY: Record<string, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

type SubmitForApprovalServiceInput = {
  requiredCount?: number;
  stages?: Array<{
    label: string;
    requiredCount: number;
    reviewerRoles: Array<'owner' | 'admin' | 'member' | 'viewer'>;
  }>;
};

async function resolveWorkspaceRole(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMembership.findFirst({
    where: {
      userId,
      workspaceId,
      disabledAt: null,
    },
    select: {
      role: true,
    },
  });

  if (membership?.role) {
    return membership.role;
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      workspaceId,
      disabledAt: null,
    },
    select: {
      role: true,
    },
  });

  return user?.role ?? null;
}

function assertStageRolePermission(
  userRole: string | null,
  reviewerRoles: string[],
  stageLabel: string,
) {
  if (!userRole) {
    throw new ForbiddenError('Only active workspace members can review approval requests.');
  }

  if (userRole === 'owner') {
    return;
  }

  const userRank = ROLE_PRIORITY[userRole] ?? -1;
  const allowed = reviewerRoles.some(
    (role) => userRank >= (ROLE_PRIORITY[role] ?? Number.MAX_SAFE_INTEGER),
  );

  if (!allowed) {
    throw new ForbiddenError(
      `This approval stage requires one of: ${reviewerRoles.join(', ')}. Current role "${userRole}" cannot review "${stageLabel}".`,
    );
  }
}

export async function submitForApproval(
  intentId: string,
  workspaceId: string,
  input: SubmitForApprovalServiceInput,
  actorId: string,
  actorType: 'user' | 'agent',
) {
  const stages = normalizeApprovalStages(input);
  const requiredCount = stages.reduce((sum, stage) => sum + stage.requiredCount, 0);

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

  const policies = await prisma.policy.findMany({
    where: { workspaceId, enabled: true },
  });

  const policyResult = evaluatePolicies(policies, intent, {
    connectorType: intent.connector?.type,
  });

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

  if (policyResult.overallResult === 'deny') {
    await transitionIntent(intentId, workspaceId, 'rejected', actorId, actorType);
    return {
      approved: false,
      policyResult: policyResult.overallResult,
      decisions: policyResult.decisions,
    };
  }

  const approvalRequest = await prisma.approvalRequest.create({
    data: {
      intentId,
      requiredCount,
      mode: stages.length > 1 ? 'multi_step' : 'single_step',
      currentStageIndex: 0,
      stageDefinitions: stages,
      status: 'pending',
    },
  });

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
      approvalMode: stages.length > 1 ? 'multi_step' : 'single_step',
      stages,
      policyResult: policyResult.overallResult,
    },
  });

  return {
    approvalRequest: serializeApprovalRequest({
      request: approvalRequest,
      decisions: [],
    }),
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
  userRole?: string | null,
) {
  const approvalRequest = await prisma.approvalRequest.findUnique({
    where: { id: approvalRequestId },
    include: { intent: true, decisions: true },
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

  const stages = parseApprovalStages(
    approvalRequest.stageDefinitions,
    approvalRequest.requiredCount,
  );
  const activeStageIndex = Math.min(
    Math.max(approvalRequest.currentStageIndex ?? 0, 0),
    Math.max(stages.length - 1, 0),
  );
  const activeStage = stages[activeStageIndex];

  const existingDecision = await prisma.approvalDecision.findFirst({
    where: { approvalRequestId, userId },
  });

  if (existingDecision) {
    throw new ConflictError('User has already submitted a decision for this approval request');
  }

  assertStageRolePermission(
    userRole ?? (await resolveWorkspaceRole(userId, workspaceId)),
    activeStage.reviewerRoles,
    activeStage.label,
  );

  const approvalDecision = await prisma.approvalDecision.create({
    data: {
      approvalRequestId,
      userId,
      decision,
      rationale,
      stageIndex: activeStageIndex,
      stageLabel: activeStage.label,
    },
  });

  await emitAuditEvent({
    action: `approval.${decision}`,
    entityType: 'intent',
    entityId: approvalRequest.intentId,
    actorType: 'user',
    actorId: userId,
    workspaceId,
    metadata: {
      approvalRequestId,
      decision,
      rationale,
      stageIndex: activeStageIndex,
      stageLabel: activeStage.label,
    },
  });

  if (decision === 'rejected') {
    const updatedRequest = await prisma.approvalRequest.update({
      where: { id: approvalRequestId },
      data: {
        status: 'rejected',
        currentCount: approvalRequest.currentCount,
      },
    });

    await transitionIntent(approvalRequest.intentId, workspaceId, 'rejected', userId, 'user');

    return {
      approvalRequest: serializeApprovalRequest({
        request: updatedRequest,
        decisions: [...approvalRequest.decisions, approvalDecision],
      }),
      decision: serializeApprovalDecision(approvalDecision),
    };
  }

  const approvedDecisions = [...approvalRequest.decisions, approvalDecision].filter(
    (item) => item.decision === 'approved',
  );
  const approvedCount = approvedDecisions.length;
  const currentStageApprovals = approvedDecisions.filter(
    (item) => (item.stageIndex ?? 0) === activeStageIndex,
  ).length;
  const isStageComplete = currentStageApprovals >= activeStage.requiredCount;
  const isLastStage = activeStageIndex >= stages.length - 1;

  const updatedRequest = await prisma.approvalRequest.update({
    where: { id: approvalRequestId },
    data: {
      currentCount: approvedCount,
      currentStageIndex: isStageComplete && !isLastStage ? activeStageIndex + 1 : activeStageIndex,
      status: isStageComplete && isLastStage ? 'approved' : 'pending',
    },
  });

  if (isStageComplete && !isLastStage) {
    await emitAuditEvent({
      action: 'approval.stage_advanced',
      entityType: 'intent',
      entityId: approvalRequest.intentId,
      actorType: 'user',
      actorId: userId,
      workspaceId,
      metadata: {
        approvalRequestId,
        fromStageIndex: activeStageIndex,
        toStageIndex: activeStageIndex + 1,
      },
    });
  }

  if (isStageComplete && isLastStage) {
    await transitionIntent(approvalRequest.intentId, workspaceId, 'approved', userId, 'user');
  }

  return {
    approvalRequest: serializeApprovalRequest({
      request: updatedRequest,
      decisions: [...approvalRequest.decisions, approvalDecision],
    }),
    decision: serializeApprovalDecision(approvalDecision),
  };
}

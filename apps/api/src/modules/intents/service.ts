// ──────────────────────────────────────────
// VowGrid — Intent Service
// ──────────────────────────────────────────

import { prisma } from '../../lib/prisma.js';
import { NotFoundError, InvalidStateTransitionError } from '../../common/errors.js';
import { toPrismaNullableJsonValue } from '../../common/json.js';
import { isValidTransition, type IntentState } from './state-machine.js';
import type { CreateIntentInput, ListIntentsInput } from './schemas.js';
import { emitAuditEvent } from '../audits/service.js';
import { assertCanCreateIntent, trackIntentCreation } from '../billing/entitlements.js';

export async function createIntent(
  workspaceId: string,
  input: CreateIntentInput,
  actorId: string,
  actorType: 'user' | 'agent' = 'agent',
) {
  // Idempotency check
  if (input.idempotencyKey) {
    const existing = await prisma.intent.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
    });
    if (existing) {
      return existing;
    }
  }

  const billing = await assertCanCreateIntent(workspaceId);

  const intent = await prisma.intent.create({
    data: {
      title: input.title,
      description: input.description,
      action: input.action,
      connectorId: input.connectorId,
      agentId: input.agentId,
      workspaceId,
      parameters: toPrismaNullableJsonValue(input.parameters),
      environment: input.environment,
      idempotencyKey: input.idempotencyKey,
    },
    include: {
      agent: true,
      connector: true,
    },
  });

  await emitAuditEvent({
    action: 'intent.created',
    entityType: 'intent',
    entityId: intent.id,
    actorType,
    actorId,
    workspaceId,
    metadata: { title: intent.title, action: intent.action },
  });

  await trackIntentCreation(workspaceId, billing);

  return intent;
}

export async function getIntent(id: string, workspaceId: string) {
  const [intent, policyEvaluations] = await Promise.all([
    prisma.intent.findFirst({
      where: { id, workspaceId },
      include: {
        agent: true,
        connector: true,
        simulationResult: true,
        approvalRequest: {
          include: { decisions: true },
        },
        executionJob: true,
        receipts: true,
        rollbackAttempts: true,
      },
    }),
    prisma.policyDecision.findMany({
      where: {
        intentId: id,
        policy: { workspaceId },
      },
      include: { policy: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  if (!intent) {
    throw new NotFoundError('Intent', id);
  }

  return {
    ...intent,
    policyEvaluations: policyEvaluations.map((item) => ({
      policyId: item.policyId,
      policyName: item.policy.name,
      result: item.result as 'allow' | 'deny' | 'require_approval',
      reason: item.reason ?? 'No reason was recorded.',
    })),
  };
}

export async function listIntents(workspaceId: string, input: ListIntentsInput) {
  const where = {
    workspaceId,
    ...(input.status && { status: input.status }),
    ...(input.agentId && { agentId: input.agentId }),
    ...(input.connectorId && { connectorId: input.connectorId }),
  };

  const [intents, total] = await Promise.all([
    prisma.intent.findMany({
      where,
      include: { agent: true, connector: true },
      orderBy: { createdAt: 'desc' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.intent.count({ where }),
  ]);

  return { intents, total, page: input.page, pageSize: input.pageSize };
}

export async function transitionIntent(
  id: string,
  workspaceId: string,
  targetState: IntentState,
  actorId: string,
  actorType: 'user' | 'agent' | 'system' = 'system',
) {
  const intent = await prisma.intent.findFirst({
    where: { id, workspaceId },
  });

  if (!intent) {
    throw new NotFoundError('Intent', id);
  }

  const currentState = intent.status as IntentState;

  if (!isValidTransition(currentState, targetState)) {
    throw new InvalidStateTransitionError(currentState, targetState);
  }

  const updated = await prisma.intent.update({
    where: { id },
    data: { status: targetState },
    include: { agent: true, connector: true },
  });

  await emitAuditEvent({
    action: `intent.${targetState}`,
    entityType: 'intent',
    entityId: id,
    actorType,
    actorId,
    workspaceId,
    metadata: { from: currentState, to: targetState },
  });

  return updated;
}

export async function proposeIntent(
  id: string,
  workspaceId: string,
  actorId: string,
  actorType: 'user' | 'agent' = 'agent',
) {
  return transitionIntent(id, workspaceId, 'proposed', actorId, actorType);
}

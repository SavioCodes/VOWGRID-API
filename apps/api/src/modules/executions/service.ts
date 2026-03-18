// ──────────────────────────────────────────
// VowGrid — Execution Service
// ──────────────────────────────────────────

import { prisma } from '../../lib/prisma.js';
import { executionQueue, rollbackQueue } from '../../lib/queue.js';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors.js';
import { transitionIntent } from '../intents/service.js';
import { emitAuditEvent } from '../audits/service.js';
import { assertCanQueueExecution, trackExecutionStart } from '../billing/entitlements.js';

export async function queueExecution(
  intentId: string,
  workspaceId: string,
  actorId: string,
  actorType: 'user' | 'agent' = 'agent',
) {
  const intent = await prisma.intent.findFirst({
    where: { id: intentId, workspaceId },
  });

  if (!intent) {
    throw new NotFoundError('Intent', intentId);
  }

  if (intent.status !== 'approved') {
    throw new ValidationError(
      `Intent must be in "approved" state to execute. Current state: "${intent.status}"`,
    );
  }

  // Idempotency: check for existing job
  const existingJob = await prisma.executionJob.findUnique({
    where: { intentId },
  });

  if (existingJob && existingJob.status !== 'failed') {
    throw new ConflictError('Execution job already exists for this intent');
  }

  const billing = await assertCanQueueExecution(workspaceId);

  // Create execution job record
  const executionJob = await prisma.executionJob.create({
    data: {
      intentId,
      status: 'queued',
      idempotencyKey: intent.idempotencyKey,
    },
  });

  // Transition intent to queued
  await transitionIntent(intentId, workspaceId, 'queued', actorId, actorType);

  // Add to BullMQ queue
  await executionQueue.add(
    'execute-intent',
    {
      intentId,
      executionJobId: executionJob.id,
      workspaceId,
    },
    {
      jobId: executionJob.id,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  );

  await emitAuditEvent({
    action: 'execution.queued',
    entityType: 'intent',
    entityId: intentId,
    actorType,
    actorId,
    workspaceId,
    metadata: { executionJobId: executionJob.id },
  });

  await trackExecutionStart(workspaceId, billing.entitlements.limits);

  return executionJob;
}

export async function requestRollback(
  intentId: string,
  workspaceId: string,
  actorId: string,
  actorType: 'user' | 'agent' = 'user',
  reason?: string,
) {
  const intent = await prisma.intent.findFirst({
    where: { id: intentId, workspaceId },
    include: { connector: true },
  });

  if (!intent) {
    throw new NotFoundError('Intent', intentId);
  }

  if (intent.status !== 'succeeded' && intent.status !== 'rollback_failed') {
    throw new ValidationError(
      `Intent must be in "succeeded" or "rollback_failed" state to rollback. Current state: "${intent.status}"`,
    );
  }

  // Check connector rollback support
  if (intent.connector && intent.connector.rollbackSupport === 'unsupported') {
    throw new ValidationError(`Connector "${intent.connector.name}" does not support rollback`);
  }

  const rollbackAttempt = await prisma.rollbackAttempt.create({
    data: {
      intentId,
      reason,
      status: 'pending',
    },
  });

  await transitionIntent(intentId, workspaceId, 'rollback_pending', actorId, actorType);

  await emitAuditEvent({
    action: 'rollback.requested',
    entityType: 'intent',
    entityId: intentId,
    actorType,
    actorId,
    workspaceId,
    metadata: { rollbackAttemptId: rollbackAttempt.id, reason },
  });

  try {
    await rollbackQueue.add(
      'rollback-intent',
      {
        intentId,
        rollbackAttemptId: rollbackAttempt.id,
        workspaceId,
      },
      {
        jobId: rollbackAttempt.id,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown rollback queue error';

    await prisma.rollbackAttempt.update({
      where: { id: rollbackAttempt.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        result: {
          error: errorMessage,
        },
      },
    });

    await transitionIntent(intentId, workspaceId, 'rollback_failed', 'system', 'system');

    await emitAuditEvent({
      action: 'rollback.queue_failed',
      entityType: 'intent',
      entityId: intentId,
      actorType: 'system',
      actorId: 'system',
      workspaceId,
      metadata: { rollbackAttemptId: rollbackAttempt.id, error: errorMessage },
    });

    throw error;
  }

  return rollbackAttempt;
}

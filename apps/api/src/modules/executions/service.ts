// ──────────────────────────────────────────
// VowGrid — Execution Service
// ──────────────────────────────────────────

import { prisma } from '../../lib/prisma.js';
import { executionQueue } from '../../lib/queue.js';
import { NotFoundError, ValidationError, ConflictError } from '../../common/errors.js';
import { transitionIntent } from '../intents/service.js';
import { emitAuditEvent } from '../audits/service.js';

export async function queueExecution(intentId: string, workspaceId: string, actorId: string) {
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

  // Create execution job record
  const executionJob = await prisma.executionJob.create({
    data: {
      intentId,
      status: 'queued',
      idempotencyKey: intent.idempotencyKey,
    },
  });

  // Transition intent to queued
  await transitionIntent(intentId, workspaceId, 'queued', actorId, 'system');

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
    actorType: 'system',
    actorId,
    workspaceId,
    metadata: { executionJobId: executionJob.id },
  });

  return executionJob;
}

export async function requestRollback(intentId: string, workspaceId: string, actorId: string, reason?: string) {
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
    throw new ValidationError(
      `Connector "${intent.connector.name}" does not support rollback`,
    );
  }

  const rollbackAttempt = await prisma.rollbackAttempt.create({
    data: {
      intentId,
      reason,
      status: 'pending',
    },
  });

  await transitionIntent(intentId, workspaceId, 'rollback_pending', actorId, 'user');

  await emitAuditEvent({
    action: 'rollback.requested',
    entityType: 'intent',
    entityId: intentId,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: { rollbackAttemptId: rollbackAttempt.id, reason },
  });

  return rollbackAttempt;
}

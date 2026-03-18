import { Worker, type Job } from 'bullmq';
import { toPrismaJsonValue } from '../common/json.js';
import { bullmqConnection } from '../lib/queue.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { emitAuditEvent } from '../modules/audits/service.js';
import { connectorRegistry } from '../modules/connectors/framework/connector.registry.js';
import { transitionIntent } from '../modules/intents/service.js';

interface RollbackJobData {
  intentId: string;
  rollbackAttemptId: string;
  workspaceId: string;
}

function getExecutionContext(intent: {
  executionJob: { result: unknown } | null;
  receipts: Array<{ type: string; data: unknown }>;
}) {
  if (intent.executionJob?.result && typeof intent.executionJob.result === 'object') {
    return intent.executionJob.result as Record<string, unknown>;
  }

  const executionReceipt = intent.receipts.find((receipt) => receipt.type === 'execution');
  if (executionReceipt?.data && typeof executionReceipt.data === 'object') {
    return executionReceipt.data as Record<string, unknown>;
  }

  return {};
}

export async function processRollback(job: Job<RollbackJobData>) {
  const { intentId, rollbackAttemptId, workspaceId } = job.data;
  const log = logger.child({ intentId, rollbackAttemptId, jobId: job.id });
  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? 1;

  log.info({ attemptNumber, maxAttempts }, 'Processing rollback job');

  await prisma.rollbackAttempt.update({
    where: { id: rollbackAttemptId },
    data: {
      status: 'in_progress',
      startedAt: new Date(),
    },
  });

  const intent = await prisma.intent.findUniqueOrThrow({
    where: { id: intentId },
    include: {
      connector: true,
      executionJob: true,
      receipts: true,
    },
  });

  const connectorType = intent.connector?.type ?? 'mock';
  const connector = connectorRegistry.get(connectorType);

  if (!connector) {
    throw new Error(`Connector type "${connectorType}" is not registered`);
  }

  if (!connector.rollback) {
    throw new Error(`Connector type "${connectorType}" does not implement rollback execution`);
  }

  const executionContext = getExecutionContext(intent);
  const startTime = Date.now();

  try {
    const result = await connector.rollback(
      intent.action,
      (intent.parameters as Record<string, unknown>) ?? {},
      executionContext,
    );

    await prisma.rollbackAttempt.update({
      where: { id: rollbackAttemptId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        result: toPrismaJsonValue(result.data),
      },
    });

    await transitionIntent(intentId, workspaceId, 'rolled_back', 'system', 'system');

    await prisma.receipt.create({
      data: {
        intentId,
        type: 'rollback',
        summary: `Rollback of "${intent.action}" completed successfully`,
        data: toPrismaJsonValue({
          action: intent.action,
          connectorType,
          rollbackAttemptId,
          result: result.data,
          attempts: attemptNumber,
          originalExecution: executionContext,
        }),
        duration: Date.now() - startTime,
      },
    });

    await emitAuditEvent({
      action: 'rollback.completed',
      entityType: 'intent',
      entityId: intentId,
      actorType: 'system',
      actorId: 'system',
      workspaceId,
      metadata: { rollbackAttemptId, duration: Date.now() - startTime },
    });

    log.info({ attemptNumber }, 'Rollback completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown rollback error';
    const isFinalAttempt = attemptNumber >= maxAttempts;

    if (isFinalAttempt) {
      await prisma.rollbackAttempt.update({
        where: { id: rollbackAttemptId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          result: toPrismaJsonValue({
            error: errorMessage,
            attempts: attemptNumber,
          }),
        },
      });

      await transitionIntent(intentId, workspaceId, 'rollback_failed', 'system', 'system');

      await emitAuditEvent({
        action: 'rollback.failed',
        entityType: 'intent',
        entityId: intentId,
        actorType: 'system',
        actorId: 'system',
        workspaceId,
        metadata: { rollbackAttemptId, error: errorMessage, attempts: attemptNumber },
      });
    } else {
      await prisma.rollbackAttempt.update({
        where: { id: rollbackAttemptId },
        data: {
          result: toPrismaJsonValue({
            lastError: errorMessage,
            attempts: attemptNumber,
          }),
        },
      });
    }

    log.error({ error: errorMessage, attemptNumber, maxAttempts }, 'Rollback attempt failed');
    throw error;
  }
}

export function startRollbackWorker() {
  const worker = new Worker('rollback', processRollback, {
    connection: bullmqConnection,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Rollback job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Rollback job failed');
  });

  logger.info('Rollback worker started');
  return worker;
}

// ──────────────────────────────────────────
// VowGrid — Execution Worker (BullMQ)
// ──────────────────────────────────────────

import { Worker, Job } from 'bullmq';
import { toPrismaJsonValue } from '../common/json.js';
import { bullmqConnection } from '../lib/queue.js';
import { prisma } from '../lib/prisma.js';
import { connectorRegistry } from '../modules/connectors/framework/connector.registry.js';
import { transitionIntent } from '../modules/intents/service.js';
import { emitAuditEvent } from '../modules/audits/service.js';
import { logger } from '../lib/logger.js';
import { observeExecutionEvent } from '../lib/metrics.js';

interface ExecutionJobData {
  intentId: string;
  executionJobId: string;
  workspaceId: string;
}

async function processExecution(job: Job<ExecutionJobData>) {
  const { intentId, executionJobId, workspaceId } = job.data;
  const log = logger.child({ intentId, executionJobId, jobId: job.id });

  log.info('Processing execution job');

  // Update job status
  await prisma.executionJob.update({
    where: { id: executionJobId },
    data: { status: 'processing', startedAt: new Date(), attempts: job.attemptsMade + 1 },
  });

  // Transition intent to executing
  await transitionIntent(intentId, workspaceId, 'executing', 'system', 'system');
  observeExecutionEvent('started');

  const intent = await prisma.intent.findUniqueOrThrow({
    where: { id: intentId },
    include: { connector: true },
  });

  // Get connector
  const connectorType = intent.connector?.type ?? 'mock';
  const connector = connectorRegistry.get(connectorType);

  if (!connector) {
    throw new Error(`Connector type "${connectorType}" is not registered`);
  }

  const startTime = Date.now();

  try {
    // Execute
    const result = await connector.execute(
      intent.action,
      (intent.parameters as Record<string, unknown>) ?? {},
    );

    // Update job
    await prisma.executionJob.update({
      where: { id: executionJobId },
      data: {
        status: 'completed',
        result: toPrismaJsonValue(result.data),
        completedAt: new Date(),
      },
    });

    // Transition intent to succeeded
    await transitionIntent(intentId, workspaceId, 'succeeded', 'system', 'system');

    // Generate receipt
    await prisma.receipt.create({
      data: {
        intentId,
        type: 'execution',
        summary: `Execution of "${intent.action}" completed successfully`,
        data: toPrismaJsonValue({
          action: intent.action,
          connectorType,
          parameters: intent.parameters,
          result: result.data,
          executionJobId,
          attempts: job.attemptsMade + 1,
        }),
        duration: Date.now() - startTime,
      },
    });

    await emitAuditEvent({
      action: 'execution.completed',
      entityType: 'intent',
      entityId: intentId,
      actorType: 'system',
      actorId: 'system',
      workspaceId,
      metadata: { executionJobId, duration: result.duration },
    });

    observeExecutionEvent('completed');
    log.info({ duration: result.duration }, 'Execution completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.executionJob.update({
      where: { id: executionJobId },
      data: {
        status: 'failed',
        error: errorMessage,
        completedAt: new Date(),
      },
    });

    await transitionIntent(intentId, workspaceId, 'failed', 'system', 'system');

    await emitAuditEvent({
      action: 'execution.failed',
      entityType: 'intent',
      entityId: intentId,
      actorType: 'system',
      actorId: 'system',
      workspaceId,
      metadata: { executionJobId, error: errorMessage, attempts: job.attemptsMade + 1 },
    });

    observeExecutionEvent('failed');
    log.error({ error: errorMessage }, 'Execution failed');
    throw error; // Re-throw so BullMQ handles retries
  }
}

export function startExecutionWorker() {
  const worker = new Worker('execution', processExecution, {
    connection: bullmqConnection,
    concurrency: 5,
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Execution job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'Execution job failed');
  });

  logger.info('🔧 Execution worker started');
  return worker;
}

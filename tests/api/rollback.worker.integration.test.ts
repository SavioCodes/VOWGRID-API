import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Job } from 'bullmq';
import { connectorRegistry } from '../../apps/api/src/modules/connectors/framework/connector.registry.js';
import { MockConnector } from '../../apps/api/src/modules/connectors/framework/mock.connector.js';
import { prisma } from '../../apps/api/src/lib/prisma.js';
import { processRollback } from '../../apps/api/src/jobs/rollback.worker.js';

describe('rollback worker integration', () => {
  const createdWorkspaceIds: string[] = [];

  beforeAll(async () => {
    if (!connectorRegistry.has('mock')) {
      connectorRegistry.register('mock', new MockConnector());
    }

    await prisma.$connect();
  });

  afterAll(async () => {
    if (createdWorkspaceIds.length > 0) {
      await prisma.workspace.deleteMany({
        where: {
          id: {
            in: createdWorkspaceIds,
          },
        },
      });
    }

    await prisma.$disconnect();
  });

  it('completes a rollback attempt and writes the rollback receipt', async () => {
    const uniqueId = Date.now().toString();
    const workspace = await prisma.workspace.create({
      data: {
        name: `Rollback Workspace ${uniqueId}`,
        slug: `rollback-workspace-${uniqueId}`,
      },
    });
    createdWorkspaceIds.push(workspace.id);

    const agent = await prisma.agent.create({
      data: {
        name: 'Rollback Agent',
        type: 'external',
        workspaceId: workspace.id,
      },
    });

    const connector = await prisma.connector.create({
      data: {
        name: 'Mock Control Connector',
        type: 'mock',
        rollbackSupport: 'supported',
        workspaceId: workspace.id,
        enabled: true,
      },
    });

    const intent = await prisma.intent.create({
      data: {
        title: 'Rollback target',
        action: 'send_message',
        agentId: agent.id,
        connectorId: connector.id,
        workspaceId: workspace.id,
        status: 'rollback_pending',
        parameters: {
          destination: '#ops',
        },
      },
    });

    await prisma.executionJob.create({
      data: {
        intentId: intent.id,
        status: 'completed',
        result: {
          action: 'send_message',
          executedAt: new Date().toISOString(),
        },
      },
    });

    const rollbackAttempt = await prisma.rollbackAttempt.create({
      data: {
        intentId: intent.id,
        status: 'pending',
        reason: 'Integration test rollback',
      },
    });

    const job = {
      id: rollbackAttempt.id,
      data: {
        intentId: intent.id,
        rollbackAttemptId: rollbackAttempt.id,
        workspaceId: workspace.id,
      },
      attemptsMade: 0,
      opts: {
        attempts: 3,
      },
    } as Job<{
      intentId: string;
      rollbackAttemptId: string;
      workspaceId: string;
    }>;

    await processRollback(job);

    const updatedIntent = await prisma.intent.findUniqueOrThrow({
      where: { id: intent.id },
    });
    const updatedAttempt = await prisma.rollbackAttempt.findUniqueOrThrow({
      where: { id: rollbackAttempt.id },
    });
    const rollbackReceipt = await prisma.receipt.findFirst({
      where: {
        intentId: intent.id,
        type: 'rollback',
      },
    });

    expect(updatedIntent.status).toBe('rolled_back');
    expect(updatedAttempt.status).toBe('completed');
    expect(updatedAttempt.completedAt).not.toBeNull();
    expect(rollbackReceipt).not.toBeNull();
  });
});

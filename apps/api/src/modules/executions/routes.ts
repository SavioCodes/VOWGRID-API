// ──────────────────────────────────────────
// VowGrid — Execution Routes
// ──────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { queueExecution, requestRollback } from './service.js';
import { success } from '../../common/response.js';
import { z } from 'zod';
import { ValidationError } from '../../common/errors.js';

const rollbackSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export async function executionRoutes(app: FastifyInstance): Promise<void> {
  app.post('/intents/:intentId/execute', {
    schema: {
      tags: ['Executions'],
      summary: 'Execute an approved intent',
      description: 'Queues the intent for execution via BullMQ. Intent must be approved.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { intentId } = request.params as { intentId: string };
      const job = await queueExecution(
        intentId,
        request.auth.workspaceId,
        request.auth.apiKeyId ?? 'system',
      );
      return reply.status(202).send(success(job));
    },
  });

  app.post('/intents/:intentId/rollback', {
    schema: {
      tags: ['Executions'],
      summary: 'Request rollback for an executed intent',
      description: 'Creates a rollback attempt. Intent must be in succeeded or rollback_failed state.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { intentId } = request.params as { intentId: string };
      const parsed = rollbackSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new ValidationError('Invalid rollback data', parsed.error.flatten());
      }
      const rollback = await requestRollback(
        intentId,
        request.auth.workspaceId,
        request.auth.apiKeyId ?? 'system',
        parsed.data.reason,
      );
      return reply.status(202).send(success(rollback));
    },
  });
}

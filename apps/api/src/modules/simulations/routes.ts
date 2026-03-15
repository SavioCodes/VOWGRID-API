// ──────────────────────────────────────────
// VowGrid — Simulation Routes
// ──────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { simulateIntent } from './service.js';
import { success } from '../../common/response.js';

export async function simulationRoutes(app: FastifyInstance): Promise<void> {
  app.post('/intents/:intentId/simulate', {
    schema: {
      tags: ['Simulations'],
      summary: 'Simulate an intent',
      description: 'Runs connector simulation and persists results. Intent must be in "proposed" state.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { intentId } = request.params as { intentId: string };
      const result = await simulateIntent(
        intentId,
        request.auth.workspaceId,
        request.auth.apiKeyId ?? 'system',
      );
      return reply.status(200).send(success(result));
    },
  });
}

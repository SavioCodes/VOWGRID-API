// --------------------------------------------------------------------------
// VowGrid - Intent Routes
// --------------------------------------------------------------------------

import { FastifyInstance } from 'fastify';
import { ValidationError } from '../../common/errors.js';
import { paginated, success } from '../../common/response.js';
import { getActorId, getActorType } from '../../plugins/auth.plugin.js';
import { createIntentSchema, listIntentsSchema } from './schemas.js';
import { createIntent, getIntent, listIntents, proposeIntent } from './service.js';

export async function intentRoutes(app: FastifyInstance): Promise<void> {
  app.post('/intents', {
    schema: {
      tags: ['Intents'],
      summary: 'Create a new intent',
      description: 'Creates a new intent in draft state.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const parsed = createIntentSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid intent data', parsed.error.flatten());
      }

      const intent = await createIntent(
        request.auth.workspaceId,
        parsed.data,
        getActorId(request.auth),
        getActorType(request.auth),
      );

      return reply.status(201).send(success(intent));
    },
  });

  app.post('/intents/:intentId/propose', {
    schema: {
      tags: ['Intents'],
      summary: 'Promote a draft intent to proposed',
      description: 'Moves an intent from draft into proposed so it can be simulated.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { intentId } = request.params as { intentId: string };
      const intent = await proposeIntent(
        intentId,
        request.auth.workspaceId,
        getActorId(request.auth),
        getActorType(request.auth),
      );

      return reply.send(success(intent));
    },
  });

  app.get('/intents', {
    schema: {
      tags: ['Intents'],
      summary: 'List intents',
      description: 'List intents with pagination and filtering.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const parsed = listIntentsSchema.safeParse(request.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid query parameters', parsed.error.flatten());
      }

      const result = await listIntents(request.auth.workspaceId, parsed.data);

      return reply.send(paginated(result.intents, result.total, result.page, result.pageSize));
    },
  });

  app.get('/intents/:intentId', {
    schema: {
      tags: ['Intents'],
      summary: 'Get intent details',
      description:
        'Get full intent details including simulation, policy evaluation, approvals, execution, and receipts.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { intentId } = request.params as { intentId: string };
      const intent = await getIntent(intentId, request.auth.workspaceId);
      return reply.send(success(intent));
    },
  });
}

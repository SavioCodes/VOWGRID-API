// ──────────────────────────────────────────
// VowGrid — Policy Routes
// ──────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { createPolicySchema, createPolicy, listPolicies } from './service.js';
import { success } from '../../common/response.js';
import { ValidationError } from '../../common/errors.js';

export async function policyRoutes(app: FastifyInstance): Promise<void> {
  app.post('/policies', {
    schema: {
      tags: ['Policies'],
      summary: 'Create a policy',
      description: 'Create a new policy rule for the workspace',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const parsed = createPolicySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid policy data', parsed.error.flatten());
      }
      const policy = await createPolicy(request.auth.workspaceId, parsed.data);
      return reply.status(201).send(success(policy));
    },
  });

  app.get('/policies', {
    schema: {
      tags: ['Policies'],
      summary: 'List policies',
      description: 'List all policies for the workspace, ordered by priority',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const policies = await listPolicies(request.auth.workspaceId);
      return reply.send(success(policies));
    },
  });
}

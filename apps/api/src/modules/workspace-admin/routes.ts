import { FastifyInstance } from 'fastify';
import { createWorkspaceApiKeySchema, rotateWorkspaceApiKeySchema } from '@vowgrid/contracts';
import { ForbiddenError, ValidationError } from '../../common/errors.js';
import { success } from '../../common/response.js';
import {
  createWorkspaceApiKey,
  listWorkspaceApiKeys,
  revokeWorkspaceApiKey,
  rotateWorkspaceApiKey,
} from './service.js';

function requireWorkspaceAdmin(role?: string) {
  if (role !== 'owner' && role !== 'admin') {
    throw new ForbiddenError('Only workspace owners and admins can manage API keys.');
  }
}

export async function workspaceAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/workspace/api-keys', {
    schema: {
      tags: ['Workspace'],
      summary: 'List workspace API keys',
      description: 'Returns workspace API key metadata without exposing full secrets.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const keys = await listWorkspaceApiKeys(request.auth.workspaceId);
      return reply.send(success(keys));
    },
  });

  app.post('/workspace/api-keys', {
    schema: {
      tags: ['Workspace'],
      summary: 'Create workspace API key',
      description: 'Creates a full-scope workspace API key and returns the secret exactly once.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const parsed = createWorkspaceApiKeySchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid API key payload', parsed.error.flatten());
      }

      const created = await createWorkspaceApiKey(
        request.auth.workspaceId,
        parsed.data,
        request.auth.userId ?? 'system',
      );
      return reply.status(201).send(success(created));
    },
  });

  app.post('/workspace/api-keys/:apiKeyId/rotate', {
    schema: {
      tags: ['Workspace'],
      summary: 'Rotate workspace API key',
      description:
        'Revokes the current workspace API key and returns a newly generated replacement exactly once.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const parsed = rotateWorkspaceApiKeySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new ValidationError('Invalid API key rotation payload', parsed.error.flatten());
      }

      const rotated = await rotateWorkspaceApiKey(
        (request.params as { apiKeyId: string }).apiKeyId,
        request.auth.workspaceId,
        request.auth.userId ?? 'system',
      );
      return reply.send(success(rotated));
    },
  });

  app.post('/workspace/api-keys/:apiKeyId/revoke', {
    schema: {
      tags: ['Workspace'],
      summary: 'Revoke workspace API key',
      description: 'Revokes a workspace API key so it can no longer authenticate future requests.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const revoked = await revokeWorkspaceApiKey(
        (request.params as { apiKeyId: string }).apiKeyId,
        request.auth.workspaceId,
        request.auth.userId ?? 'system',
      );
      return reply.send(success(revoked));
    },
  });
}

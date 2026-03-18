import { FastifyInstance } from 'fastify';
import {
  anonymizeWorkspaceMemberSchema,
  createWorkspaceApiKeySchema,
  createWorkspaceInviteSchema,
  createWorkspaceMemberSchema,
  rotateWorkspaceApiKeySchema,
  updateWorkspaceMemberSchema,
} from '@vowgrid/contracts';
import { ForbiddenError, ValidationError } from '../../common/errors.js';
import { success } from '../../common/response.js';
import {
  anonymizeWorkspaceMember,
  createWorkspaceApiKey,
  createWorkspaceInvite,
  createWorkspaceMember,
  disableWorkspaceMember,
  enableWorkspaceMember,
  exportWorkspaceData,
  listWorkspaceApiKeys,
  listWorkspaceInvites,
  listWorkspaceMembers,
  revokeWorkspaceApiKey,
  revokeWorkspaceInvite,
  rotateWorkspaceApiKey,
  updateWorkspaceMember,
} from './service.js';

function requireWorkspaceAdmin(role?: string) {
  if (role !== 'owner' && role !== 'admin') {
    throw new ForbiddenError('Only workspace owners and admins can manage workspace access.');
  }
}

function requireWorkspaceOwner(role?: string) {
  if (role !== 'owner') {
    throw new ForbiddenError('Only workspace owners can perform this action.');
  }
}

export async function workspaceAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get('/workspace/members', {
    schema: {
      tags: ['Workspace'],
      summary: 'List workspace members',
      description: 'Returns active and disabled members for the current workspace.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const members = await listWorkspaceMembers(request.auth.workspaceId);
      return reply.send(success(members));
    },
  });

  app.post('/workspace/members', {
    schema: {
      tags: ['Workspace'],
      summary: 'Create workspace member',
      description: 'Creates a new workspace member inside the current single-workspace boundary.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const parsed = createWorkspaceMemberSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid workspace member payload', parsed.error.flatten());
      }

      const created = await createWorkspaceMember(
        request.auth.workspaceId,
        parsed.data,
        request.auth.userId ?? 'system',
      );
      return reply.status(201).send(success(created));
    },
  });

  app.patch('/workspace/members/:userId', {
    schema: {
      tags: ['Workspace'],
      summary: 'Update workspace member',
      description: 'Updates the mutable profile fields for an existing workspace member.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const parsed = updateWorkspaceMemberSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Invalid workspace member update payload',
          parsed.error.flatten(),
        );
      }

      const updated = await updateWorkspaceMember(
        (request.params as { userId: string }).userId,
        request.auth.workspaceId,
        parsed.data,
        request.auth.userId ?? 'system',
      );
      return reply.send(success(updated));
    },
  });

  app.post('/workspace/members/:userId/disable', {
    schema: {
      tags: ['Workspace'],
      summary: 'Disable workspace member',
      description: 'Disables a workspace member and revokes their existing dashboard sessions.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const disabled = await disableWorkspaceMember(
        (request.params as { userId: string }).userId,
        request.auth.workspaceId,
        request.auth.userId ?? 'system',
      );
      return reply.send(success(disabled));
    },
  });

  app.post('/workspace/members/:userId/enable', {
    schema: {
      tags: ['Workspace'],
      summary: 'Enable workspace member',
      description: 'Re-enables a previously disabled workspace member.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const enabled = await enableWorkspaceMember(
        (request.params as { userId: string }).userId,
        request.auth.workspaceId,
        request.auth.userId ?? 'system',
      );
      return reply.send(success(enabled));
    },
  });

  app.post('/workspace/members/:userId/anonymize', {
    schema: {
      tags: ['Workspace'],
      summary: 'Anonymize workspace member',
      description:
        'Replaces a disabled member personal identity with a redacted placeholder while preserving operational history.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceOwner(request.auth.role);
      const parsed = anonymizeWorkspaceMemberSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new ValidationError('Invalid anonymization payload', parsed.error.flatten());
      }

      const anonymized = await anonymizeWorkspaceMember(
        (request.params as { userId: string }).userId,
        request.auth.workspaceId,
        request.auth.userId ?? 'system',
      );
      return reply.send(success(anonymized));
    },
  });

  app.get('/workspace/export', {
    schema: {
      tags: ['Workspace'],
      summary: 'Export workspace data',
      description:
        'Returns a JSON snapshot of workspace access, governance, billing summary, and trust workflow records.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const exported = await exportWorkspaceData(request.auth.workspaceId);
      return reply.send(success(exported));
    },
  });

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

  app.get('/workspace/invites', {
    schema: {
      tags: ['Workspace'],
      summary: 'List workspace invites',
      description:
        'Returns pending, accepted, revoked, and expired invites for the current workspace.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const invites = await listWorkspaceInvites(request.auth.workspaceId);
      return reply.send(success(invites));
    },
  });

  app.post('/workspace/invites', {
    schema: {
      tags: ['Workspace'],
      summary: 'Create workspace invite',
      description: 'Creates an emailed workspace invite for a future or existing user.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const parsed = createWorkspaceInviteSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid workspace invite payload', parsed.error.flatten());
      }

      const created = await createWorkspaceInvite(
        request.auth.workspaceId,
        parsed.data,
        request.auth.userId ?? 'system',
      );
      return reply.status(201).send(success(created));
    },
  });

  app.post('/workspace/invites/:inviteId/revoke', {
    schema: {
      tags: ['Workspace'],
      summary: 'Revoke workspace invite',
      description: 'Revokes a workspace invite before it is accepted.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireWorkspaceAdmin(request.auth.role);
      const revoked = await revokeWorkspaceInvite(
        (request.params as { inviteId: string }).inviteId,
        request.auth.workspaceId,
        request.auth.userId ?? 'system',
      );
      return reply.send(success(revoked));
    },
  });
}

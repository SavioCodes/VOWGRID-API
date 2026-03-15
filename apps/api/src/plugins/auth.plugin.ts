// ──────────────────────────────────────────
// VowGrid — Auth Plugin (API Key + JWT foundation)
// ──────────────────────────────────────────

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../common/errors.js';

export interface AuthContext {
  workspaceId: string;
  apiKeyId?: string;
  userId?: string;
  scopes: string[];
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext;
  }
}

function hashApiKey(key: string): string {
  return createHash('sha256').update(`${env.API_KEY_SALT}:${key}`).digest('hex');
}

async function authenticateApiKey(request: FastifyRequest): Promise<AuthContext> {
  const apiKey = request.headers['x-api-key'] as string | undefined;
  if (!apiKey) {
    throw new UnauthorizedError('Missing API key. Provide X-Api-Key header.');
  }

  const keyHash = hashApiKey(apiKey);
  const key = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!key) {
    throw new UnauthorizedError('Invalid API key.');
  }

  if (key.revokedAt) {
    throw new UnauthorizedError('API key has been revoked.');
  }

  if (key.expiresAt && key.expiresAt < new Date()) {
    throw new UnauthorizedError('API key has expired.');
  }

  // Update last used timestamp (non-blocking)
  prisma.apiKey
    .update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {
      // Swallow error — non-critical
    });

  return {
    workspaceId: key.workspaceId,
    apiKeyId: key.id,
    scopes: key.scopes,
  };
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('auth', null as unknown as AuthContext);

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      request.auth = await authenticateApiKey(request);
    },
  );
}

export default fp(authPlugin, {
  name: 'auth',
  fastify: '5.x',
});

export { hashApiKey };

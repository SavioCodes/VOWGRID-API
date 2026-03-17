// --------------------------------------------------------------------------
// VowGrid - Auth Plugin
// --------------------------------------------------------------------------

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { createHash } from 'node:crypto';
import { UnauthorizedError } from '../common/errors.js';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { getSessionAuthenticationContext } from '../modules/auth/service.js';

export interface AuthContext {
  authType: 'api_key' | 'session';
  workspaceId: string;
  sessionId?: string;
  apiKeyId?: string;
  userId?: string;
  role?: string;
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

function getBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.slice('Bearer '.length).trim();
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

  prisma.apiKey
    .update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => undefined);

  return {
    authType: 'api_key',
    workspaceId: key.workspaceId,
    apiKeyId: key.id,
    scopes: key.scopes,
  };
}

async function authenticateSession(request: FastifyRequest): Promise<AuthContext> {
  const token = getBearerToken(request);

  if (!token) {
    throw new UnauthorizedError('Missing bearer token. Provide Authorization: Bearer <session>.');
  }

  const session = await getSessionAuthenticationContext(token);

  return {
    authType: 'session',
    workspaceId: session.workspaceId,
    sessionId: session.sessionId,
    userId: session.userId,
    role: session.role,
    scopes: ['dashboard'],
  };
}

export function getActorId(auth: AuthContext) {
  return auth.authType === 'session' ? auth.userId ?? 'system' : auth.apiKeyId ?? 'system';
}

export function getActorType(auth: AuthContext): 'user' | 'agent' {
  return auth.authType === 'session' ? 'user' : 'agent';
}

async function authPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.decorateRequest('auth', null as unknown as AuthContext);

  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      request.auth = getBearerToken(request)
        ? await authenticateSession(request)
        : await authenticateApiKey(request);
    },
  );

  fastify.decorate(
    'authenticateSession',
    async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
      request.auth = await authenticateSession(request);
    },
  );
}

export default fp(authPlugin, {
  name: 'auth',
  fastify: '5.x',
});

export { hashApiKey };

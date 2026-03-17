import { FastifyInstance } from 'fastify';
import { loginSchema, signupSchema } from '@vowgrid/contracts';
import { ValidationError } from '../../common/errors.js';
import { success } from '../../common/response.js';
import {
  getCurrentDashboardSession,
  loginDashboardUser,
  logoutDashboardSession,
  signupDashboardUser,
} from './service.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/signup', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a workspace owner',
      description: 'Creates a workspace, owner account, initial trial state, and dashboard session.',
      security: [],
    },
    handler: async (request, reply) => {
      const parsed = signupSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid signup payload', parsed.error.flatten());
      }

      const result = await signupDashboardUser(parsed.data);
      return reply.status(201).send(success(result));
    },
  });

  app.post('/auth/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Log in to the dashboard',
      description: 'Creates a session token for a dashboard user.',
      security: [],
    },
    handler: async (request, reply) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid login payload', parsed.error.flatten());
      }

      const result = await loginDashboardUser(parsed.data);
      return reply.send(success(result));
    },
  });

  app.get('/auth/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Get the current dashboard session',
      description: 'Returns the authenticated dashboard user, workspace, and session summary.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) {
        throw new ValidationError('Missing bearer token.');
      }

      const result = await getCurrentDashboardSession(token);
      return reply.send(success(result));
    },
  });

  app.post('/auth/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Log out of the dashboard',
      description: 'Revokes the current dashboard session token.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      await logoutDashboardSession(request.auth.sessionId!);
      return reply.send(success({ revoked: true }));
    },
  });
}

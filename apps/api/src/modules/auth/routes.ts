import { FastifyInstance } from 'fastify';
import {
  acceptWorkspaceInviteSchema,
  completeOauthSignupSchema,
  emailVerificationConfirmSchema,
  loginSchema,
  oauthCompleteSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  signupSchema,
  switchWorkspaceSchema,
} from '@vowgrid/contracts';
import { ValidationError } from '../../common/errors.js';
import { success } from '../../common/response.js';
import {
  acceptWorkspaceInvite,
  completeDashboardOauth,
  completeDashboardOauthSignup,
  confirmDashboardPasswordReset,
  getCurrentDashboardSession,
  loginDashboardUser,
  logoutDashboardSession,
  requestDashboardEmailVerification,
  requestDashboardPasswordReset,
  signupDashboardUser,
  switchDashboardWorkspace,
  verifyDashboardEmailToken,
} from './service.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/signup', {
    schema: {
      tags: ['Auth'],
      summary: 'Register a workspace owner',
      description:
        'Creates a workspace, owner account, initial trial state, and dashboard session.',
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

  app.post('/auth/oauth/complete', {
    schema: {
      tags: ['Auth'],
      summary: 'Complete OAuth login or detect OAuth signup',
      description:
        'Consumes a verified provider identity from the web auth callback. Existing users receive a dashboard session; new users receive a short-lived onboarding token.',
      security: [],
    },
    handler: async (request, reply) => {
      const parsed = oauthCompleteSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid OAuth completion payload', parsed.error.flatten());
      }

      const result = await completeDashboardOauth(parsed.data);
      return reply.send(success(result));
    },
  });

  app.post('/auth/oauth/signup/complete', {
    schema: {
      tags: ['Auth'],
      summary: 'Complete OAuth signup',
      description:
        'Consumes a short-lived OAuth onboarding token, creates the first workspace, links the provider account, and opens a dashboard session.',
      security: [],
    },
    handler: async (request, reply) => {
      const parsed = completeOauthSignupSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid OAuth signup payload', parsed.error.flatten());
      }

      const result = await completeDashboardOauthSignup(parsed.data);
      return reply.status(201).send(success(result));
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

  app.post('/auth/password-reset/request', {
    schema: {
      tags: ['Auth'],
      summary: 'Request a password reset',
      description:
        'Generates a password reset token and sends a recovery email when the account exists.',
      security: [],
    },
    handler: async (request, reply) => {
      const parsed = passwordResetRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid password reset request payload', parsed.error.flatten());
      }

      const result = await requestDashboardPasswordReset(parsed.data);
      return reply.send(success(result));
    },
  });

  app.post('/auth/password-reset/confirm', {
    schema: {
      tags: ['Auth'],
      summary: 'Confirm a password reset',
      description: 'Consumes a password reset token and writes the new password hash.',
      security: [],
    },
    handler: async (request, reply) => {
      const parsed = passwordResetConfirmSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError(
          'Invalid password reset confirmation payload',
          parsed.error.flatten(),
        );
      }

      const result = await confirmDashboardPasswordReset(parsed.data);
      return reply.send(success(result));
    },
  });

  app.post('/auth/email-verification/request', {
    schema: {
      tags: ['Auth'],
      summary: 'Request an email verification link',
      description: 'Creates a fresh email verification token for the current dashboard user.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      const result = await requestDashboardEmailVerification(request.auth.userId!);
      return reply.send(success(result));
    },
  });

  app.post('/auth/email-verification/verify', {
    schema: {
      tags: ['Auth'],
      summary: 'Verify an email address',
      description: 'Consumes an email verification token and marks the user as verified.',
      security: [],
    },
    handler: async (request, reply) => {
      const parsed = emailVerificationConfirmSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid email verification payload', parsed.error.flatten());
      }

      const result = await verifyDashboardEmailToken(parsed.data.token);
      return reply.send(success(result));
    },
  });

  app.post('/auth/switch-workspace', {
    schema: {
      tags: ['Auth'],
      summary: 'Switch the active dashboard workspace',
      description: 'Moves the current dashboard session to another workspace membership.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      const parsed = switchWorkspaceSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid workspace switch payload', parsed.error.flatten());
      }

      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) {
        throw new ValidationError('Missing bearer token.');
      }

      const result = await switchDashboardWorkspace(token, parsed.data.workspaceId);
      return reply.send(success(result));
    },
  });

  app.post('/auth/invites/accept', {
    schema: {
      tags: ['Auth'],
      summary: 'Accept a workspace invite',
      description:
        'Accepts an emailed workspace invite. Existing users can join directly; new users can create an account as part of acceptance.',
      security: [],
    },
    handler: async (request, reply) => {
      const parsed = acceptWorkspaceInviteSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid workspace invite payload', parsed.error.flatten());
      }

      const result = await acceptWorkspaceInvite(parsed.data);
      return reply.send(success(result));
    },
  });
}

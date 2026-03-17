import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthContext } from '../plugins/auth.plugin.js';

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext;
  }

  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    authenticateSession(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

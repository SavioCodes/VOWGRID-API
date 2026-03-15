// ──────────────────────────────────────────
// VowGrid — Audit Routes
// ──────────────────────────────────────────

import { FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { paginated } from '../../common/response.js';
import { ValidationError } from '../../common/errors.js';
import { z } from 'zod';

const listAuditEventsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  actorType: z.string().optional(),
  actorId: z.string().optional(),
});

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  const authenticate = (
    app as FastifyInstance & {
      authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    }
  ).authenticate;

  app.get('/audit-events', {
    schema: {
      tags: ['Audits'],
      summary: 'List audit events',
      description: 'Query audit events with filtering and pagination',
    },
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const parsed = listAuditEventsSchema.safeParse(request.query);
      if (!parsed.success) {
        throw new ValidationError('Invalid query parameters', parsed.error.flatten());
      }

      const { page, pageSize, ...filters } = parsed.data;

      const where = {
        workspaceId: request.auth.workspaceId,
        ...(filters.entityType && { entityType: filters.entityType }),
        ...(filters.entityId && { entityId: filters.entityId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.actorType && { actorType: filters.actorType }),
        ...(filters.actorId && { actorId: filters.actorId }),
      };

      const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.auditEvent.count({ where }),
      ]);

      return reply.send(paginated(events, total, page, pageSize));
    },
  });
}

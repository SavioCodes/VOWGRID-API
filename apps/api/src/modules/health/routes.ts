// ──────────────────────────────────────────
// VowGrid — Health Module
// ──────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';

const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    timestamp: { type: 'string' },
    services: {
      type: 'object',
      properties: {
        database: { type: 'string' },
        redis: { type: 'string' },
      },
    },
    version: { type: 'string' },
  },
};

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', {
    schema: {
      tags: ['Health'],
      summary: 'System health check',
      description: 'Checks database and Redis connectivity',
      response: {
        200: healthResponseSchema,
        503: healthResponseSchema,
      },
    },
    handler: async (_request, reply) => {
      let dbStatus = 'healthy';
      let redisStatus = 'healthy';

      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch {
        dbStatus = 'unhealthy';
      }

      try {
        await redis.ping();
      } catch {
        redisStatus = 'unhealthy';
      }

      const isHealthy = dbStatus === 'healthy' && redisStatus === 'healthy';
      const statusCode = isHealthy ? 200 : 503;

      return reply.status(statusCode).send({
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          redis: redisStatus,
        },
        version: '0.1.0',
      });
    },
  });
}

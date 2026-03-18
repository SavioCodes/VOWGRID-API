import { FastifyInstance } from 'fastify';
import { UnauthorizedError } from '../../common/errors.js';
import { env } from '../../config/env.js';
import { metricsRegistry } from '../../lib/metrics.js';

function assertMetricsAccess(authorization?: string) {
  if (!env.METRICS_AUTH_TOKEN) {
    return;
  }

  const expected = `Bearer ${env.METRICS_AUTH_TOKEN}`;

  if (authorization !== expected) {
    throw new UnauthorizedError('Invalid metrics token.');
  }
}

export async function observabilityRoutes(app: FastifyInstance): Promise<void> {
  app.get('/metrics', {
    schema: {
      tags: ['Observability'],
      summary: 'Prometheus metrics endpoint',
      description:
        'Exports API process and request metrics for Prometheus-compatible scrapers. Protect with METRICS_AUTH_TOKEN outside local development.',
      security: [],
    },
    handler: async (request, reply) => {
      assertMetricsAccess(request.headers.authorization);
      reply.header('Content-Type', metricsRegistry.contentType);
      return reply.send(await metricsRegistry.metrics());
    },
  });
}

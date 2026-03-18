// ──────────────────────────────────────────
// VowGrid — Connector Routes
// ──────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { success } from '../../common/response.js';
import { ValidationError } from '../../common/errors.js';
import { toPrismaNullableJsonValue } from '../../common/json.js';
import { connectorRegistry } from './framework/connector.registry.js';
import { assertCanCreateConnector } from '../billing/entitlements.js';
import { z } from 'zod';

const createConnectorSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.string().min(1).max(50),
  description: z.string().max(2000).optional(),
  config: z.record(z.unknown()).optional(),
  rollbackSupport: z.enum(['supported', 'partial', 'unsupported']).default('unsupported'),
  enabled: z.boolean().default(true),
});

export async function connectorRoutes(app: FastifyInstance): Promise<void> {
  app.post('/connectors', {
    schema: {
      tags: ['Connectors'],
      summary: 'Register a connector',
      description: 'Register a new connector for the workspace',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const parsed = createConnectorSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid connector data', parsed.error.flatten());
      }

      const connectorRuntime = connectorRegistry.get(parsed.data.type);

      if (!connectorRuntime) {
        throw new ValidationError(
          `Connector type "${parsed.data.type}" is not available in the current runtime.`,
        );
      }

      if (connectorRuntime.validateConfig) {
        const configValidation = await connectorRuntime.validateConfig(parsed.data.config ?? {});

        if (!configValidation.valid) {
          throw new ValidationError(
            `Connector config for "${parsed.data.type}" is invalid.`,
            configValidation.errors,
          );
        }
      }

      await assertCanCreateConnector(request.auth.workspaceId, parsed.data.enabled);

      const connector = await prisma.connector.create({
        data: {
          ...parsed.data,
          rollbackSupport: connectorRuntime.rollbackSupport,
          config: toPrismaNullableJsonValue(parsed.data.config),
          workspaceId: request.auth.workspaceId,
        },
      });

      return reply.status(201).send(success(connector));
    },
  });

  app.get('/connectors', {
    schema: {
      tags: ['Connectors'],
      summary: 'List connectors',
      description: 'List all connectors for the workspace, plus registered connector types',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const connectors = await prisma.connector.findMany({
        where: { workspaceId: request.auth.workspaceId },
        orderBy: { createdAt: 'desc' },
      });

      const registeredTypes = connectorRegistry.list();

      return reply.send(success({ connectors, registeredTypes }));
    },
  });
}

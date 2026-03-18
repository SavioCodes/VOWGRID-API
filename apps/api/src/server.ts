// --------------------------------------------------------------------------
// VowGrid - Fastify Server Bootstrap
// --------------------------------------------------------------------------

import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { pathToFileURL } from 'node:url';
import { AppError } from './common/errors.js';
import { error as errorResponse } from './common/response.js';
import { env } from './config/env.js';
import { startExecutionWorker } from './jobs/execution.worker.js';
import { startRollbackWorker } from './jobs/rollback.worker.js';
import { initializeErrorReporting, reportOperationalError } from './lib/error-reporting.js';
import { logger } from './lib/logger.js';
import { observeHttpRequest } from './lib/metrics.js';
import { prisma, disconnectPrisma } from './lib/prisma.js';
import { disconnectRedis } from './lib/redis.js';
import { auditRoutes } from './modules/audits/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { approvalRoutes } from './modules/approvals/routes.js';
import { billingRoutes } from './modules/billing/routes.js';
import { connectorRoutes } from './modules/connectors/routes.js';
import { connectorRegistry } from './modules/connectors/framework/connector.registry.js';
import { GitHubConnector } from './modules/connectors/framework/github.connector.js';
import { HttpConnector } from './modules/connectors/framework/http.connector.js';
import { MockConnector } from './modules/connectors/framework/mock.connector.js';
import { executionRoutes } from './modules/executions/routes.js';
import { healthRoutes } from './modules/health/routes.js';
import { intentRoutes } from './modules/intents/routes.js';
import { observabilityRoutes } from './modules/observability/routes.js';
import { policyRoutes } from './modules/policies/routes.js';
import { receiptRoutes } from './modules/receipts/routes.js';
import { simulationRoutes } from './modules/simulations/routes.js';
import { workspaceAdminRoutes } from './modules/workspace-admin/routes.js';
import authPlugin from './plugins/auth.plugin.js';

export async function buildServer() {
  initializeErrorReporting();

  if (!connectorRegistry.has('mock')) {
    connectorRegistry.register('mock', new MockConnector());
  }

  if (!connectorRegistry.has('http')) {
    connectorRegistry.register('http', new HttpConnector());
  }

  if (!connectorRegistry.has('github')) {
    connectorRegistry.register('github', new GitHubConnector());
  }

  const app = Fastify({
    logger: false,
    genReqId: () => crypto.randomUUID(),
    ajv: {
      customOptions: {
        removeAdditional: 'all',
        coerceTypes: true,
        useDefaults: true,
      },
    },
  });

  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? false : true,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'VowGrid API',
        description: 'The trust layer between AI agents and real-world actions',
        version: '0.1.0',
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Local development',
        },
      ],
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'X-Api-Key',
            in: 'header',
          },
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'OpaqueSessionToken',
          },
        },
      },
      security: [{ apiKey: [] }, { bearerAuth: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/v1/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  await app.register(authPlugin);

  app.addHook('onRequest', async (request) => {
    request.log = logger.child({ requestId: request.id });
  });

  app.addHook('onResponse', async (request, reply) => {
    observeHttpRequest({
      method: request.method,
      route: request.routeOptions.url || request.url,
      statusCode: reply.statusCode,
      durationMs: reply.elapsedTime,
    });

    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      'request completed',
    );
  });

  app.setErrorHandler(async (err: FastifyError, request, reply) => {
    if (err instanceof AppError) {
      logger.warn(
        { requestId: request.id, code: err.code, message: err.message },
        'application error',
      );
      return reply.status(err.statusCode).send(errorResponse(err.code, err.message, err.details));
    }

    if (err.validation) {
      return reply
        .status(400)
        .send(errorResponse('VALIDATION_ERROR', 'Invalid request', err.validation));
    }

    if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500) {
      return reply
        .status(err.statusCode)
        .send(errorResponse(err.code ?? 'REQUEST_ERROR', err.message));
    }

    if (err.statusCode === 429) {
      return reply
        .status(429)
        .send(errorResponse('RATE_LIMITED', 'Too many requests. Please slow down.'));
    }

    logger.error({ requestId: request.id, err }, 'unhandled error');
    void reportOperationalError({
      source: 'api.request',
      message: err.message,
      error: err,
      context: {
        requestId: request.id,
        method: request.method,
        url: request.url,
      },
    });
    return reply.status(500).send(errorResponse('INTERNAL_ERROR', 'An internal error occurred'));
  });

  await app.register(healthRoutes, { prefix: '/v1' });
  await app.register(observabilityRoutes, { prefix: '/v1' });
  await app.register(authRoutes, { prefix: '/v1' });
  await app.register(intentRoutes, { prefix: '/v1' });
  await app.register(simulationRoutes, { prefix: '/v1' });
  await app.register(policyRoutes, { prefix: '/v1' });
  await app.register(approvalRoutes, { prefix: '/v1' });
  await app.register(executionRoutes, { prefix: '/v1' });
  await app.register(connectorRoutes, { prefix: '/v1' });
  await app.register(receiptRoutes, { prefix: '/v1' });
  await app.register(auditRoutes, { prefix: '/v1' });
  await app.register(billingRoutes, { prefix: '/v1' });
  await app.register(workspaceAdminRoutes, { prefix: '/v1' });

  return app;
}

export async function startServer() {
  try {
    const app = await buildServer();

    await prisma.$connect();
    logger.info('Database connected');

    startExecutionWorker();
    startRollbackWorker();

    await app.listen({ port: env.PORT, host: env.HOST });
    logger.info(`VowGrid API running at http://${env.HOST}:${env.PORT}`);
    logger.info(`Swagger UI at http://${env.HOST}:${env.PORT}/v1/docs`);

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      await app.close();
      await disconnectPrisma();
      await disconnectRedis();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    logger.fatal(err, 'Failed to start server');
    process.exit(1);
  }
}

const entrypoint = process.argv[1];
const isDirectRun = entrypoint ? import.meta.url === pathToFileURL(entrypoint).href : false;

if (isDirectRun) {
  startServer();
}

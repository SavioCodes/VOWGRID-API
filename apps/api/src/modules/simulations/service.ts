// ──────────────────────────────────────────
// VowGrid — Simulation Service
// ──────────────────────────────────────────

import { prisma } from '../../lib/prisma.js';
import { toPrismaJsonValue, toPrismaNullableJsonValue } from '../../common/json.js';
import { NotFoundError, ValidationError } from '../../common/errors.js';
import { transitionIntent } from '../intents/service.js';
import { connectorRegistry } from '../connectors/framework/connector.registry.js';
import { buildConnectorRuntimeContext } from '../connectors/framework/runtime-context.js';
import { emitAuditEvent } from '../audits/service.js';

export async function simulateIntent(
  intentId: string,
  workspaceId: string,
  actorId: string,
  actorType: 'user' | 'agent' = 'agent',
) {
  const intent = await prisma.intent.findFirst({
    where: { id: intentId, workspaceId },
    include: { connector: true },
  });

  if (!intent) {
    throw new NotFoundError('Intent', intentId);
  }

  // Must be in proposed state to simulate
  if (intent.status !== 'proposed') {
    throw new ValidationError(
      `Intent must be in "proposed" state to simulate. Current state: "${intent.status}"`,
    );
  }

  // Get connector
  const connectorType = intent.connector?.type ?? 'mock';
  const connector = connectorRegistry.get(connectorType);

  if (!connector) {
    throw new ValidationError(`Connector type "${connectorType}" is not registered`);
  }

  const context = buildConnectorRuntimeContext({
    workspaceId,
    environment: intent.environment,
    connector: intent.connector
      ? {
          id: intent.connector.id,
          name: intent.connector.name,
          type: intent.connector.type,
          config: intent.connector.config,
        }
      : null,
  });

  // Validate first
  const validation = await connector.validate(
    intent.action,
    (intent.parameters as Record<string, unknown>) ?? {},
    context,
  );

  if (!validation.valid) {
    throw new ValidationError('Connector validation failed', validation.errors);
  }

  // Simulate
  const simResult = await connector.simulate(
    intent.action,
    (intent.parameters as Record<string, unknown>) ?? {},
    context,
  );

  // Persist simulation result
  const simulationResult = await prisma.simulationResult.create({
    data: {
      intentId,
      summary: simResult.summary,
      estimatedImpact: simResult.estimatedImpact,
      riskLevel: simResult.riskLevel,
      reversibility: simResult.reversibility,
      affectedResources: toPrismaJsonValue(simResult.affectedResources),
      diffPreview: toPrismaNullableJsonValue(simResult.diffPreview),
      warnings: simResult.warnings ?? [],
    },
  });

  // Transition intent to simulated
  await transitionIntent(intentId, workspaceId, 'simulated', actorId, actorType);

  await emitAuditEvent({
    action: 'intent.simulated',
    entityType: 'intent',
    entityId: intentId,
    actorType,
    actorId,
    workspaceId,
    metadata: {
      riskLevel: simResult.riskLevel,
      reversibility: simResult.reversibility,
      estimatedImpact: simResult.estimatedImpact,
    },
  });

  return simulationResult;
}

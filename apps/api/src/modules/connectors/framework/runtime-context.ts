import type { ConnectorRuntimeContext } from './connector.interface.js';

export function buildConnectorRuntimeContext(input: {
  workspaceId: string;
  environment: string;
  connector?: {
    id: string;
    name: string;
    type: string;
    config: unknown;
  } | null;
}): ConnectorRuntimeContext {
  const rawConfig = input.connector?.config;
  const config =
    rawConfig && typeof rawConfig === 'object' && !Array.isArray(rawConfig)
      ? (rawConfig as Record<string, unknown>)
      : {};

  return {
    connectorId: input.connector?.id ?? null,
    connectorName: input.connector?.name ?? input.connector?.type ?? 'Mock connector',
    connectorType: input.connector?.type ?? 'mock',
    workspaceId: input.workspaceId,
    environment: input.environment,
    config,
  };
}

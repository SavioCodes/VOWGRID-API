// ──────────────────────────────────────────
// VowGrid — Connector Interface
// The contract all connectors must implement
// ──────────────────────────────────────────

export interface ConnectorValidateResult {
  valid: boolean;
  errors?: string[];
}

export interface ConnectorSimulateResult {
  summary: string;
  estimatedImpact: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reversibility: 'full' | 'partial' | 'none';
  affectedResources: Array<{ type: string; id: string; name: string }>;
  diffPreview?: Record<string, unknown>;
  warnings?: string[];
}

export interface ConnectorExecuteResult {
  success: boolean;
  data: Record<string, unknown>;
  duration: number; // ms
}

export interface ConnectorRollbackResult {
  success: boolean;
  data: Record<string, unknown>;
}

export type RollbackSupport = 'supported' | 'partial' | 'unsupported';

export interface ConnectorRuntimeContext {
  connectorId: string | null;
  connectorName: string;
  connectorType: string;
  workspaceId: string;
  environment: string;
  config: Record<string, unknown>;
}

export interface IConnector {
  readonly type: string;
  readonly rollbackSupport: RollbackSupport;

  validateConfig?(config: Record<string, unknown>): Promise<ConnectorValidateResult>;
  validate(
    action: string,
    parameters: Record<string, unknown>,
    context: ConnectorRuntimeContext,
  ): Promise<ConnectorValidateResult>;
  simulate(
    action: string,
    parameters: Record<string, unknown>,
    context: ConnectorRuntimeContext,
  ): Promise<ConnectorSimulateResult>;
  execute(
    action: string,
    parameters: Record<string, unknown>,
    context: ConnectorRuntimeContext,
  ): Promise<ConnectorExecuteResult>;
  rollback?(
    action: string,
    parameters: Record<string, unknown>,
    executionData: Record<string, unknown>,
    context: ConnectorRuntimeContext,
  ): Promise<ConnectorRollbackResult>;
}

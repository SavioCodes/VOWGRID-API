// ──────────────────────────────────────────
// VowGrid — Mock Connector
// Full implementation for testing and demos
// ──────────────────────────────────────────

import type {
  IConnector,
  ConnectorValidateResult,
  ConnectorSimulateResult,
  ConnectorExecuteResult,
  ConnectorRollbackResult,
  RollbackSupport,
} from './connector.interface.js';

export class MockConnector implements IConnector {
  readonly type = 'mock';
  readonly rollbackSupport: RollbackSupport = 'supported';

  async validate(
    action: string,
    _parameters: Record<string, unknown>,
  ): Promise<ConnectorValidateResult> {
    const errors: string[] = [];

    if (!action) {
      errors.push('Action is required');
    }

    if (action === 'fail_validation') {
      errors.push('Intentional validation failure for testing');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async simulate(
    action: string,
    _parameters: Record<string, unknown>,
  ): Promise<ConnectorSimulateResult> {
    // Simulate realistic delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      summary: `Mock simulation of "${action}" completed successfully`,
      estimatedImpact: 'low',
      riskLevel: 'low',
      reversibility: 'full',
      affectedResources: [{ type: 'mock_resource', id: 'mock-001', name: 'Mock Resource' }],
      diffPreview: {
        before: { status: 'current' },
        after: { status: 'updated', action },
      },
      warnings: action === 'risky_action' ? ['This is a simulated risky action'] : undefined,
    };
  }

  async execute(
    action: string,
    parameters: Record<string, unknown>,
  ): Promise<ConnectorExecuteResult> {
    const start = Date.now();

    // Simulate execution time
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (action === 'fail_execution') {
      throw new Error('Intentional execution failure for testing');
    }

    return {
      success: true,
      data: {
        action,
        parameters,
        executedAt: new Date().toISOString(),
        mockResult: 'Operation completed successfully',
      },
      duration: Date.now() - start,
    };
  }

  async rollback(
    action: string,
    _parameters: Record<string, unknown>,
    executionData: Record<string, unknown>,
  ): Promise<ConnectorRollbackResult> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      data: {
        action: `rollback_${action}`,
        rolledBackAt: new Date().toISOString(),
        originalExecution: executionData,
      },
    };
  }
}

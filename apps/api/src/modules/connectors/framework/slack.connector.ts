// ──────────────────────────────────────────
// VowGrid — Slack Connector (Skeleton)
// Structurally complete, not functionally wired
// ──────────────────────────────────────────

import type {
  IConnector,
  ConnectorValidateResult,
  ConnectorSimulateResult,
  ConnectorExecuteResult,
  ConnectorRollbackResult,
  RollbackSupport,
} from './connector.interface.js';

/**
 * Slack connector skeleton.
 * Demonstrates realistic connector structure without actual Slack API calls.
 *
 * Supported actions:
 * - send_message: Send a message to a channel
 * - update_message: Update an existing message
 * - delete_message: Delete a message (rollback = partial)
 */
export class SlackConnector implements IConnector {
  readonly type = 'slack';
  readonly rollbackSupport: RollbackSupport = 'partial';

  async validate(action: string, parameters: Record<string, unknown>): Promise<ConnectorValidateResult> {
    const errors: string[] = [];
    const validActions = ['send_message', 'update_message', 'delete_message'];

    if (!validActions.includes(action)) {
      errors.push(`Invalid action "${action}". Valid actions: ${validActions.join(', ')}`);
    }

    if (action === 'send_message' || action === 'update_message') {
      if (!parameters.channel) errors.push('channel is required');
      if (!parameters.text) errors.push('text is required');
    }

    if (action === 'update_message' || action === 'delete_message') {
      if (!parameters.messageTs) errors.push('messageTs is required');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async simulate(action: string, parameters: Record<string, unknown>): Promise<ConnectorSimulateResult> {
    const reversibility = action === 'delete_message' ? 'none' as const : 'partial' as const;

    return {
      summary: `Slack ${action}: will target channel ${parameters.channel ?? 'unknown'}`,
      estimatedImpact: action === 'delete_message' ? 'medium' : 'low',
      riskLevel: action === 'delete_message' ? 'medium' : 'low',
      reversibility,
      affectedResources: [
        {
          type: 'slack_channel',
          id: String(parameters.channel ?? 'unknown'),
          name: `Channel ${parameters.channel}`,
        },
      ],
      warnings: action === 'delete_message' ? ['Message deletion cannot be undone'] : undefined,
    };
  }

  async execute(_action: string, _parameters: Record<string, unknown>): Promise<ConnectorExecuteResult> {
    // In a real implementation, this would call the Slack API
    throw new Error('Slack connector is a skeleton — not wired to the Slack API');
  }

  async rollback(
    _action: string,
    _parameters: Record<string, unknown>,
    _executionData: Record<string, unknown>,
  ): Promise<ConnectorRollbackResult> {
    throw new Error('Slack connector rollback is a skeleton — not implemented');
  }
}

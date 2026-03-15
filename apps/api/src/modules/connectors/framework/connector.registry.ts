// ──────────────────────────────────────────
// VowGrid — Connector Registry
// Runtime connector instance management
// ──────────────────────────────────────────

import type { IConnector } from './connector.interface.js';

class ConnectorRegistry {
  private connectors = new Map<string, IConnector>();

  register(type: string, connector: IConnector): void {
    this.connectors.set(type, connector);
  }

  get(type: string): IConnector | undefined {
    return this.connectors.get(type);
  }

  has(type: string): boolean {
    return this.connectors.has(type);
  }

  list(): Array<{ type: string; rollbackSupport: string }> {
    return Array.from(this.connectors.entries()).map(([type, connector]) => ({
      type,
      rollbackSupport: connector.rollbackSupport,
    }));
  }
}

// Singleton registry
export const connectorRegistry = new ConnectorRegistry();

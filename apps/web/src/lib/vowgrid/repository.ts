import { cache } from 'react';
import type {
  AuditEventResponse,
  HealthResponse,
  IntentDetailResponse,
  IntentResponse,
  ListConnectorsResponse,
  PolicyEvaluationResponse,
  PolicyResponse,
  ReceiptDetailResponse,
} from '@vowgrid/contracts';
import {
  provisionalReceipts,
  provisionalWorkspaceData,
  type DirectoryEntry,
} from './provisional-data';

export type IntegrationMode = 'live' | 'provisional';

export interface IntegrationState {
  mode: IntegrationMode;
  label: string;
  description: string;
  notes: string[];
  apiBaseUrl?: string;
}

export interface WorkspaceSnapshot {
  integration: IntegrationState;
  workspaceId: string;
  workspaceName: string;
  directory: DirectoryEntry[];
  health: HealthResponse | null;
  intents: IntentResponse[];
  connectors: ListConnectorsResponse;
  policies: PolicyResponse[];
  auditEvents: AuditEventResponse[];
}

interface DataSource {
  integration: IntegrationState;
  getWorkspaceId(): Promise<string>;
  getWorkspaceName(): Promise<string>;
  getDirectory(): Promise<DirectoryEntry[]>;
  getHealth(): Promise<HealthResponse | null>;
  listIntents(): Promise<IntentResponse[]>;
  getIntent(intentId: string): Promise<IntentDetailResponse | null>;
  getPolicyEvaluations(intentId: string): Promise<PolicyEvaluationResponse[] | null>;
  listPolicies(): Promise<PolicyResponse[]>;
  listConnectors(): Promise<ListConnectorsResponse>;
  listAuditEvents(): Promise<AuditEventResponse[]>;
  getReceipt(receiptId: string): Promise<ReceiptDetailResponse | null>;
}

function getConfig() {
  return {
    apiBaseUrl: process.env.VOWGRID_API_BASE_URL?.replace(/\/$/, ''),
    apiKey: process.env.VOWGRID_API_KEY,
    allowProvisional: process.env.VOWGRID_ENABLE_PROVISIONAL_DATA !== 'false',
  };
}

async function fetchEnvelope<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiBaseUrl, apiKey } = getConfig();

  if (!apiBaseUrl || !apiKey) {
    throw new Error('Missing VOWGRID_API_BASE_URL or VOWGRID_API_KEY.');
  }

  const headers = new Headers(init?.headers);
  headers.set('X-Api-Key', apiKey);

  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const json = (await response.json()) as {
    success?: boolean;
    data?: T;
    error?: { message?: string };
  };

  if (!response.ok || !json.success) {
    throw new Error(json.error?.message ?? `Request to ${path} failed.`);
  }

  return json.data as T;
}

async function fetchHealth() {
  const { apiBaseUrl, apiKey } = getConfig();

  if (!apiBaseUrl || !apiKey) {
    return null;
  }

  const response = await fetch(`${apiBaseUrl}/v1/health`, {
    headers: {
      'X-Api-Key': apiKey,
    },
    cache: 'no-store',
  });

  if (!response.ok && response.status !== 503) {
    throw new Error('Unable to reach the VowGrid health endpoint.');
  }

  return (await response.json()) as HealthResponse;
}

class LiveDataSource implements DataSource {
  integration: IntegrationState;

  constructor(apiBaseUrl: string) {
    this.integration = {
      mode: 'live',
      label: 'Live contract adapter',
      description: 'Rendering from real `/v1` routes using the configured API key.',
      notes: ['Rendering the current backend workflow and contract surfaces directly.'],
      apiBaseUrl,
    };
  }

  async getWorkspaceId() {
    const intents = await this.listIntents();
    return intents[0]?.workspaceId ?? 'connected-workspace';
  }

  async getWorkspaceName() {
    return 'Connected workspace';
  }

  async getDirectory() {
    return [];
  }

  async getHealth() {
    return fetchHealth();
  }

  async listIntents() {
    const data = await fetchEnvelope<IntentResponse[]>('/v1/intents?pageSize=100');
    return data ?? [];
  }

  async getIntent(intentId: string) {
    return fetchEnvelope<IntentDetailResponse>(`/v1/intents/${intentId}`);
  }

  async getPolicyEvaluations(intentId: string) {
    const intent = await this.getIntent(intentId);
    return intent?.policyEvaluations ?? null;
  }

  async listPolicies() {
    return fetchEnvelope<PolicyResponse[]>('/v1/policies');
  }

  async listConnectors() {
    return fetchEnvelope<ListConnectorsResponse>('/v1/connectors');
  }

  async listAuditEvents() {
    const data = await fetchEnvelope<AuditEventResponse[]>('/v1/audit-events?pageSize=100');
    return data ?? [];
  }

  async getReceipt(receiptId: string) {
    return fetchEnvelope<ReceiptDetailResponse>(`/v1/receipts/${receiptId}`);
  }
}

class ProvisionalDataSource implements DataSource {
  integration: IntegrationState;

  constructor(notes: string[]) {
    this.integration = {
      mode: 'provisional',
      label: 'Provisional adapter',
      description: 'Rendering from isolated demo data that mirrors backend contracts.',
      notes,
    };
  }

  async getWorkspaceId() {
    return provisionalWorkspaceData.workspaceId;
  }

  async getWorkspaceName() {
    return provisionalWorkspaceData.workspaceName;
  }

  async getDirectory() {
    return provisionalWorkspaceData.directory;
  }

  async getHealth() {
    return provisionalWorkspaceData.health;
  }

  async listIntents() {
    return provisionalWorkspaceData.intents;
  }

  async getIntent(intentId: string) {
    return provisionalWorkspaceData.intents.find((intent) => intent.id === intentId) ?? null;
  }

  async getPolicyEvaluations(intentId: string) {
    const intent = provisionalWorkspaceData.intents.find((item) => item.id === intentId);
    return intent?.policyEvaluations ?? null;
  }

  async listPolicies() {
    return provisionalWorkspaceData.policies;
  }

  async listConnectors() {
    return provisionalWorkspaceData.connectors;
  }

  async listAuditEvents() {
    return provisionalWorkspaceData.auditEvents;
  }

  async getReceipt(receiptId: string) {
    return provisionalReceipts.find((receipt) => receipt.id === receiptId) ?? null;
  }
}

const getDataSource = cache(async (): Promise<DataSource> => {
  const { apiBaseUrl, apiKey, allowProvisional } = getConfig();

  if (apiBaseUrl && apiKey) {
    try {
      const live = new LiveDataSource(apiBaseUrl);
      await live.getHealth();
      return live;
    } catch (error) {
      if (!allowProvisional) {
        throw error;
      }

      return new ProvisionalDataSource([
        `Live adapter fallback: ${error instanceof Error ? error.message : 'Unknown connection error.'}`,
        ...provisionalWorkspaceData.notes,
      ]);
    }
  }

  return new ProvisionalDataSource([
    'VOWGRID_API_BASE_URL and VOWGRID_API_KEY are not set for the web app.',
    ...provisionalWorkspaceData.notes,
  ]);
});

export const getWorkspaceSnapshot = cache(async (): Promise<WorkspaceSnapshot> => {
  const dataSource = await getDataSource();

  const [workspaceId, workspaceName, directory, health, intents, connectors, policies, auditEvents] =
    await Promise.all([
      dataSource.getWorkspaceId(),
      dataSource.getWorkspaceName(),
      dataSource.getDirectory(),
      dataSource.getHealth(),
      dataSource.listIntents(),
      dataSource.listConnectors(),
      dataSource.listPolicies(),
      dataSource.listAuditEvents(),
    ]);

  return {
    integration: dataSource.integration,
    workspaceId,
    workspaceName,
    directory,
    health,
    intents,
    connectors,
    policies,
    auditEvents,
  };
});

export async function getIntentRecord(intentId: string) {
  const dataSource = await getDataSource();
  return dataSource.getIntent(intentId);
}

export async function getIntentPolicyEvaluations(intentId: string) {
  const dataSource = await getDataSource();
  return dataSource.getPolicyEvaluations(intentId);
}

export async function getReceiptRecord(receiptId: string) {
  const dataSource = await getDataSource();
  return dataSource.getReceipt(receiptId);
}

export async function getApprovalQueue() {
  const snapshot = await getWorkspaceSnapshot();
  const detailItems = await Promise.all(
    snapshot.intents
      .filter((intent) => ['pending_approval', 'approved', 'rejected'].includes(intent.status))
      .slice(0, 12)
      .map((intent) => getIntentRecord(intent.id)),
  );

  return detailItems.filter(Boolean) as IntentDetailResponse[];
}

export async function getExecutionQueue() {
  const snapshot = await getWorkspaceSnapshot();
  const detailItems = await Promise.all(
    snapshot.intents
      .filter((intent) =>
        ['queued', 'executing', 'succeeded', 'failed', 'rollback_pending', 'rollback_failed'].includes(
          intent.status,
        ),
      )
      .slice(0, 12)
      .map((intent) => getIntentRecord(intent.id)),
  );

  return detailItems.filter(Boolean) as IntentDetailResponse[];
}

export async function getPolicyReviewContext(intentId: string) {
  const [snapshot, intent] = await Promise.all([getWorkspaceSnapshot(), getIntentRecord(intentId)]);
  const evaluations = intent?.policyEvaluations ?? (await getIntentPolicyEvaluations(intentId));

  return {
    policies: snapshot.policies,
    intent,
    evaluations,
    note:
      evaluations === null
        ? 'Policy evaluation history is not available for this intent yet, so this view falls back to the active policy catalog and current approval status.'
        : null,
  };
}

export function findDirectoryLabel(directory: DirectoryEntry[], id: string) {
  return directory.find((entry) => entry.id === id)?.label ?? id;
}

export function getReceiptLinkCandidate(intent: IntentDetailResponse) {
  return intent.receipts[0]?.id ?? null;
}

import type {
  AuditEventResponse,
  BillingAccountResponse,
  BillingCheckoutResponse,
  CancelSubscriptionInput,
  CreateWorkspaceApiKeyInput,
  CreateWorkspaceInviteInput,
  CreateWorkspaceMemberInput,
  CreateCheckoutInput,
  CurrentSessionResponse,
  HealthResponse,
  IntentDetailResponse,
  IntentResponse,
  ListConnectorsResponse,
  PolicyResponse,
  RevokeWorkspaceApiKeyResponse,
  ReceiptDetailResponse,
  UpdateWorkspaceMemberInput,
  WorkspaceApiKeyResponse,
  WorkspaceApiKeySecretResponse,
  WorkspaceInviteResponse,
  WorkspaceInviteSecretResponse,
  WorkspaceMemberMutationResponse,
  WorkspaceMemberResponse,
} from '@vowgrid/contracts';
import { fetchApiEnvelope, fetchPublicJson, getApiBaseUrl } from './api';
import { getDashboardSessionToken, requireCurrentSession } from './auth';
import {
  provisionalReceipts,
  provisionalWorkspaceData,
  type DirectoryEntry,
} from './provisional-data';

export type IntegrationMode = 'live' | 'preview';

export interface IntegrationState {
  mode: IntegrationMode;
  label: string;
  description: string;
  notes: string[];
  apiBaseUrl?: string;
}

export interface WorkspaceSnapshot {
  integration: IntegrationState;
  currentUser: CurrentSessionResponse['user'];
  availableWorkspaces: CurrentSessionResponse['availableWorkspaces'];
  workspaceId: string;
  workspaceName: string;
  directory: DirectoryEntry[];
  health: HealthResponse | null;
  billingAccount: BillingAccountResponse | null;
  intents: IntentResponse[];
  connectors: ListConnectorsResponse;
  policies: PolicyResponse[];
  auditEvents: AuditEventResponse[];
}

function getPreviewEnabled() {
  return process.env.VOWGRID_ENABLE_PROVISIONAL_DATA === 'true';
}

function getLiveIntegration(): IntegrationState {
  return {
    mode: 'live',
    label: 'Live session adapter',
    description: 'Rendering authenticated `/v1` data through the dashboard session cookie.',
    notes: [
      'Protected app routes require a valid dashboard session.',
      'Agent and machine traffic still uses API keys directly against the backend.',
    ],
    apiBaseUrl: getApiBaseUrl(),
  };
}

async function getSessionTokenOrThrow() {
  const token = await getDashboardSessionToken();

  if (!token) {
    throw new Error('Missing dashboard session token.');
  }

  return token;
}

async function fetchSessionEnvelope<T>(path: string, init?: RequestInit) {
  const token = await getSessionTokenOrThrow();
  return fetchApiEnvelope<T>(path, {
    ...init,
    auth: { kind: 'session', token },
  });
}

async function fetchHealth() {
  try {
    return await fetchPublicJson<HealthResponse>('/v1/health');
  } catch {
    return null;
  }
}

function buildDirectory(session: CurrentSessionResponse): DirectoryEntry[] {
  return [
    {
      id: session.user.id,
      label: session.user.name,
      role: session.user.role,
    },
    {
      id: 'system',
      label: 'VowGrid system',
      role: 'System',
    },
  ];
}

export async function getWorkspaceSnapshot(
  session?: CurrentSessionResponse,
): Promise<WorkspaceSnapshot> {
  const currentSession = session ?? (await requireCurrentSession());

  const [health, billingAccount, intents, connectors, policies, auditEvents] = await Promise.all([
    fetchHealth(),
    fetchSessionEnvelope<BillingAccountResponse>('/v1/billing/account'),
    fetchSessionEnvelope<IntentResponse[]>('/v1/intents?pageSize=100'),
    fetchSessionEnvelope<ListConnectorsResponse>('/v1/connectors'),
    fetchSessionEnvelope<PolicyResponse[]>('/v1/policies'),
    fetchSessionEnvelope<AuditEventResponse[]>('/v1/audit-events?pageSize=100'),
  ]);

  return {
    integration: getLiveIntegration(),
    currentUser: currentSession.user,
    availableWorkspaces: currentSession.availableWorkspaces,
    workspaceId: currentSession.workspace.id,
    workspaceName: currentSession.workspace.name,
    directory: buildDirectory(currentSession),
    health,
    billingAccount,
    intents: intents ?? [],
    connectors,
    policies,
    auditEvents: auditEvents ?? [],
  };
}

export async function getIntentRecord(intentId: string) {
  await requireCurrentSession();
  return fetchSessionEnvelope<IntentDetailResponse>(`/v1/intents/${intentId}`);
}

export async function getIntentPolicyEvaluations(intentId: string) {
  const intent = await getIntentRecord(intentId);
  return intent.policyEvaluations ?? null;
}

export async function getReceiptRecord(receiptId: string) {
  await requireCurrentSession();
  return fetchSessionEnvelope<ReceiptDetailResponse>(`/v1/receipts/${receiptId}`);
}

export async function getBillingAccountRecord() {
  await requireCurrentSession();
  return fetchSessionEnvelope<BillingAccountResponse>('/v1/billing/account');
}

export async function startWorkspaceCheckout(input: CreateCheckoutInput) {
  await requireCurrentSession();
  return fetchSessionEnvelope<BillingCheckoutResponse>('/v1/billing/checkout', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function cancelWorkspaceSubscription(input: CancelSubscriptionInput) {
  await requireCurrentSession();
  return fetchSessionEnvelope<BillingAccountResponse>('/v1/billing/subscription/cancel', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listWorkspaceApiKeys() {
  await requireCurrentSession();
  return fetchSessionEnvelope<WorkspaceApiKeyResponse[]>('/v1/workspace/api-keys');
}

export async function listWorkspaceMembers() {
  await requireCurrentSession();
  return fetchSessionEnvelope<WorkspaceMemberResponse[]>('/v1/workspace/members');
}

export async function createWorkspaceMember(input: CreateWorkspaceMemberInput) {
  await requireCurrentSession();
  return fetchSessionEnvelope<WorkspaceMemberMutationResponse>('/v1/workspace/members', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateWorkspaceMember(userId: string, input: UpdateWorkspaceMemberInput) {
  await requireCurrentSession();
  return fetchSessionEnvelope<WorkspaceMemberMutationResponse>(`/v1/workspace/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function disableWorkspaceMember(userId: string) {
  await requireCurrentSession();
  return fetchSessionEnvelope<WorkspaceMemberMutationResponse>(
    `/v1/workspace/members/${userId}/disable`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function enableWorkspaceMember(userId: string) {
  await requireCurrentSession();
  return fetchSessionEnvelope<WorkspaceMemberMutationResponse>(
    `/v1/workspace/members/${userId}/enable`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function createWorkspaceApiKey(input: CreateWorkspaceApiKeyInput) {
  await requireCurrentSession();
  return fetchSessionEnvelope<WorkspaceApiKeySecretResponse>('/v1/workspace/api-keys', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listWorkspaceInvites() {
  await requireCurrentSession();
  return fetchSessionEnvelope<WorkspaceInviteResponse[]>('/v1/workspace/invites');
}

export async function createWorkspaceInvite(input: CreateWorkspaceInviteInput) {
  await requireCurrentSession();
  return fetchSessionEnvelope<WorkspaceInviteSecretResponse>('/v1/workspace/invites', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function revokeWorkspaceInvite(inviteId: string) {
  await requireCurrentSession();
  return fetchSessionEnvelope<{ revoked: boolean; invite: WorkspaceInviteResponse }>(
    `/v1/workspace/invites/${inviteId}/revoke`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function rotateWorkspaceApiKey(apiKeyId: string) {
  await requireCurrentSession();
  return fetchSessionEnvelope<WorkspaceApiKeySecretResponse>(
    `/v1/workspace/api-keys/${apiKeyId}/rotate`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}

export async function revokeWorkspaceApiKey(apiKeyId: string) {
  await requireCurrentSession();
  return fetchSessionEnvelope<RevokeWorkspaceApiKeyResponse>(
    `/v1/workspace/api-keys/${apiKeyId}/revoke`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
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
        [
          'queued',
          'executing',
          'succeeded',
          'failed',
          'rollback_pending',
          'rollback_failed',
        ].includes(intent.status),
      )
      .slice(0, 12)
      .map((intent) => getIntentRecord(intent.id)),
  );

  return detailItems.filter(Boolean) as IntentDetailResponse[];
}

export async function getPolicyReviewContext(intentId: string) {
  const [snapshot, intent] = await Promise.all([getWorkspaceSnapshot(), getIntentRecord(intentId)]);
  const evaluations = intent.policyEvaluations ?? (await getIntentPolicyEvaluations(intentId));

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

export async function getPreviewSnapshot() {
  if (!getPreviewEnabled()) {
    throw new Error(
      'Preview mode is disabled. Set VOWGRID_ENABLE_PROVISIONAL_DATA=true to use /preview.',
    );
  }

  return {
    integration: {
      mode: 'preview' as const,
      label: 'Explicit preview adapter',
      description: 'Rendering isolated preview data outside the authenticated product flow.',
      notes: ['This path is for local UI exploration only.', ...provisionalWorkspaceData.notes],
    },
    currentUser: {
      id: 'preview-user',
      email: 'preview@vowgrid.local',
      name: 'Preview Operator',
      role: 'preview',
      workspaceId: provisionalWorkspaceData.workspaceId,
      emailVerifiedAt: '2026-03-15T00:00:00.000Z',
      createdAt: '2026-03-15T00:00:00.000Z',
      updatedAt: '2026-03-15T00:00:00.000Z',
    },
    availableWorkspaces: [
      {
        workspaceId: provisionalWorkspaceData.workspaceId,
        name: provisionalWorkspaceData.workspaceName,
        slug: 'preview-workspace',
        role: 'preview',
        status: 'active',
        isDefault: true,
        disabledAt: null,
      },
    ],
    workspaceId: provisionalWorkspaceData.workspaceId,
    workspaceName: provisionalWorkspaceData.workspaceName,
    directory: provisionalWorkspaceData.directory,
    health: provisionalWorkspaceData.health,
    billingAccount: provisionalWorkspaceData.billingAccount,
    intents: provisionalWorkspaceData.intents,
    connectors: provisionalWorkspaceData.connectors,
    policies: provisionalWorkspaceData.policies,
    auditEvents: provisionalWorkspaceData.auditEvents,
  } satisfies WorkspaceSnapshot;
}

export async function getPreviewReceiptRecord(receiptId: string) {
  if (!getPreviewEnabled()) {
    throw new Error('Preview mode is disabled.');
  }

  return provisionalReceipts.find((receipt) => receipt.id === receiptId) ?? null;
}

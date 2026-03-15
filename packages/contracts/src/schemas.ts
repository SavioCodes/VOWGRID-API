import { z } from 'zod';
import { INTENT_STATES } from './intent-states.js';

export const ENVIRONMENTS = ['production', 'staging', 'sandbox'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];
export type PolicyType =
  | 'amount_threshold'
  | 'action_restriction'
  | 'connector_restriction'
  | 'environment_restriction'
  | 'role_constraint';
export type PolicyResult = 'allow' | 'deny' | 'require_approval';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type Reversibility = 'full' | 'partial' | 'none';
export type RollbackSupport = 'supported' | 'partial' | 'unsupported';
export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired';
export type ApprovalDecisionStatus = 'approved' | 'rejected';
export type ExecutionJobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type RollbackAttemptStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { requestId?: string; timestamp: string; pagination?: PaginationMeta };
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type PaginatedResponse<T> = ApiResponse<T[]>;

export const createIntentSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  action: z.string().min(1).max(100),
  connectorId: z.string().cuid().optional(),
  agentId: z.string().cuid(),
  parameters: z.record(z.unknown()).optional(),
  environment: z.enum(ENVIRONMENTS).default('production'),
  idempotencyKey: z.string().max(255).optional(),
});

export type CreateIntentInput = z.infer<typeof createIntentSchema>;

export const listIntentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(INTENT_STATES).optional(),
  agentId: z.string().cuid().optional(),
  connectorId: z.string().cuid().optional(),
});

export type ListIntentsInput = z.infer<typeof listIntentsSchema>;

export const createPolicySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  type: z.enum([
    'amount_threshold',
    'action_restriction',
    'connector_restriction',
    'environment_restriction',
    'role_constraint',
  ]),
  rules: z.record(z.unknown()),
  priority: z.number().int().min(0).max(1000).default(0),
  enabled: z.boolean().default(true),
});

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;

export const submitForApprovalSchema = z.object({
  requiredCount: z.number().int().min(1).max(10).default(1),
});

export type SubmitForApprovalInput = z.infer<typeof submitForApprovalSchema>;

export const approvalDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  rationale: z.string().max(2000).optional(),
  userId: z.string().cuid(),
});

export type ApprovalDecisionInput = z.infer<typeof approvalDecisionSchema>;

export const rollbackSchema = z.object({
  reason: z.string().max(2000).optional(),
});

export type RollbackInput = z.infer<typeof rollbackSchema>;

export interface AgentResponse {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  workspaceId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface AffectedResourceResponse {
  type: string;
  id: string;
  name: string;
}

export interface ConnectorResponse {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  rollbackSupport: RollbackSupport;
  workspaceId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntentResponse {
  id: string;
  title: string;
  description?: string | null;
  action: string;
  connectorId?: string | null;
  agentId: string;
  workspaceId: string;
  status: (typeof INTENT_STATES)[number];
  parameters?: Record<string, unknown> | null;
  environment: Environment;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
  agent?: AgentResponse | null;
  connector?: ConnectorResponse | null;
}

export interface SimulationResultResponse {
  id: string;
  intentId: string;
  summary: string;
  estimatedImpact: RiskLevel;
  riskLevel: RiskLevel;
  reversibility: Reversibility;
  affectedResources: AffectedResourceResponse[];
  diffPreview?: Record<string, unknown> | null;
  warnings: string[];
  createdAt: string;
}

export interface PolicyResponse {
  id: string;
  name: string;
  description?: string | null;
  type: PolicyType;
  rules: Record<string, unknown>;
  priority: number;
  enabled: boolean;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequestResponse {
  id: string;
  intentId: string;
  status: ApprovalRequestStatus;
  requiredCount: number;
  currentCount: number;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalDecisionResponse {
  id: string;
  approvalRequestId: string;
  userId: string;
  decision: ApprovalDecisionStatus;
  rationale?: string | null;
  createdAt: string;
}

export interface PolicyEvaluationResponse {
  policyId: string;
  policyName: string;
  result: PolicyResult;
  reason: string;
}

export type SubmitForApprovalResponse =
  | {
      approvalRequest: ApprovalRequestResponse;
      policyResult: PolicyResult;
      decisions: PolicyEvaluationResponse[];
    }
  | {
      approved: false;
      policyResult: PolicyResult;
      decisions: PolicyEvaluationResponse[];
    };

export interface ApprovalDecisionResultResponse {
  approvalRequest: ApprovalRequestResponse;
  decision: ApprovalDecisionResponse;
}

export interface ExecutionJobResponse {
  id: string;
  intentId: string;
  status: ExecutionJobStatus;
  attempts: number;
  maxAttempts: number;
  idempotencyKey?: string | null;
  result?: Record<string, unknown> | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RollbackAttemptResponse {
  id: string;
  intentId: string;
  status: RollbackAttemptStatus;
  reason?: string | null;
  result?: Record<string, unknown> | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

export interface ReceiptResponse {
  id: string;
  intentId: string;
  type: string;
  summary: string;
  data: Record<string, unknown>;
  duration?: number | null;
  createdAt: string;
}

export interface ReceiptDetailResponse extends ReceiptResponse {
  intent: Pick<IntentResponse, 'id' | 'workspaceId' | 'title' | 'action'>;
}

export interface AuditEventResponse {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string;
  workspaceId: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface RegisteredConnectorTypeResponse {
  type: string;
  rollbackSupport: RollbackSupport;
}

export interface ListConnectorsResponse {
  connectors: ConnectorResponse[];
  registeredTypes: RegisteredConnectorTypeResponse[];
}

export interface IntentDetailResponse extends IntentResponse {
  simulationResult?: SimulationResultResponse | null;
  policyEvaluations?: PolicyEvaluationResponse[];
  approvalRequest?: (ApprovalRequestResponse & { decisions: ApprovalDecisionResponse[] }) | null;
  executionJob?: ExecutionJobResponse | null;
  receipts: ReceiptResponse[];
  rollbackAttempts: RollbackAttemptResponse[];
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  services: { database: 'healthy' | 'unhealthy'; redis: 'healthy' | 'unhealthy' };
  version: string;
}

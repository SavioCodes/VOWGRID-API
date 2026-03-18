import { z } from 'zod';
import { authEmailSchema, authPasswordSchema } from './auth.js';

export const WORKSPACE_MEMBER_ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export const MANAGEABLE_WORKSPACE_MEMBER_ROLES = ['admin', 'member', 'viewer'] as const;
export const WORKSPACE_MEMBER_STATUSES = ['active', 'disabled'] as const;
export const WORKSPACE_API_KEY_STATUSES = ['active', 'revoked', 'expired'] as const;
export const WORKSPACE_INVITE_STATUSES = ['pending', 'accepted', 'revoked', 'expired'] as const;

export type WorkspaceMemberRole = (typeof WORKSPACE_MEMBER_ROLES)[number];
export type ManageableWorkspaceMemberRole = (typeof MANAGEABLE_WORKSPACE_MEMBER_ROLES)[number];
export type WorkspaceMemberStatus = (typeof WORKSPACE_MEMBER_STATUSES)[number];
export type WorkspaceApiKeyStatus = (typeof WORKSPACE_API_KEY_STATUSES)[number];
export type WorkspaceInviteStatus = (typeof WORKSPACE_INVITE_STATUSES)[number];

export const workspaceMemberNameSchema = z.string().trim().min(1).max(120);
export const workspaceMemberRoleSchema = z.enum(MANAGEABLE_WORKSPACE_MEMBER_ROLES);
export const createWorkspaceMemberSchema = z.object({
  name: workspaceMemberNameSchema,
  email: authEmailSchema,
  role: workspaceMemberRoleSchema,
  password: authPasswordSchema,
});
export const updateWorkspaceMemberSchema = z
  .object({
    name: workspaceMemberNameSchema.optional(),
    role: workspaceMemberRoleSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.role !== undefined, {
    message: 'Provide at least one member field to update.',
  });

export type CreateWorkspaceMemberInput = z.infer<typeof createWorkspaceMemberSchema>;
export type UpdateWorkspaceMemberInput = z.infer<typeof updateWorkspaceMemberSchema>;

export interface WorkspaceMemberResponse {
  id: string;
  email: string;
  name: string;
  role: WorkspaceMemberRole;
  status: WorkspaceMemberStatus;
  lastLoginAt: string | null;
  disabledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMemberMutationResponse {
  member: WorkspaceMemberResponse;
}

export const createWorkspaceInviteSchema = z.object({
  email: authEmailSchema,
  role: workspaceMemberRoleSchema,
});

export type CreateWorkspaceInviteInput = z.infer<typeof createWorkspaceInviteSchema>;

export interface WorkspaceInviteResponse {
  id: string;
  email: string;
  role: ManageableWorkspaceMemberRole;
  status: WorkspaceInviteStatus;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface WorkspaceInviteSecretResponse {
  inviteToken: string;
  inviteUrl: string | null;
  invite: WorkspaceInviteResponse;
}

export interface RevokeWorkspaceInviteResponse {
  revoked: boolean;
  invite: WorkspaceInviteResponse;
}

export const workspaceApiKeyNameSchema = z.string().trim().min(2).max(80);
export const workspaceApiKeyExpirySchema = z.string().datetime().nullable().optional();

export const createWorkspaceApiKeySchema = z.object({
  name: workspaceApiKeyNameSchema,
  expiresAt: workspaceApiKeyExpirySchema,
});

export const rotateWorkspaceApiKeySchema = z.object({});
export const anonymizeWorkspaceMemberSchema = z.object({});

export type CreateWorkspaceApiKeyInput = z.infer<typeof createWorkspaceApiKeySchema>;
export type RotateWorkspaceApiKeyInput = z.infer<typeof rotateWorkspaceApiKeySchema>;
export type AnonymizeWorkspaceMemberInput = z.infer<typeof anonymizeWorkspaceMemberSchema>;

export interface WorkspaceApiKeyResponse {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: WorkspaceApiKeyStatus;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface WorkspaceApiKeySecretResponse {
  apiKey: string;
  record: WorkspaceApiKeyResponse;
}

export interface RevokeWorkspaceApiKeyResponse {
  revoked: boolean;
  record: WorkspaceApiKeyResponse;
}

export interface AnonymizeWorkspaceMemberResponse {
  anonymized: boolean;
  member: WorkspaceMemberResponse;
}

export interface WorkspaceExportResponse {
  exportedAt: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    updatedAt: string;
  };
  billing: {
    customer: {
      id: string;
      email: string;
      legalName: string | null;
      createdAt: string;
      updatedAt: string;
    } | null;
    subscription: {
      id: string;
      provider: string;
      planKey: string | null;
      billingCycle: string | null;
      status: string;
      currentPeriodStart: string | null;
      currentPeriodEnd: string | null;
      createdAt: string;
      updatedAt: string;
    } | null;
    invoices: Array<{
      id: string;
      status: string;
      subtotalBrlCents: number;
      taxRateBps: number;
      taxAmountBrlCents: number;
      totalBrlCents: number;
      issuedAt: string | null;
      paidAt: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  members: WorkspaceMemberResponse[];
  invites: WorkspaceInviteResponse[];
  apiKeys: WorkspaceApiKeyResponse[];
  agents: Array<{
    id: string;
    name: string;
    description: string | null;
    type: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
  }>;
  connectors: Array<{
    id: string;
    name: string;
    type: string;
    description: string | null;
    enabled: boolean;
    rollbackSupport: string;
    config: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
  }>;
  policies: Array<{
    id: string;
    name: string;
    description: string | null;
    type: string;
    priority: number;
    enabled: boolean;
    rules: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>;
  intents: Array<{
    id: string;
    title: string;
    description: string | null;
    action: string;
    status: string;
    environment: string;
    agentId: string;
    connectorId: string | null;
    parameters: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
  }>;
  receipts: Array<{
    id: string;
    intentId: string;
    type: string;
    summary: string;
    duration: number | null;
    createdAt: string;
  }>;
  auditEvents: Array<{
    id: string;
    action: string;
    actorType: string;
    actorId: string;
    entityType: string;
    entityId: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>;
}

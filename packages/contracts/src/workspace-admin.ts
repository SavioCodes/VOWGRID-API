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

export type CreateWorkspaceApiKeyInput = z.infer<typeof createWorkspaceApiKeySchema>;
export type RotateWorkspaceApiKeyInput = z.infer<typeof rotateWorkspaceApiKeySchema>;

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

import { z } from 'zod';

export const WORKSPACE_API_KEY_STATUSES = ['active', 'revoked', 'expired'] as const;

export type WorkspaceApiKeyStatus = (typeof WORKSPACE_API_KEY_STATUSES)[number];

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

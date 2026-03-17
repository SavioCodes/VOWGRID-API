import { z } from 'zod';

export const authEmailSchema = z.string().trim().email().max(255);
export const authPasswordSchema = z.string().min(8).max(72);

export const loginSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
});

export const signupSchema = z.object({
  email: authEmailSchema,
  password: authPasswordSchema,
  name: z.string().trim().min(1).max(120),
  workspaceName: z.string().trim().min(2).max(120),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

export interface AuthenticatedUserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedWorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSessionResponse {
  token: string;
  expiresAt: string;
}

export interface CurrentSessionSummaryResponse {
  id: string;
  expiresAt: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface AuthSuccessResponse {
  user: AuthenticatedUserResponse;
  workspace: AuthenticatedWorkspaceResponse;
  session: AuthSessionResponse;
}

export interface CurrentSessionResponse {
  user: AuthenticatedUserResponse;
  workspace: AuthenticatedWorkspaceResponse;
  session: CurrentSessionSummaryResponse;
}

export interface LogoutResponse {
  revoked: boolean;
}

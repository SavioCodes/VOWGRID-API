import { z } from 'zod';

export const OAUTH_PROVIDERS = ['github', 'google'] as const;
export const WORKSPACE_MEMBERSHIP_STATUSES = ['active', 'disabled'] as const;

export const authEmailSchema = z.string().trim().email().max(255);
export const authPasswordSchema = z.string().min(8).max(72);
export const authTokenSchema = z.string().trim().min(24).max(255);

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

export const passwordResetRequestSchema = z.object({
  email: authEmailSchema,
});

export const passwordResetConfirmSchema = z.object({
  token: authTokenSchema,
  password: authPasswordSchema,
});

export const emailVerificationConfirmSchema = z.object({
  token: authTokenSchema,
});

export const switchWorkspaceSchema = z.object({
  workspaceId: z.string().trim().min(1).max(64),
});

export const completeOauthSignupSchema = z.object({
  token: authTokenSchema,
  workspaceName: z.string().trim().min(2).max(120),
});

export const oauthCompleteSchema = z.object({
  provider: z.enum(OAUTH_PROVIDERS),
  providerAccountId: z.string().trim().min(1).max(255),
  email: authEmailSchema,
  name: z.string().trim().min(1).max(120),
});

export const acceptWorkspaceInviteSchema = z.object({
  token: authTokenSchema,
  name: z.string().trim().min(1).max(120).optional(),
  password: authPasswordSchema.optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type EmailVerificationConfirmInput = z.infer<typeof emailVerificationConfirmSchema>;
export type SwitchWorkspaceInput = z.infer<typeof switchWorkspaceSchema>;
export type CompleteOauthSignupInput = z.infer<typeof completeOauthSignupSchema>;
export type OAuthCompleteInput = z.infer<typeof oauthCompleteSchema>;
export type AcceptWorkspaceInviteInput = z.infer<typeof acceptWorkspaceInviteSchema>;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export type WorkspaceMembershipStatus = (typeof WORKSPACE_MEMBERSHIP_STATUSES)[number];

export interface AuthenticatedUserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string;
  emailVerifiedAt: string | null;
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

export interface AvailableWorkspaceResponse {
  workspaceId: string;
  name: string;
  slug: string;
  role: string;
  status: WorkspaceMembershipStatus;
  isDefault: boolean;
  disabledAt: string | null;
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
  availableWorkspaces: AvailableWorkspaceResponse[];
  emailVerificationRequired: boolean;
}

export interface CurrentSessionResponse {
  user: AuthenticatedUserResponse;
  workspace: AuthenticatedWorkspaceResponse;
  session: CurrentSessionSummaryResponse;
  availableWorkspaces: AvailableWorkspaceResponse[];
  emailVerificationRequired: boolean;
}

export interface LogoutResponse {
  revoked: boolean;
}

export interface PasswordResetRequestResponse {
  requested: boolean;
}

export interface PasswordResetConfirmResponse {
  reset: boolean;
}

export interface EmailVerificationResponse {
  verified: boolean;
}

export interface RequestEmailVerificationResponse {
  requested: boolean;
}

export interface WorkspaceSwitchResponse {
  session: CurrentSessionResponse;
}

export interface OAuthProviderStartResponse {
  provider: OAuthProvider;
  authorizationUrl: string;
}

export interface OAuthSignupCandidateResponse {
  token: string;
  provider: OAuthProvider;
  email: string;
  name: string;
}

export type OAuthCompletionResponse =
  | {
      kind: 'authenticated';
      auth: AuthSuccessResponse;
    }
  | {
      kind: 'signup_required';
      candidate: OAuthSignupCandidateResponse;
    };

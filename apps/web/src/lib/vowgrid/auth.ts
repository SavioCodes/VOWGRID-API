import type {
  AcceptWorkspaceInviteInput,
  AuthSuccessResponse,
  CompleteOauthSignupInput,
  CurrentSessionResponse,
  EmailVerificationResponse,
  LoginInput,
  LogoutResponse,
  OAuthCompleteInput,
  OAuthCompletionResponse,
  PasswordResetConfirmInput,
  PasswordResetConfirmResponse,
  PasswordResetRequestInput,
  PasswordResetRequestResponse,
  RequestEmailVerificationResponse,
  SignupInput,
  WorkspaceSwitchResponse,
} from '@vowgrid/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ApiRequestError, fetchApiEnvelope } from './api';

export const DASHBOARD_SESSION_COOKIE = 'vowgrid_dashboard_session';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

async function getCookieStore() {
  return cookies();
}

export async function getDashboardSessionToken() {
  const cookieStore = await getCookieStore();
  return cookieStore.get(DASHBOARD_SESSION_COOKIE)?.value ?? null;
}

export async function setDashboardSessionCookie(session: AuthSuccessResponse['session']) {
  const cookieStore = await getCookieStore();
  cookieStore.set(DASHBOARD_SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    expires: new Date(session.expiresAt),
    path: '/',
  });
}

export async function clearDashboardSessionCookie() {
  const cookieStore = await getCookieStore();
  cookieStore.delete(DASHBOARD_SESSION_COOKIE);
}

export async function loginWithPassword(input: LoginInput) {
  return fetchApiEnvelope<AuthSuccessResponse>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: { kind: 'none' },
  });
}

export async function signupWithPassword(input: SignupInput) {
  return fetchApiEnvelope<AuthSuccessResponse>('/v1/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: { kind: 'none' },
  });
}

export async function requestPasswordReset(input: PasswordResetRequestInput) {
  return fetchApiEnvelope<PasswordResetRequestResponse>('/v1/auth/password-reset/request', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: { kind: 'none' },
  });
}

export async function confirmPasswordReset(input: PasswordResetConfirmInput) {
  return fetchApiEnvelope<PasswordResetConfirmResponse>('/v1/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: { kind: 'none' },
  });
}

export async function requestEmailVerification() {
  const token = await getDashboardSessionToken();

  if (!token) {
    throw new Error('Missing dashboard session token.');
  }

  return fetchApiEnvelope<RequestEmailVerificationResponse>('/v1/auth/email-verification/request', {
    method: 'POST',
    auth: { kind: 'session', token },
  });
}

export async function verifyEmailToken(tokenValue: string) {
  return fetchApiEnvelope<EmailVerificationResponse>('/v1/auth/email-verification/verify', {
    method: 'POST',
    body: JSON.stringify({ token: tokenValue }),
    auth: { kind: 'none' },
  });
}

export async function acceptWorkspaceInvite(input: AcceptWorkspaceInviteInput) {
  return fetchApiEnvelope<AuthSuccessResponse>('/v1/auth/invites/accept', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: { kind: 'none' },
  });
}

export async function completeOauthProfile(input: OAuthCompleteInput) {
  return fetchApiEnvelope<OAuthCompletionResponse>('/v1/auth/oauth/complete', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: { kind: 'none' },
  });
}

export async function completeOauthSignup(input: CompleteOauthSignupInput) {
  return fetchApiEnvelope<AuthSuccessResponse>('/v1/auth/oauth/signup/complete', {
    method: 'POST',
    body: JSON.stringify(input),
    auth: { kind: 'none' },
  });
}

export async function switchWorkspace(workspaceId: string) {
  const token = await getDashboardSessionToken();

  if (!token) {
    throw new Error('Missing dashboard session token.');
  }

  return fetchApiEnvelope<WorkspaceSwitchResponse>('/v1/auth/switch-workspace', {
    method: 'POST',
    body: JSON.stringify({ workspaceId }),
    auth: { kind: 'session', token },
  });
}

export async function getCurrentSession(): Promise<CurrentSessionResponse | null> {
  const token = await getDashboardSessionToken();

  if (!token) {
    return null;
  }

  try {
    return await fetchApiEnvelope<CurrentSessionResponse>('/v1/auth/me', {
      auth: { kind: 'session', token },
    });
  } catch (error) {
    if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
      await clearDashboardSessionCookie();
      return null;
    }

    throw error;
  }
}

export async function requireCurrentSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}

export async function requireVerifiedCurrentSession() {
  const session = await requireCurrentSession();

  if (session.emailVerificationRequired) {
    redirect('/verify-email');
  }

  return session;
}

export async function redirectIfAuthenticated(destination = '/app') {
  const session = await getCurrentSession();

  if (session) {
    redirect(destination);
  }
}

export async function logoutCurrentSession() {
  const token = await getDashboardSessionToken();

  if (token) {
    try {
      await fetchApiEnvelope<LogoutResponse>('/v1/auth/logout', {
        method: 'POST',
        auth: { kind: 'session', token },
      });
    } catch {
      // Clearing the local cookie is still the safe fallback.
    }
  }

  await clearDashboardSessionCookie();
}

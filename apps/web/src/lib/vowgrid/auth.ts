import type {
  AuthSuccessResponse,
  CurrentSessionResponse,
  LoginInput,
  LogoutResponse,
  SignupInput,
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

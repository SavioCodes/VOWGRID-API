import { randomBytes } from 'node:crypto';
import type {
  OAuthCompleteInput,
  OAuthProvider,
  OAuthSignupCandidateResponse,
} from '@vowgrid/contracts';
import { OAUTH_PROVIDERS } from '@vowgrid/contracts';
import { cookies } from 'next/headers';

export type OAuthMode = 'login' | 'signup';

type OauthStateCookie = {
  state: string;
  provider: OAuthProvider;
  mode: OAuthMode;
};

export const OAUTH_STATE_COOKIE = 'vowgrid_oauth_state';
export const OAUTH_PENDING_COOKIE = 'vowgrid_oauth_pending';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getProviderEnv(provider: OAuthProvider) {
  if (provider === 'github') {
    return {
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID?.trim() ?? '',
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET?.trim() ?? '',
    };
  }

  return {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? '',
  };
}

export function getConfiguredOAuthProviders(): OAuthProvider[] {
  return OAUTH_PROVIDERS.filter((provider) => {
    const env = getProviderEnv(provider);
    return Boolean(env.clientId && env.clientSecret);
  });
}

export function isOAuthProviderConfigured(provider: OAuthProvider) {
  const env = getProviderEnv(provider);
  return Boolean(env.clientId && env.clientSecret);
}

export function resolveWebBaseUrl(fallbackOrigin?: string) {
  return process.env.VOWGRID_WEB_BASE_URL?.trim() || fallbackOrigin || 'http://localhost:3000';
}

export function buildOAuthCallbackUrl(provider: OAuthProvider, origin?: string) {
  return `${resolveWebBaseUrl(origin).replace(/\/$/, '')}/auth/oauth/callback/${provider}`;
}

function buildGithubAuthorizationUrl({
  state,
  redirectUri,
}: {
  state: string;
  redirectUri: string;
}) {
  const env = getProviderEnv('github');
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', env.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'read:user user:email');
  url.searchParams.set('state', state);
  return url.toString();
}

function buildGoogleAuthorizationUrl({
  state,
  redirectUri,
}: {
  state: string;
  redirectUri: string;
}) {
  const env = getProviderEnv('google');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

export function buildOAuthAuthorizationUrl(input: {
  provider: OAuthProvider;
  state: string;
  origin?: string;
}) {
  const redirectUri = buildOAuthCallbackUrl(input.provider, input.origin);

  return input.provider === 'github'
    ? buildGithubAuthorizationUrl({ state: input.state, redirectUri })
    : buildGoogleAuthorizationUrl({ state: input.state, redirectUri });
}

async function getCookieStore() {
  return cookies();
}

export async function setOauthStateCookie(value: OauthStateCookie) {
  const cookieStore = await getCookieStore();
  cookieStore.set(OAUTH_STATE_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    maxAge: 60 * 10,
    path: '/',
  });
}

export async function getOauthStateCookie(): Promise<OauthStateCookie | null> {
  const cookieStore = await getCookieStore();
  const raw = cookieStore.get(OAUTH_STATE_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as OauthStateCookie;
    if (
      typeof parsed.state === 'string' &&
      OAUTH_PROVIDERS.includes(parsed.provider) &&
      (parsed.mode === 'login' || parsed.mode === 'signup')
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export async function clearOauthStateCookie() {
  const cookieStore = await getCookieStore();
  cookieStore.delete(OAUTH_STATE_COOKIE);
}

export async function setPendingOauthCandidateCookie(value: OAuthSignupCandidateResponse) {
  const cookieStore = await getCookieStore();
  cookieStore.set(OAUTH_PENDING_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    maxAge: 60 * 60,
    path: '/',
  });
}

export async function getPendingOauthCandidateCookie(): Promise<OAuthSignupCandidateResponse | null> {
  const cookieStore = await getCookieStore();
  const raw = cookieStore.get(OAUTH_PENDING_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as OAuthSignupCandidateResponse;
    if (
      typeof parsed.token === 'string' &&
      OAUTH_PROVIDERS.includes(parsed.provider) &&
      typeof parsed.email === 'string' &&
      typeof parsed.name === 'string'
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export async function clearPendingOauthCandidateCookie() {
  const cookieStore = await getCookieStore();
  cookieStore.delete(OAUTH_PENDING_COOKIE);
}

export function createOauthState() {
  return randomBytes(24).toString('hex');
}

async function exchangeGithubCode(code: string, redirectUri: string) {
  const env = getProviderEnv('github');
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  });

  const token = (await response.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!response.ok || !token.access_token) {
    throw new Error(token.error_description ?? 'GitHub OAuth token exchange failed.');
  }

  const headers = {
    Authorization: `Bearer ${token.access_token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'VowGrid',
  };

  const [userResponse, emailResponse] = await Promise.all([
    fetch('https://api.github.com/user', {
      headers,
      cache: 'no-store',
    }),
    fetch('https://api.github.com/user/emails', {
      headers,
      cache: 'no-store',
    }),
  ]);

  const user = (await userResponse.json()) as {
    id?: number | string;
    login?: string;
    name?: string | null;
  };
  const emails = (await emailResponse.json()) as Array<{
    email: string;
    primary?: boolean;
    verified?: boolean;
  }>;

  const selectedEmail =
    emails.find((entry) => entry.primary && entry.verified) ??
    emails.find((entry) => entry.verified) ??
    emails.find((entry) => entry.primary) ??
    emails[0];

  if (!userResponse.ok || !emailResponse.ok || !user.id || !selectedEmail?.email) {
    throw new Error('GitHub OAuth did not return a usable verified email identity.');
  }

  return {
    provider: 'github' as const,
    providerAccountId: String(user.id),
    email: selectedEmail.email.trim().toLowerCase(),
    name: user.name?.trim() || user.login?.trim() || selectedEmail.email.split('@')[0],
  };
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const env = getProviderEnv('google');
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: env.clientId,
      client_secret: env.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
    cache: 'no-store',
  });

  const token = (await tokenResponse.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!tokenResponse.ok || !token.access_token) {
    throw new Error(token.error_description ?? 'Google OAuth token exchange failed.');
  }

  const userResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
    cache: 'no-store',
  });

  const user = (await userResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!userResponse.ok || !user.sub || !user.email || !user.email_verified) {
    throw new Error('Google OAuth did not return a verified email identity.');
  }

  return {
    provider: 'google' as const,
    providerAccountId: user.sub,
    email: user.email.trim().toLowerCase(),
    name: user.name?.trim() || user.email.split('@')[0],
  };
}

export async function exchangeOauthCodeForProfile(input: {
  provider: OAuthProvider;
  code: string;
  origin?: string;
}): Promise<OAuthCompleteInput> {
  const redirectUri = buildOAuthCallbackUrl(input.provider, input.origin);

  return input.provider === 'github'
    ? exchangeGithubCode(input.code, redirectUri)
    : exchangeGoogleCode(input.code, redirectUri);
}

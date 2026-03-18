import type { OAuthProvider } from '@vowgrid/contracts';
import { OAUTH_PROVIDERS } from '@vowgrid/contracts';
import { NextRequest, NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  buildOAuthAuthorizationUrl,
  createOauthState,
  isOAuthProviderConfigured,
} from '@/lib/vowgrid/oauth';

function isProvider(value: string): value is OAuthProvider {
  return OAUTH_PROVIDERS.includes(value as OAuthProvider);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const mode = request.nextUrl.searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const fallbackUrl = new URL(mode === 'signup' ? '/signup' : '/login', request.nextUrl.origin);

  if (!isProvider(provider) || !isOAuthProviderConfigured(provider)) {
    return NextResponse.redirect(fallbackUrl);
  }

  const state = createOauthState();
  const authorizationUrl = await buildOAuthAuthorizationUrl({
    provider,
    state,
    origin: request.nextUrl.origin,
  });

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, provider, mode }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: request.nextUrl.protocol === 'https:',
    maxAge: 60 * 10,
    path: '/',
  });

  return response;
}

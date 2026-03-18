import type { OAuthProvider } from '@vowgrid/contracts';
import { OAUTH_PROVIDERS } from '@vowgrid/contracts';
import { NextRequest, NextResponse } from 'next/server';
import { ApiRequestError } from '@/lib/vowgrid/api';
import {
  clearDashboardSessionCookie,
  completeOauthProfile,
  setDashboardSessionCookie,
} from '@/lib/vowgrid/auth';
import {
  clearOauthStateCookie,
  clearPendingOauthCandidateCookie,
  exchangeOauthCodeForProfile,
  getOauthStateCookie,
  setPendingOauthCandidateCookie,
} from '@/lib/vowgrid/oauth';

function isProvider(value: string): value is OAuthProvider {
  return OAUTH_PROVIDERS.includes(value as OAuthProvider);
}

function buildFallbackUrl(origin: string, mode: 'login' | 'signup') {
  return new URL(mode === 'signup' ? '/signup' : '/login', origin);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  const stateCookie = await getOauthStateCookie();
  const mode = stateCookie?.mode ?? 'login';
  const fallbackUrl = buildFallbackUrl(request.nextUrl.origin, mode);

  if (!isProvider(provider) || !stateCookie || stateCookie.provider !== provider) {
    await clearOauthStateCookie();
    return NextResponse.redirect(fallbackUrl);
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state || state !== stateCookie.state) {
    await clearOauthStateCookie();
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    const profile = await exchangeOauthCodeForProfile({
      provider,
      code,
      origin: request.nextUrl.origin,
    });
    const result = await completeOauthProfile(profile);
    await clearOauthStateCookie();

    if (result.kind === 'authenticated') {
      await clearPendingOauthCandidateCookie();
      await setDashboardSessionCookie(result.auth.session);
      return NextResponse.redirect(new URL('/app', request.nextUrl.origin));
    }

    await clearDashboardSessionCookie();
    await setPendingOauthCandidateCookie(result.candidate);
    return NextResponse.redirect(new URL('/signup?oauth=1', request.nextUrl.origin));
  } catch (error) {
    await clearOauthStateCookie();

    if (error instanceof ApiRequestError && error.code === 'UNAUTHORIZED') {
      return NextResponse.redirect(fallbackUrl);
    }

    return NextResponse.redirect(fallbackUrl);
  }
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { CSRF_COOKIE_NAME, generateCsrfToken } from './lib/vowgrid/csrf-shared';

function shouldRefreshCsrfCookie(value: string | undefined) {
  return !value || value.length < 24;
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  if (shouldRefreshCsrfCookie(existingToken)) {
    response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

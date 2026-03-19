import { cookies, headers } from 'next/headers';
import { CSRF_COOKIE_NAME, CSRF_FORM_FIELD } from './csrf-shared';

function getSubmittedToken(input: FormData | string) {
  if (typeof input === 'string') {
    return input.trim();
  }

  const raw = input.get(CSRF_FORM_FIELD);
  return typeof raw === 'string' ? raw.trim() : '';
}

export async function getInitialCsrfToken() {
  const cookieStore = await cookies();
  return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? '';
}

export async function assertValidCsrfToken(input: FormData | string) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value ?? '';
  const submittedToken = getSubmittedToken(input);

  if (!cookieToken || !submittedToken || cookieToken !== submittedToken) {
    throw new Error('Security token mismatch. Refresh the page and try again.');
  }

  const origin = headerStore.get('origin');

  if (!origin) {
    return;
  }

  const forwardedProtocol =
    headerStore.get('x-forwarded-proto') ??
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const forwardedHost = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const expectedOrigin = forwardedHost ? `${forwardedProtocol}://${forwardedHost}` : null;
  const configuredOrigin = process.env.VOWGRID_WEB_BASE_URL ?? expectedOrigin;

  if (!configuredOrigin) {
    return;
  }

  if (origin !== expectedOrigin && origin !== configuredOrigin) {
    throw new Error('Request origin is not trusted.');
  }
}

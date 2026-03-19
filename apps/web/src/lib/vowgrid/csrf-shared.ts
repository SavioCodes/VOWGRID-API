export const CSRF_COOKIE_NAME = 'vowgrid_csrf';
export const CSRF_FORM_FIELD = '_csrf';

export function generateCsrfToken() {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export function readCookieValue(cookieHeader: string, key: string) {
  const entry = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`));

  if (!entry) {
    return '';
  }

  return decodeURIComponent(entry.slice(key.length + 1));
}

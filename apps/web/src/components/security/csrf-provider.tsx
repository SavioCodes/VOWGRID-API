'use client';

import { createContext, useContext, useState } from 'react';
import { CSRF_COOKIE_NAME, generateCsrfToken, readCookieValue } from '@/lib/vowgrid/csrf-shared';

const CsrfContext = createContext('');

export function CsrfProvider({
  initialToken,
  children,
}: {
  initialToken: string;
  children: React.ReactNode;
}) {
  const [token] = useState(() => {
    if (initialToken) {
      return initialToken;
    }

    if (typeof document === 'undefined') {
      return '';
    }

    const existingToken = readCookieValue(document.cookie, CSRF_COOKIE_NAME);

    if (existingToken) {
      return existingToken;
    }

    const generatedToken = generateCsrfToken();
    document.cookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(generatedToken)}; Path=/; SameSite=Lax${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`;

    return generatedToken;
  });

  return <CsrfContext.Provider value={token}>{children}</CsrfContext.Provider>;
}

export function useCsrfToken() {
  return useContext(CsrfContext);
}

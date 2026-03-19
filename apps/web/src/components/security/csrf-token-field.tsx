'use client';

import { CSRF_FORM_FIELD } from '@/lib/vowgrid/csrf-shared';
import { useCsrfToken } from './csrf-provider';

export function CsrfTokenField() {
  const token = useCsrfToken();

  return <input type="hidden" name={CSRF_FORM_FIELD} value={token} readOnly />;
}

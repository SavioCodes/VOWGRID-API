'use client';

import { useActionState } from 'react';
import { Input } from '@vowgrid/ui';
import { type AuthActionState, confirmEmailVerificationAction } from '@/lib/vowgrid/auth-actions';
import { initialAuthActionState } from '@/lib/vowgrid/auth-form-state';
import { CsrfTokenField } from '@/components/security/csrf-token-field';
import { AuthSubmitButton } from './auth-submit-button';

function ErrorMessage({ state }: { state: AuthActionState }) {
  if (!state.error) {
    return null;
  }

  return (
    <div className="rounded-[20px] border border-[rgba(245,89,89,0.28)] bg-[rgba(245,89,89,0.1)] px-4 py-3 text-sm text-[var(--color-danger)]">
      {state.error}
    </div>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(
    confirmEmailVerificationAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <CsrfTokenField />
      <Input name="token" type="hidden" value={token} readOnly />
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
          Email verification
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)]">
          Confirm this email address
        </h2>
      </div>

      <ErrorMessage state={state} />
      <AuthSubmitButton>Verify email</AuthSubmitButton>
    </form>
  );
}

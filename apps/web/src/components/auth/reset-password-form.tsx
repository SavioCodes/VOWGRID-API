'use client';

import { useActionState } from 'react';
import { Input } from '@vowgrid/ui';
import { type AuthActionState, confirmPasswordResetAction } from '@/lib/vowgrid/auth-actions';
import { initialAuthActionState } from '@/lib/vowgrid/auth-form-state';
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

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(confirmPasswordResetAction, initialAuthActionState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
          Password reset
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)]">
          Choose a new password
        </h2>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">New password</span>
        <Input
          name="password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          required
        />
      </label>

      <ErrorMessage state={state} />
      <AuthSubmitButton>Reset password</AuthSubmitButton>
    </form>
  );
}

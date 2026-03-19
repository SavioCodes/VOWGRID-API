'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Input } from '@vowgrid/ui';
import { type AuthActionState, requestPasswordResetAction } from '@/lib/vowgrid/auth-actions';
import { initialAuthActionState } from '@/lib/vowgrid/auth-form-state';
import { CsrfTokenField } from '@/components/security/csrf-token-field';
import { AuthSubmitButton } from './auth-submit-button';

function Message({ state }: { state: AuthActionState }) {
  if (!state.error && !state.success) {
    return null;
  }

  const tone = state.error
    ? 'border-[rgba(245,89,89,0.28)] bg-[rgba(245,89,89,0.1)] text-[var(--color-danger)]'
    : 'border-[rgba(46,211,183,0.28)] bg-[rgba(46,211,183,0.1)] text-[var(--color-text-primary)]';

  return (
    <div className={`rounded-[20px] border px-4 py-3 text-sm ${tone}`}>
      {state.error ?? state.success}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialAuthActionState);

  return (
    <form action={formAction} className="space-y-5">
      <CsrfTokenField />
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
          Password reset
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)]">
          Send a recovery link
        </h2>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[var(--color-text-primary)]">Email</span>
        <Input
          name="email"
          type="email"
          placeholder="you@company.com"
          autoComplete="email"
          required
        />
      </label>

      <Message state={state} />
      <AuthSubmitButton>Send reset link</AuthSubmitButton>

      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
        Remembered the password?{' '}
        <Link
          href="/login"
          className="text-[var(--color-accent-soft)] hover:text-[var(--color-text-primary)]"
        >
          Go back to login
        </Link>
        .
      </p>
    </form>
  );
}

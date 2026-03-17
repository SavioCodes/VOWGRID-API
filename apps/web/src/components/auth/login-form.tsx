'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Input } from '@vowgrid/ui';
import { type AuthActionState, loginAction } from '@/lib/vowgrid/auth-actions';
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

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialAuthActionState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">Login</p>
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)]">
          Access the control plane
        </h2>
      </div>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Email</span>
          <Input name="email" type="email" placeholder="you@company.com" autoComplete="email" required />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Password</span>
          <Input
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="current-password"
            required
          />
        </label>
      </div>

      <ErrorMessage state={state} />
      <AuthSubmitButton>Log in</AuthSubmitButton>

      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
        Need a workspace first?{' '}
        <Link href="/signup" className="text-[var(--color-accent-soft)] hover:text-[var(--color-text-primary)]">
          Create one here
        </Link>
        .
      </p>
    </form>
  );
}

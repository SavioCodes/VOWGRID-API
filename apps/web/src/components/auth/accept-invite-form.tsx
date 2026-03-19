'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Input } from '@vowgrid/ui';
import { type AuthActionState, acceptWorkspaceInviteAction } from '@/lib/vowgrid/auth-actions';
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

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction] = useActionState(acceptWorkspaceInviteAction, initialAuthActionState);

  return (
    <form action={formAction} className="space-y-5">
      <CsrfTokenField />
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
          Workspace invite
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)]">
          Join this workspace
        </h2>
      </div>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Name</span>
          <Input name="name" placeholder="Only required for new accounts" autoComplete="name" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Password</span>
          <Input
            name="password"
            type="password"
            placeholder="Required for new accounts"
            autoComplete="new-password"
          />
        </label>
      </div>

      <ErrorMessage state={state} />
      <AuthSubmitButton>Accept invite</AuthSubmitButton>

      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
        Already have a session? You can still accept this invite directly. If the email does not
        exist yet, provide name and password above.
      </p>
      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
        Or go back to{' '}
        <Link
          href="/login"
          className="text-[var(--color-accent-soft)] hover:text-[var(--color-text-primary)]"
        >
          login
        </Link>
        .
      </p>
    </form>
  );
}

'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { OAuthSignupCandidateResponse } from '@vowgrid/contracts';
import { Input } from '@vowgrid/ui';
import {
  completeOauthSignupAction,
  type AuthActionState,
  signupAction,
} from '@/lib/vowgrid/auth-actions';
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

export function SignupForm({
  oauthCandidate = null,
}: {
  oauthCandidate?: OAuthSignupCandidateResponse | null;
}) {
  const [state, formAction] = useActionState(
    oauthCandidate ? completeOauthSignupAction : signupAction,
    initialAuthActionState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
          Signup
        </p>
        <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text-primary)]">
          {oauthCandidate ? 'Finish the social signup' : 'Start a workspace trial'}
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            Workspace name
          </span>
          <Input
            name="workspaceName"
            placeholder="Primary Trust Workspace"
            autoComplete="organization"
            required
          />
        </label>

        {oauthCandidate ? (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Provider</span>
              <Input value={oauthCandidate.provider} readOnly />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                Verified work email
              </span>
              <Input value={oauthCandidate.email} readOnly />
            </label>

            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                Operator name
              </span>
              <Input value={oauthCandidate.name} readOnly />
            </label>
          </>
        ) : (
          <>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                Your name
              </span>
              <Input name="name" placeholder="Amina Patel" autoComplete="name" required />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                Work email
              </span>
              <Input
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="block space-y-2 sm:col-span-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">Password</span>
              <Input
                name="password"
                type="password"
                placeholder="Create a password with at least 8 characters"
                autoComplete="new-password"
                required
              />
            </label>
          </>
        )}
      </div>

      <ErrorMessage state={state} />
      <AuthSubmitButton>
        {oauthCandidate ? 'Create workspace and continue' : 'Create workspace'}
      </AuthSubmitButton>

      <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
        Already have access?{' '}
        <Link
          href="/login"
          className="text-[var(--color-accent-soft)] hover:text-[var(--color-text-primary)]"
        >
          Log in here
        </Link>
        .
      </p>
    </form>
  );
}

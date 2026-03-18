'use server';

import {
  acceptWorkspaceInviteSchema,
  completeOauthSignupSchema,
  emailVerificationConfirmSchema,
  loginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  signupSchema,
} from '@vowgrid/contracts';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { ApiRequestError } from './api';
import {
  acceptWorkspaceInvite,
  completeOauthSignup,
  clearDashboardSessionCookie,
  confirmPasswordReset,
  loginWithPassword,
  logoutCurrentSession,
  requestEmailVerification,
  requestPasswordReset,
  setDashboardSessionCookie,
  signupWithPassword,
  switchWorkspace,
  verifyEmailToken,
} from './auth';
import { clearPendingOauthCandidateCookie, getPendingOauthCandidateCookie } from './oauth';

export interface AuthActionState {
  error: string | null;
  success?: string | null;
}

function getField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: getField(formData, 'email'),
    password: getField(formData, 'password'),
  });

  if (!parsed.success) {
    return { error: 'Enter a valid email and password.' };
  }

  try {
    const result = await loginWithPassword(parsed.data);
    await setDashboardSessionCookie(result.session);
    await clearPendingOauthCandidateCookie();
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.message };
    }

    return { error: 'Unable to start the dashboard session right now.' };
  }

  redirect('/app');
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    name: getField(formData, 'name'),
    workspaceName: getField(formData, 'workspaceName'),
    email: getField(formData, 'email'),
    password: getField(formData, 'password'),
  });

  if (!parsed.success) {
    return { error: 'Fill in name, workspace, email, and a password with at least 8 characters.' };
  }

  try {
    const result = await signupWithPassword(parsed.data);
    await setDashboardSessionCookie(result.session);
    await clearPendingOauthCandidateCookie();
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.message };
    }

    return { error: 'Unable to create the workspace right now.' };
  }

  redirect('/app');
}

export async function completeOauthSignupAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const pending = await getPendingOauthCandidateCookie();

  if (!pending) {
    return { error: 'Your OAuth signup session has expired. Start again from the signup page.' };
  }

  const parsed = completeOauthSignupSchema.safeParse({
    token: pending.token,
    workspaceName: getField(formData, 'workspaceName'),
  });

  if (!parsed.success) {
    return { error: 'Provide a valid workspace name to finish the social signup flow.' };
  }

  try {
    const result = await completeOauthSignup(parsed.data);
    await setDashboardSessionCookie(result.session);
    await clearPendingOauthCandidateCookie();
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.message };
    }

    return { error: 'Unable to finish the social signup right now.' };
  }

  redirect('/app');
}

export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordResetRequestSchema.safeParse({
    email: getField(formData, 'email'),
  });

  if (!parsed.success) {
    return { error: 'Enter a valid email address.' };
  }

  try {
    await requestPasswordReset(parsed.data);
    return {
      error: null,
      success: 'If the account exists, a reset link has been sent.',
    };
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.message };
    }

    return { error: 'Unable to request a password reset right now.' };
  }
}

export async function confirmPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = passwordResetConfirmSchema.safeParse({
    token: getField(formData, 'token'),
    password: getField(formData, 'password'),
  });

  if (!parsed.success) {
    return { error: 'Provide a valid reset token and a password with at least 8 characters.' };
  }

  try {
    await confirmPasswordReset(parsed.data);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.message };
    }

    return { error: 'Unable to reset the password right now.' };
  }

  redirect('/login');
}

export async function requestEmailVerificationAction() {
  try {
    await requestEmailVerification();
  } catch {
    // The verification page will show the next fetch state on reload.
  }

  revalidatePath('/app');
  revalidatePath('/verify-email');
}

export async function confirmEmailVerificationAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailVerificationConfirmSchema.safeParse({
    token: getField(formData, 'token'),
  });

  if (!parsed.success) {
    return { error: 'Missing or invalid verification token.' };
  }

  try {
    await verifyEmailToken(parsed.data.token);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.message };
    }

    return { error: 'Unable to verify the email right now.' };
  }

  revalidatePath('/app');
  redirect('/app');
}

export async function acceptWorkspaceInviteAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = acceptWorkspaceInviteSchema.safeParse({
    token: getField(formData, 'token'),
    name: getField(formData, 'name') || undefined,
    password: getField(formData, 'password') || undefined,
  });

  if (!parsed.success) {
    return { error: 'Provide the invite token and, for new users, name and password.' };
  }

  try {
    const result = await acceptWorkspaceInvite(parsed.data);
    await setDashboardSessionCookie(result.session);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.message };
    }

    return { error: 'Unable to accept the workspace invite right now.' };
  }

  redirect('/app');
}

export async function switchWorkspaceAction(formData: FormData) {
  const workspaceId = getField(formData, 'workspaceId');

  if (!workspaceId) {
    return;
  }

  try {
    const result = await switchWorkspace(workspaceId);
    revalidatePath('/app');
    revalidatePath('/app/settings');
    if (result.session) {
      revalidatePath('/app/billing');
    }
  } catch {
    // The current workspace remains unchanged.
  }

  redirect('/app');
}

export async function logoutAction() {
  await logoutCurrentSession();
  redirect('/login');
}

export async function clearDashboardSessionAction() {
  await clearDashboardSessionCookie();
  redirect('/login');
}

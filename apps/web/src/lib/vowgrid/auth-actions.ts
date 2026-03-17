'use server';

import { loginSchema, signupSchema } from '@vowgrid/contracts';
import { redirect } from 'next/navigation';
import { ApiRequestError } from './api';
import {
  loginWithPassword,
  logoutCurrentSession,
  setDashboardSessionCookie,
  signupWithPassword,
} from './auth';

export interface AuthActionState {
  error: string | null;
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
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { error: error.message };
    }

    return { error: 'Unable to create the workspace right now.' };
  }

  redirect('/app');
}

export async function logoutAction() {
  await logoutCurrentSession();
  redirect('/login');
}

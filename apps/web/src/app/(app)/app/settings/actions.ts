'use server';

import { revalidatePath } from 'next/cache';
import {
  anonymizeWorkspaceMember as anonymizeWorkspaceMemberRecord,
  createWorkspaceApiKey as createWorkspaceApiKeyRecord,
  createWorkspaceInvite as createWorkspaceInviteRecord,
  createWorkspaceMember as createWorkspaceMemberRecord,
  disableWorkspaceMember as disableWorkspaceMemberRecord,
  enableWorkspaceMember as enableWorkspaceMemberRecord,
  revokeWorkspaceApiKey as revokeWorkspaceApiKeyRecord,
  revokeWorkspaceInvite as revokeWorkspaceInviteRecord,
  rotateWorkspaceApiKey as rotateWorkspaceApiKeyRecord,
  updateWorkspaceMember as updateWorkspaceMemberRecord,
} from '@/lib/vowgrid/repository';
import { assertValidCsrfToken } from '@/lib/vowgrid/csrf';

export interface ApiKeyActionResult {
  ok: boolean;
  message: string;
  revealedApiKey?: string;
  recordName?: string;
}

export interface MemberActionResult {
  ok: boolean;
  message: string;
}

export interface InviteActionResult {
  ok: boolean;
  message: string;
  inviteUrl?: string | null;
}

function getExpiry(formData: FormData) {
  const raw = formData.get('expiresAt');

  if (typeof raw !== 'string' || raw.trim() === '') {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Expiry must be a valid date.');
  }

  return parsed.toISOString();
}

function getRequiredString(formData: FormData, key: string, message: string) {
  const value = formData.get(key);
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(message);
  }

  return value.trim();
}

function getOptionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function getRole(formData: FormData) {
  const role = formData.get('role');

  if (role === 'admin' || role === 'member' || role === 'viewer') {
    return role;
  }

  throw new Error('Select a valid workspace role.');
}

function revalidateSettings() {
  revalidatePath('/app/settings');
}

export async function createMemberAction(formData: FormData): Promise<MemberActionResult> {
  try {
    await assertValidCsrfToken(formData);

    const created = await createWorkspaceMemberRecord({
      name: getRequiredString(formData, 'name', 'Provide the member name.'),
      email: getRequiredString(formData, 'email', 'Provide the member email.'),
      role: getRole(formData),
      password: getRequiredString(
        formData,
        'password',
        'Provide an initial password with at least 8 characters.',
      ),
    });

    revalidateSettings();

    return {
      ok: true,
      message: `${created.member.name} was added to the workspace successfully.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to create workspace member.',
    };
  }
}

export async function updateMemberAction(
  userId: string,
  formData: FormData,
): Promise<MemberActionResult> {
  try {
    await assertValidCsrfToken(formData);

    const updated = await updateWorkspaceMemberRecord(userId, {
      name: getOptionalString(formData, 'name'),
      role: getRole(formData),
    });

    revalidateSettings();

    return {
      ok: true,
      message: `${updated.member.name} was updated successfully.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to update workspace member.',
    };
  }
}

export async function disableMemberAction(
  userId: string,
  csrfToken: string,
): Promise<MemberActionResult> {
  try {
    await assertValidCsrfToken(csrfToken);
    const disabled = await disableWorkspaceMemberRecord(userId);
    revalidateSettings();

    return {
      ok: true,
      message: `${disabled.member.name} was disabled and existing sessions were revoked.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to disable workspace member.',
    };
  }
}

export async function enableMemberAction(
  userId: string,
  csrfToken: string,
): Promise<MemberActionResult> {
  try {
    await assertValidCsrfToken(csrfToken);
    const enabled = await enableWorkspaceMemberRecord(userId);
    revalidateSettings();

    return {
      ok: true,
      message: `${enabled.member.name} was re-enabled successfully.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to re-enable workspace member.',
    };
  }
}

export async function anonymizeMemberAction(
  userId: string,
  csrfToken: string,
): Promise<MemberActionResult> {
  try {
    await assertValidCsrfToken(csrfToken);
    const anonymized = await anonymizeWorkspaceMemberRecord(userId);
    revalidateSettings();

    return {
      ok: true,
      message: `${anonymized.member.name} was anonymized and personal identity fields were redacted.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to anonymize workspace member.',
    };
  }
}

export async function createApiKeyAction(formData: FormData): Promise<ApiKeyActionResult> {
  try {
    await assertValidCsrfToken(formData);
    const name = formData.get('name');
    if (typeof name !== 'string' || name.trim().length < 2) {
      return {
        ok: false,
        message: 'Provide a descriptive API key name with at least 2 characters.',
      };
    }

    const created = await createWorkspaceApiKeyRecord({
      name: name.trim(),
      expiresAt: getExpiry(formData),
    });

    revalidateSettings();

    return {
      ok: true,
      message: 'API key created. Copy it now because it will not be shown again.',
      revealedApiKey: created.apiKey,
      recordName: created.record.name,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to create API key.',
    };
  }
}

export async function createInviteAction(formData: FormData): Promise<InviteActionResult> {
  try {
    await assertValidCsrfToken(formData);
    const created = await createWorkspaceInviteRecord({
      email: getRequiredString(formData, 'email', 'Provide the invite email.'),
      role: getRole(formData),
    });

    revalidateSettings();

    return {
      ok: true,
      message: 'Workspace invite created successfully.',
      inviteUrl: created.inviteUrl,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to create workspace invite.',
    };
  }
}

export async function revokeInviteAction(
  inviteId: string,
  csrfToken: string,
): Promise<InviteActionResult> {
  try {
    await assertValidCsrfToken(csrfToken);
    await revokeWorkspaceInviteRecord(inviteId);
    revalidateSettings();

    return {
      ok: true,
      message: 'Workspace invite revoked successfully.',
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to revoke workspace invite.',
    };
  }
}

export async function rotateApiKeyAction(
  apiKeyId: string,
  csrfToken: string,
): Promise<ApiKeyActionResult> {
  try {
    await assertValidCsrfToken(csrfToken);
    const rotated = await rotateWorkspaceApiKeyRecord(apiKeyId);

    revalidateSettings();

    return {
      ok: true,
      message: 'API key rotated. Copy the replacement now because it will not be shown again.',
      revealedApiKey: rotated.apiKey,
      recordName: rotated.record.name,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to rotate API key.',
    };
  }
}

export async function revokeApiKeyAction(
  apiKeyId: string,
  csrfToken: string,
): Promise<ApiKeyActionResult> {
  try {
    await assertValidCsrfToken(csrfToken);
    await revokeWorkspaceApiKeyRecord(apiKeyId);
    revalidateSettings();

    return {
      ok: true,
      message: 'API key revoked successfully.',
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to revoke API key.',
    };
  }
}

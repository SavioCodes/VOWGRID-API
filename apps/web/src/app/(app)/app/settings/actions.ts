'use server';

import { revalidatePath } from 'next/cache';
import {
  createWorkspaceApiKey as createWorkspaceApiKeyRecord,
  revokeWorkspaceApiKey as revokeWorkspaceApiKeyRecord,
  rotateWorkspaceApiKey as rotateWorkspaceApiKeyRecord,
} from '@/lib/vowgrid/repository';

export interface ApiKeyActionResult {
  ok: boolean;
  message: string;
  revealedApiKey?: string;
  recordName?: string;
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

export async function createApiKeyAction(formData: FormData): Promise<ApiKeyActionResult> {
  try {
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

    revalidatePath('/app/settings');

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

export async function rotateApiKeyAction(apiKeyId: string): Promise<ApiKeyActionResult> {
  try {
    const rotated = await rotateWorkspaceApiKeyRecord(apiKeyId);

    revalidatePath('/app/settings');

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

export async function revokeApiKeyAction(apiKeyId: string): Promise<ApiKeyActionResult> {
  try {
    await revokeWorkspaceApiKeyRecord(apiKeyId);
    revalidatePath('/app/settings');

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

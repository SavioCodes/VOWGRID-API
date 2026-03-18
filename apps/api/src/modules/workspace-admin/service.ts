import type {
  CreateWorkspaceApiKeyInput,
  RevokeWorkspaceApiKeyResponse,
  WorkspaceApiKeyResponse,
  WorkspaceApiKeySecretResponse,
} from '@vowgrid/contracts';
import { buildApiKeyPrefix, generateApiKeySecret, hashApiKey } from '../../common/api-keys.js';
import { ConflictError, NotFoundError, ValidationError } from '../../common/errors.js';
import { prisma } from '../../lib/prisma.js';
import { emitAuditEvent } from '../audits/service.js';

function resolveApiKeyStatus(record: {
  revokedAt: Date | null;
  expiresAt: Date | null;
}): WorkspaceApiKeyResponse['status'] {
  if (record.revokedAt) {
    return 'revoked';
  }

  if (record.expiresAt && record.expiresAt <= new Date()) {
    return 'expired';
  }

  return 'active';
}

function serializeApiKey(record: {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
}): WorkspaceApiKeyResponse {
  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    scopes: record.scopes,
    status: resolveApiKeyStatus(record),
    expiresAt: record.expiresAt?.toISOString() ?? null,
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    revokedAt: record.revokedAt?.toISOString() ?? null,
  };
}

function parseOptionalExpiry(expiresAt?: string | null) {
  if (!expiresAt) {
    return null;
  }

  const parsed = new Date(expiresAt);

  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('API key expiry must be a valid ISO datetime.');
  }

  if (parsed <= new Date()) {
    throw new ValidationError('API key expiry must be in the future.');
  }

  return parsed;
}

async function getWorkspaceApiKeyOrThrow(apiKeyId: string, workspaceId: string) {
  const record = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
      workspaceId,
    },
  });

  if (!record) {
    throw new NotFoundError('ApiKey', apiKeyId);
  }

  return record;
}

export async function listWorkspaceApiKeys(
  workspaceId: string,
): Promise<WorkspaceApiKeyResponse[]> {
  const records = await prisma.apiKey.findMany({
    where: { workspaceId },
    orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
  });

  return records.map(serializeApiKey);
}

export async function createWorkspaceApiKey(
  workspaceId: string,
  input: CreateWorkspaceApiKeyInput,
  actorId: string,
): Promise<WorkspaceApiKeySecretResponse> {
  const secret = generateApiKeySecret();
  const record = await prisma.apiKey.create({
    data: {
      name: input.name.trim(),
      keyHash: hashApiKey(secret),
      keyPrefix: buildApiKeyPrefix(secret),
      workspaceId,
      scopes: ['*'],
      expiresAt: parseOptionalExpiry(input.expiresAt),
    },
  });

  await emitAuditEvent({
    action: 'workspace.api_key.created',
    entityType: 'api_key',
    entityId: record.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      keyPrefix: record.keyPrefix,
      expiresAt: record.expiresAt?.toISOString() ?? null,
    },
  });

  return {
    apiKey: secret,
    record: serializeApiKey(record),
  };
}

export async function revokeWorkspaceApiKey(
  apiKeyId: string,
  workspaceId: string,
  actorId: string,
): Promise<RevokeWorkspaceApiKeyResponse> {
  const existing = await getWorkspaceApiKeyOrThrow(apiKeyId, workspaceId);

  if (existing.revokedAt) {
    return {
      revoked: true,
      record: serializeApiKey(existing),
    };
  }

  const record = await prisma.apiKey.update({
    where: { id: existing.id },
    data: {
      revokedAt: new Date(),
    },
  });

  await emitAuditEvent({
    action: 'workspace.api_key.revoked',
    entityType: 'api_key',
    entityId: record.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      keyPrefix: record.keyPrefix,
    },
  });

  return {
    revoked: true,
    record: serializeApiKey(record),
  };
}

export async function rotateWorkspaceApiKey(
  apiKeyId: string,
  workspaceId: string,
  actorId: string,
): Promise<WorkspaceApiKeySecretResponse> {
  const existing = await getWorkspaceApiKeyOrThrow(apiKeyId, workspaceId);

  if (existing.revokedAt) {
    throw new ConflictError('Revoked API keys cannot be rotated.');
  }

  const secret = generateApiKeySecret();
  const now = new Date();

  const rotated = await prisma.$transaction(async (tx) => {
    await tx.apiKey.update({
      where: { id: existing.id },
      data: { revokedAt: now },
    });

    return tx.apiKey.create({
      data: {
        name: existing.name,
        keyHash: hashApiKey(secret),
        keyPrefix: buildApiKeyPrefix(secret),
        workspaceId,
        scopes: existing.scopes,
        expiresAt: existing.expiresAt,
      },
    });
  });

  await emitAuditEvent({
    action: 'workspace.api_key.rotated',
    entityType: 'api_key',
    entityId: rotated.id,
    actorType: 'user',
    actorId,
    workspaceId,
    metadata: {
      previousApiKeyId: existing.id,
      previousKeyPrefix: existing.keyPrefix,
      newKeyPrefix: rotated.keyPrefix,
    },
  });

  return {
    apiKey: secret,
    record: serializeApiKey(rotated),
  };
}

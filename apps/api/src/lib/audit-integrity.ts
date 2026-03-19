import { createHmac } from 'node:crypto';
import { env } from '../config/env.js';

interface AuditIntegrityPayload {
  action: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string;
  workspaceId: string;
  metadata?: unknown;
  createdAt: string;
  previousHash?: string | null;
}

type AuditIntegrityRecord = Omit<AuditIntegrityPayload, 'createdAt'> & {
  createdAt: Date;
  previousHash: string | null;
  integrityHash: string;
};

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortValue(nestedValue)]),
    );
  }

  return value;
}

function getAuditIntegrityKey() {
  return env.AUDIT_LOG_HMAC_KEY;
}

export function buildAuditIntegrityHash(payload: AuditIntegrityPayload) {
  const canonicalPayload = JSON.stringify(sortValue(payload));

  return createHmac('sha256', getAuditIntegrityKey()).update(canonicalPayload).digest('hex');
}

export function verifyAuditIntegrity(record: AuditIntegrityRecord) {
  const expected = buildAuditIntegrityHash({
    action: record.action,
    entityType: record.entityType,
    entityId: record.entityId,
    actorType: record.actorType,
    actorId: record.actorId,
    workspaceId: record.workspaceId,
    metadata: record.metadata,
    createdAt: record.createdAt.toISOString(),
    previousHash: record.previousHash,
  });

  return expected === record.integrityHash;
}

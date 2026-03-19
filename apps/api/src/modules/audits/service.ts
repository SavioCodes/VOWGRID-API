// ──────────────────────────────────────────
// VowGrid — Audit Service
// ──────────────────────────────────────────

import { prisma } from '../../lib/prisma.js';
import { toPrismaNullableJsonValue } from '../../common/json.js';
import { logger } from '../../lib/logger.js';
import { buildAuditIntegrityHash } from '../../lib/audit-integrity.js';

export interface AuditEventInput {
  action: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string;
  workspaceId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Emit an audit event. Non-blocking — failures are logged but don't propagate.
 */
export async function emitAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const createdAt = new Date();
      const previousEvent = await tx.auditEvent.findFirst({
        where: { workspaceId: input.workspaceId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: {
          integrityHash: true,
        },
      });
      const previousHash = previousEvent?.integrityHash ?? null;
      const integrityHash = buildAuditIntegrityHash({
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorType: input.actorType,
        actorId: input.actorId,
        workspaceId: input.workspaceId,
        metadata: input.metadata,
        createdAt: createdAt.toISOString(),
        previousHash,
      });

      await tx.auditEvent.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          actorType: input.actorType,
          actorId: input.actorId,
          workspaceId: input.workspaceId,
          metadata: toPrismaNullableJsonValue(input.metadata),
          previousHash,
          integrityHash,
          createdAt,
        },
      });
    });
  } catch (error) {
    // Audit emission should never break the main flow
    logger.error({ error, auditEvent: input }, 'Failed to emit audit event');
  }
}

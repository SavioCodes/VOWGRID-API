// ──────────────────────────────────────────
// VowGrid — Audit Service
// ──────────────────────────────────────────

import { prisma } from '../../lib/prisma.js';
import { toPrismaNullableJsonValue } from '../../common/json.js';
import { logger } from '../../lib/logger.js';

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
    await prisma.auditEvent.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        actorType: input.actorType,
        actorId: input.actorId,
        workspaceId: input.workspaceId,
        metadata: toPrismaNullableJsonValue(input.metadata),
      },
    });
  } catch (error) {
    // Audit emission should never break the main flow
    logger.error({ error, auditEvent: input }, 'Failed to emit audit event');
  }
}

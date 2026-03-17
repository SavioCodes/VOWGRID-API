// ──────────────────────────────────────────
// VowGrid — Approval Routes
// ──────────────────────────────────────────

import { FastifyInstance } from 'fastify';
import {
  submitForApprovalSchema,
  approvalDecisionSchema,
  submitForApproval,
  processApprovalDecision,
} from './service.js';
import { success } from '../../common/response.js';
import { ValidationError } from '../../common/errors.js';
import { getActorId, getActorType } from '../../plugins/auth.plugin.js';

export async function approvalRoutes(app: FastifyInstance): Promise<void> {
  // ── Submit for approval ──────────────
  app.post('/intents/:intentId/submit-for-approval', {
    schema: {
      tags: ['Approvals'],
      summary: 'Submit intent for approval',
      description: 'Evaluates policies and creates an approval request. Intent must be simulated.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { intentId } = request.params as { intentId: string };
      const parsed = submitForApprovalSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new ValidationError('Invalid approval data', parsed.error.flatten());
      }

      const result = await submitForApproval(
        intentId,
        request.auth.workspaceId,
        parsed.data.requiredCount,
        getActorId(request.auth),
        getActorType(request.auth),
      );

      return reply.status(200).send(success(result));
    },
  });

  // ── Approve ──────────────────────────
  app.post('/approvals/:approvalRequestId/approve', {
    schema: {
      tags: ['Approvals'],
      summary: 'Approve an approval request',
      description: 'Record an approval decision',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { approvalRequestId } = request.params as { approvalRequestId: string };
      const parsed = approvalDecisionSchema.safeParse({
        ...(request.body as object),
        decision: 'approved',
      });
      if (!parsed.success) {
        throw new ValidationError('Invalid approval data', parsed.error.flatten());
      }

      const resolvedUserId = request.auth.userId ?? parsed.data.userId;
      if (!resolvedUserId) {
        throw new ValidationError(
          'Approval decisions require a session-authenticated user or an explicit userId.',
        );
      }

      const result = await processApprovalDecision(
        approvalRequestId,
        resolvedUserId,
        'approved',
        parsed.data.rationale,
        request.auth.workspaceId,
      );

      return reply.send(success(result));
    },
  });

  // ── Reject ───────────────────────────
  app.post('/approvals/:approvalRequestId/reject', {
    schema: {
      tags: ['Approvals'],
      summary: 'Reject an approval request',
      description: 'Record a rejection decision — any rejection rejects the entire request',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { approvalRequestId } = request.params as { approvalRequestId: string };
      const parsed = approvalDecisionSchema.safeParse({
        ...(request.body as object),
        decision: 'rejected',
      });
      if (!parsed.success) {
        throw new ValidationError('Invalid rejection data', parsed.error.flatten());
      }

      const resolvedUserId = request.auth.userId ?? parsed.data.userId;
      if (!resolvedUserId) {
        throw new ValidationError(
          'Approval decisions require a session-authenticated user or an explicit userId.',
        );
      }

      const result = await processApprovalDecision(
        approvalRequestId,
        resolvedUserId,
        'rejected',
        parsed.data.rationale,
        request.auth.workspaceId,
      );

      return reply.send(success(result));
    },
  });
}

import { approvalDecisionSchema, submitForApprovalSchema } from '@vowgrid/contracts';
import { FastifyInstance } from 'fastify';
import { ValidationError } from '../../common/errors.js';
import { success } from '../../common/response.js';
import { getActorId, getActorType } from '../../plugins/auth.plugin.js';
import { processApprovalDecision, submitForApproval } from './service.js';

export async function approvalRoutes(app: FastifyInstance): Promise<void> {
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
        parsed.data,
        getActorId(request.auth),
        getActorType(request.auth),
      );

      return reply.status(200).send(success(result));
    },
  });

  app.post('/approvals/:approvalRequestId/approve', {
    schema: {
      tags: ['Approvals'],
      summary: 'Approve an approval request',
      description: 'Record an approval decision.',
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
        request.auth.role,
      );

      return reply.send(success(result));
    },
  });

  app.post('/approvals/:approvalRequestId/reject', {
    schema: {
      tags: ['Approvals'],
      summary: 'Reject an approval request',
      description: 'Record a rejection decision; any rejection rejects the entire request.',
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
        request.auth.role,
      );

      return reply.send(success(result));
    },
  });

  app.post('/approvals/:approvalRequestId/decisions', {
    schema: {
      tags: ['Approvals'],
      summary: 'Record an approval decision',
      description:
        'Record an approved or rejected decision against the current active approval stage.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const { approvalRequestId } = request.params as { approvalRequestId: string };
      const parsed = approvalDecisionSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new ValidationError('Invalid approval decision data', parsed.error.flatten());
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
        parsed.data.decision,
        parsed.data.rationale,
        request.auth.workspaceId,
        request.auth.role,
      );

      return reply.send(success(result));
    },
  });
}

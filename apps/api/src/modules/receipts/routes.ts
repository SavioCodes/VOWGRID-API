// ──────────────────────────────────────────
// VowGrid — Receipt Routes
// ──────────────────────────────────────────

import { FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { success } from '../../common/response.js';
import { NotFoundError } from '../../common/errors.js';

export async function receiptRoutes(app: FastifyInstance): Promise<void> {
  const authenticate = (
    app as FastifyInstance & {
      authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    }
  ).authenticate;

  app.get('/receipts/:receiptId', {
    schema: {
      tags: ['Receipts'],
      summary: 'Get a receipt',
      description: 'Get a receipt by ID — proof of what happened during execution or rollback',
    },
    preHandler: [authenticate],
    handler: async (request, reply) => {
      const { receiptId } = request.params as { receiptId: string };

      const receipt = await prisma.receipt.findFirst({
        where: { id: receiptId },
        include: {
          intent: {
            select: { id: true, workspaceId: true, title: true, action: true },
          },
        },
      });

      if (!receipt || receipt.intent.workspaceId !== request.auth.workspaceId) {
        throw new NotFoundError('Receipt', receiptId);
      }

      return reply.send(success(receipt));
    },
  });
}

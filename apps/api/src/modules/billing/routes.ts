import { FastifyInstance } from 'fastify';
import {
  applyBillingCouponSchema,
  cancelSubscriptionSchema,
  createCheckoutSchema,
  updateBillingCustomerSchema,
} from '@vowgrid/contracts';
import { ForbiddenError, ValidationError } from '../../common/errors.js';
import { success } from '../../common/response.js';
import {
  applyWorkspaceBillingCoupon,
  cancelWorkspaceSubscription,
  clearWorkspaceBillingCoupon,
  getWorkspaceBillingAccount,
  listBillingPlans,
  processMercadoPagoWebhook,
  startWorkspaceCheckout,
  updateWorkspaceBillingCustomerProfile,
} from './service.js';

function requireBillingAdmin(role?: string) {
  if (role !== 'owner' && role !== 'admin') {
    throw new ForbiddenError('Only workspace owners and admins can manage billing settings.');
  }
}

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.get('/billing/plans', {
    schema: {
      tags: ['Billing'],
      summary: 'List billing plans',
      description:
        'Returns the internal VowGrid launch plan catalog used by the site and dashboard.',
    },
    handler: async (_request, reply) => {
      const plans = await listBillingPlans();
      return reply.send(success(plans));
    },
  });

  app.get('/billing/account', {
    schema: {
      tags: ['Billing'],
      summary: 'Get workspace billing account',
      description:
        'Returns subscription, trial, entitlements, usage, and provider setup state for the authenticated workspace.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const account = await getWorkspaceBillingAccount(request.auth.workspaceId);
      return reply.send(success(account));
    },
  });

  app.post('/billing/checkout', {
    schema: {
      tags: ['Billing'],
      summary: 'Start Mercado Pago checkout',
      description: 'Creates a Mercado Pago subscription checkout for Launch, Pro, or Business.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const parsed = createCheckoutSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid checkout payload', parsed.error.flatten());
      }

      const checkout = await startWorkspaceCheckout(request.auth.workspaceId, parsed.data);
      return reply.status(201).send(success(checkout));
    },
  });

  app.post('/billing/subscription/cancel', {
    schema: {
      tags: ['Billing'],
      summary: 'Cancel a workspace subscription',
      description:
        'Cancels immediately or marks the subscription to end at the current period boundary.',
    },
    preHandler: [app.authenticate],
    handler: async (request, reply) => {
      const parsed = cancelSubscriptionSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new ValidationError('Invalid cancellation payload', parsed.error.flatten());
      }

      const account = await cancelWorkspaceSubscription(request.auth.workspaceId, parsed.data);
      return reply.send(success(account));
    },
  });

  app.patch('/billing/customer', {
    schema: {
      tags: ['Billing'],
      summary: 'Update workspace billing customer profile',
      description:
        'Stores workspace billing identity and tax profile data used for tax resolution and invoice rendering.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireBillingAdmin(request.auth.role);
      const parsed = updateBillingCustomerSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new ValidationError('Invalid billing customer payload', parsed.error.flatten());
      }

      const account = await updateWorkspaceBillingCustomerProfile(
        request.auth.workspaceId,
        parsed.data,
      );
      return reply.send(success(account));
    },
  });

  app.post('/billing/coupon', {
    schema: {
      tags: ['Billing'],
      summary: 'Apply a workspace billing coupon',
      description:
        'Applies a configured billing coupon to future checkout pricing and invoice calculations.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireBillingAdmin(request.auth.role);
      const parsed = applyBillingCouponSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new ValidationError('Invalid billing coupon payload', parsed.error.flatten());
      }

      const account = await applyWorkspaceBillingCoupon(request.auth.workspaceId, parsed.data);
      return reply.send(success(account));
    },
  });

  app.delete('/billing/coupon', {
    schema: {
      tags: ['Billing'],
      summary: 'Clear the active workspace billing coupon',
      description:
        'Removes the currently active workspace coupon without deleting the billing customer profile.',
    },
    preHandler: [app.authenticateSession],
    handler: async (request, reply) => {
      requireBillingAdmin(request.auth.role);
      const account = await clearWorkspaceBillingCoupon(request.auth.workspaceId);
      return reply.send(success(account));
    },
  });

  app.post('/billing/webhooks/mercado-pago', {
    schema: {
      tags: ['Billing'],
      summary: 'Mercado Pago webhook',
      description:
        'Receives subscription events from Mercado Pago and syncs internal subscription state.',
      security: [],
    },
    handler: async (request, reply) => {
      const result = await processMercadoPagoWebhook({
        payload: (request.body ?? {}) as Record<string, unknown>,
        rawUrl: request.raw.url ?? '/v1/billing/webhooks/mercado-pago',
        signatureHeader: request.headers['x-signature'] as string | undefined,
        requestId: request.headers['x-request-id'] as string | undefined,
      });

      return reply.status(202).send(success(result));
    },
  });
}

import { Prisma } from '@prisma/client';
import type {
  BillingAccountResponse,
  BillingCheckoutResponse,
  CancelSubscriptionInput,
  CreateCheckoutInput,
} from '@vowgrid/contracts';
import { PLAN_CATALOG } from '@vowgrid/contracts';
import { prisma } from '../../lib/prisma.js';
import {
  BillingConfigurationError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../common/errors.js';
import { emitAuditEvent } from '../audits/service.js';
import {
  cancelMercadoPagoSubscription,
  getMercadoPagoSubscription,
  startMercadoPagoCheckout,
  validateMercadoPagoWebhookSignature,
  type MercadoPagoWebhookPayload,
} from './mercado-pago.js';
import { getBillingAccount } from './entitlements.js';

function buildExternalReference(workspaceId: string, input: CreateCheckoutInput) {
  return `${workspaceId}:${input.planKey}:${input.billingCycle}:${Date.now()}`;
}

function parseExternalReference(externalReference?: string | null) {
  if (!externalReference) {
    return null;
  }

  const [workspaceId, planKey, billingCycle] = externalReference.split(':');

  if (!workspaceId || !planKey || !billingCycle) {
    return null;
  }

  return {
    workspaceId,
    planKey,
    billingCycle,
  };
}

function extractWebhookResourceId(rawUrl: string, payload: MercadoPagoWebhookPayload) {
  const url = new URL(rawUrl, 'http://localhost');
  return (
    payload.data?.id ??
    (typeof payload.id === 'string' ? payload.id : payload.id?.toString()) ??
    url.searchParams.get('data.id') ??
    url.searchParams.get('id')
  );
}

function buildWebhookEventKey({
  requestId,
  payload,
  resourceId,
}: {
  requestId?: string;
  payload: MercadoPagoWebhookPayload;
  resourceId: string;
}) {
  return requestId
    ? `mercado_pago:${requestId}`
    : `mercado_pago:${payload.type ?? 'unknown'}:${payload.action ?? 'unknown'}:${resourceId}:${payload.date_created ?? 'unknown'}`;
}

function isSubscriptionWebhook(payload: MercadoPagoWebhookPayload) {
  return (payload.type ?? '').toLowerCase().includes('preapproval');
}

export async function listBillingPlans() {
  return Object.values(PLAN_CATALOG);
}

export async function getWorkspaceBillingAccount(
  workspaceId: string,
): Promise<BillingAccountResponse> {
  return getBillingAccount(workspaceId);
}

export async function startWorkspaceCheckout(
  workspaceId: string,
  input: CreateCheckoutInput,
): Promise<BillingCheckoutResponse> {
  const account = await getBillingAccount(workspaceId);

  if (!account.customer?.email) {
    throw new ValidationError(
      'A billing contact email is required before checkout can start. Add at least one workspace user first.',
    );
  }

  if (!account.provider.checkoutEnabled) {
    throw new BillingConfigurationError(
      'Mercado Pago checkout is not fully configured yet. Complete the billing provider env setup first.',
      account.provider,
    );
  }

  const externalReference = buildExternalReference(workspaceId, input);
  const planLabel = input.planKey.charAt(0).toUpperCase() + input.planKey.slice(1);
  const checkout = await startMercadoPagoCheckout({
    ...input,
    externalReference,
    payerEmail: account.customer.email,
    reason: `VowGrid ${planLabel} ${input.billingCycle}`,
  });

  const existingSubscription = await prisma.workspaceSubscription.findUnique({
    where: { workspaceId },
  });

  await prisma.workspaceSubscription.upsert({
    where: { workspaceId },
    update: {
      provider: 'mercado_pago',
      planKey: input.planKey,
      billingCycle: input.billingCycle,
      status: checkout.status,
      mercadoPagoPreapprovalId: checkout.providerSubscriptionId,
      checkoutUrl: checkout.checkoutUrl,
      externalReference,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      lastProviderSyncAt: new Date(),
      providerMetadata: checkout.providerPayload as unknown as Prisma.InputJsonValue,
      ...(existingSubscription?.billingCustomerId
        ? {}
        : { billingCustomerId: account.customer.id }),
    },
    create: {
      workspaceId,
      billingCustomerId: account.customer.id,
      provider: 'mercado_pago',
      planKey: input.planKey,
      billingCycle: input.billingCycle,
      status: checkout.status,
      mercadoPagoPreapprovalId: checkout.providerSubscriptionId,
      checkoutUrl: checkout.checkoutUrl,
      externalReference,
      lastProviderSyncAt: new Date(),
      providerMetadata: checkout.providerPayload as unknown as Prisma.InputJsonValue,
    },
  });

  await emitAuditEvent({
    action: 'billing.checkout.created',
    entityType: 'workspace',
    entityId: workspaceId,
    actorType: 'system',
    actorId: account.customer.id,
    workspaceId,
    metadata: {
      planKey: input.planKey,
      billingCycle: input.billingCycle,
      providerSubscriptionId: checkout.providerSubscriptionId,
    },
  });

  return {
    provider: 'mercado_pago',
    planKey: input.planKey,
    billingCycle: input.billingCycle,
    checkoutUrl: checkout.checkoutUrl,
    providerSubscriptionId: checkout.providerSubscriptionId,
  };
}

export async function cancelWorkspaceSubscription(
  workspaceId: string,
  input: CancelSubscriptionInput,
) {
  const subscription = await prisma.workspaceSubscription.findUnique({
    where: { workspaceId },
  });

  if (!subscription || !subscription.mercadoPagoPreapprovalId) {
    throw new NotFoundError('WorkspaceSubscription', workspaceId);
  }

  let nextStatus = subscription.status;
  let providerMetadata = subscription.providerMetadata as Prisma.InputJsonValue | null;

  if (input.immediate) {
    const canceled = await cancelMercadoPagoSubscription(subscription.mercadoPagoPreapprovalId);
    nextStatus = canceled.status;
    providerMetadata = canceled.raw as unknown as Prisma.InputJsonValue;
  }

  await prisma.workspaceSubscription.update({
    where: { workspaceId },
    data: {
      status: nextStatus,
      cancelAtPeriodEnd: !input.immediate,
      canceledAt: input.immediate ? new Date() : null,
      lastProviderSyncAt: new Date(),
      providerMetadata: providerMetadata ?? undefined,
    },
  });

  await emitAuditEvent({
    action: input.immediate
      ? 'billing.subscription.canceled'
      : 'billing.subscription.cancel_scheduled',
    entityType: 'workspace',
    entityId: workspaceId,
    actorType: 'system',
    actorId: 'billing-system',
    workspaceId,
    metadata: { immediate: input.immediate },
  });

  return getBillingAccount(workspaceId);
}

export async function processMercadoPagoWebhook({
  payload,
  rawUrl,
  signatureHeader,
  requestId,
}: {
  payload: MercadoPagoWebhookPayload;
  rawUrl: string;
  signatureHeader?: string;
  requestId?: string;
}) {
  const resourceId = extractWebhookResourceId(rawUrl, payload);

  if (!resourceId) {
    throw new ValidationError('Mercado Pago webhook payload is missing a subscription identifier.');
  }

  if (!validateMercadoPagoWebhookSignature({ resourceId, signatureHeader, requestId })) {
    throw new UnauthorizedError('Invalid Mercado Pago webhook signature.');
  }

  const eventKey = buildWebhookEventKey({ requestId, payload, resourceId });
  const eventType = `${payload.type ?? 'unknown'}.${payload.action ?? 'updated'}`;

  let billingEvent: {
    id: string;
    workspaceId: string | null;
    subscriptionId: string | null;
  } | null = null;

  try {
    billingEvent = await prisma.billingEvent.create({
      data: {
        source: 'mercado_pago',
        eventKey,
        eventType,
        providerReference: resourceId,
        payload: payload as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        workspaceId: true,
        subscriptionId: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { duplicate: true, eventKey };
    }

    throw error;
  }

  if (!isSubscriptionWebhook(payload)) {
    await prisma.billingEvent.update({
      where: { id: billingEvent.id },
      data: {
        status: 'ignored',
        processedAt: new Date(),
      },
    });

    return { ignored: true, eventKey };
  }

  const providerSnapshot = await getMercadoPagoSubscription(resourceId);
  const parsedReference = parseExternalReference(providerSnapshot.raw.external_reference);

  const existingSubscription = await prisma.workspaceSubscription.findFirst({
    where: {
      OR: [
        { mercadoPagoPreapprovalId: resourceId },
        ...(providerSnapshot.raw.external_reference
          ? [{ externalReference: providerSnapshot.raw.external_reference }]
          : []),
      ],
    },
  });

  const workspaceId = existingSubscription?.workspaceId ?? parsedReference?.workspaceId;

  if (!workspaceId) {
    await prisma.billingEvent.update({
      where: { id: billingEvent.id },
      data: {
        status: 'ignored',
        processedAt: new Date(),
        providerReference: resourceId,
      },
    });

    return { ignored: true, eventKey };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      billingCustomer: true,
      users: true,
    },
  });

  if (!workspace) {
    throw new NotFoundError('Workspace', workspaceId);
  }

  let billingCustomerId = workspace.billingCustomer?.id ?? null;

  if (!billingCustomerId) {
    const contact = workspace.users[0];

    if (contact) {
      const customer = await prisma.billingCustomer.create({
        data: {
          workspaceId,
          email: providerSnapshot.raw.payer_email ?? contact.email,
          legalName: workspace.name,
          mercadoPagoCustomerId:
            providerSnapshot.raw.payer_id !== undefined && providerSnapshot.raw.payer_id !== null
              ? String(providerSnapshot.raw.payer_id)
              : null,
        },
      });

      billingCustomerId = customer.id;
    }
  } else if (providerSnapshot.raw.payer_email || providerSnapshot.raw.payer_id) {
    await prisma.billingCustomer.update({
      where: { id: billingCustomerId },
      data: {
        ...(providerSnapshot.raw.payer_email ? { email: providerSnapshot.raw.payer_email } : {}),
        ...(providerSnapshot.raw.payer_id !== undefined && providerSnapshot.raw.payer_id !== null
          ? { mercadoPagoCustomerId: String(providerSnapshot.raw.payer_id) }
          : {}),
      },
    });
  }

  const planKey = (existingSubscription?.planKey ?? parsedReference?.planKey ?? null) as
    | CreateCheckoutInput['planKey']
    | null;
  const billingCycle = (existingSubscription?.billingCycle ??
    parsedReference?.billingCycle ??
    null) as CreateCheckoutInput['billingCycle'] | null;

  const subscription = await prisma.workspaceSubscription.upsert({
    where: { workspaceId },
    update: {
      billingCustomerId: billingCustomerId ?? undefined,
      provider: 'mercado_pago',
      planKey,
      billingCycle,
      status: providerSnapshot.status,
      mercadoPagoPreapprovalId: resourceId,
      checkoutUrl: providerSnapshot.raw.init_point ?? existingSubscription?.checkoutUrl ?? null,
      externalReference:
        providerSnapshot.raw.external_reference ?? existingSubscription?.externalReference ?? null,
      currentPeriodEnd: providerSnapshot.raw.next_payment_date
        ? new Date(providerSnapshot.raw.next_payment_date)
        : (existingSubscription?.currentPeriodEnd ?? null),
      startedAt:
        providerSnapshot.status === 'active'
          ? (existingSubscription?.startedAt ??
            (providerSnapshot.raw.date_created
              ? new Date(providerSnapshot.raw.date_created)
              : new Date()))
          : (existingSubscription?.startedAt ?? null),
      canceledAt: providerSnapshot.status === 'canceled' ? new Date() : null,
      cancelAtPeriodEnd:
        providerSnapshot.status === 'canceled'
          ? true
          : (existingSubscription?.cancelAtPeriodEnd ?? false),
      lastProviderSyncAt: new Date(),
      providerMetadata: providerSnapshot.raw as unknown as Prisma.InputJsonValue,
    },
    create: {
      workspaceId,
      billingCustomerId: billingCustomerId ?? undefined,
      provider: 'mercado_pago',
      planKey,
      billingCycle,
      status: providerSnapshot.status,
      mercadoPagoPreapprovalId: resourceId,
      checkoutUrl: providerSnapshot.raw.init_point ?? null,
      externalReference: providerSnapshot.raw.external_reference ?? null,
      currentPeriodEnd: providerSnapshot.raw.next_payment_date
        ? new Date(providerSnapshot.raw.next_payment_date)
        : null,
      startedAt:
        providerSnapshot.status === 'active'
          ? providerSnapshot.raw.date_created
            ? new Date(providerSnapshot.raw.date_created)
            : new Date()
          : null,
      canceledAt: providerSnapshot.status === 'canceled' ? new Date() : null,
      cancelAtPeriodEnd: providerSnapshot.status === 'canceled',
      lastProviderSyncAt: new Date(),
      providerMetadata: providerSnapshot.raw as unknown as Prisma.InputJsonValue,
    },
  });

  if (providerSnapshot.status === 'active') {
    await prisma.trialState.updateMany({
      where: { workspaceId, status: 'active' },
      data: {
        status: 'converted',
        convertedAt: subscription.startedAt ?? new Date(),
      },
    });
  }

  await prisma.billingEvent.update({
    where: { id: billingEvent.id },
    data: {
      workspaceId,
      subscriptionId: subscription.id,
      status: 'processed',
      processedAt: new Date(),
      providerReference: resourceId,
    },
  });

  await emitAuditEvent({
    action: 'billing.subscription.synced',
    entityType: 'workspace',
    entityId: workspaceId,
    actorType: 'system',
    actorId: 'mercado-pago-webhook',
    workspaceId,
    metadata: {
      providerSubscriptionId: resourceId,
      status: providerSnapshot.status,
      planKey,
      billingCycle,
    },
  });

  return {
    eventKey,
    workspaceId,
    subscriptionId: subscription.id,
    status: providerSnapshot.status,
  };
}

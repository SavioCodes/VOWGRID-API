import type {
  BillingCycle,
  BillingInvoiceLineItemResponse,
  BillingInvoiceResponse,
  BillingPlanKey,
  BillingProrationPreviewResponse,
  SelfServeBillingPlanKey,
} from '@vowgrid/contracts';
import { PLAN_CATALOG } from '@vowgrid/contracts';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { getMercadoPagoProviderState, startMercadoPagoInvoicePayment } from './mercado-pago.js';
import { getCurrentMonthlyWindow } from './usage.js';

type InvoiceableMetric = 'intents' | 'executed_actions';
type DbClient = Prisma.TransactionClient | typeof prisma;

function toBrlCents(amount: number | null) {
  return amount === null ? null : amount * 100;
}

function getPlanUnitAmount(planKey: BillingPlanKey | null, metric: InvoiceableMetric) {
  if (!planKey) {
    return null;
  }

  const plan = PLAN_CATALOG[planKey];
  return metric === 'intents'
    ? plan.overage.intentsUnitBrlCents
    : plan.overage.executedActionsUnitBrlCents;
}

function serializeInvoiceLineItem(item: {
  id: string;
  type: string;
  metric: string | null;
  label: string;
  quantity: number;
  unitAmountBrlCents: number;
  subtotalBrlCents: number;
  createdAt: Date;
  updatedAt: Date;
}): BillingInvoiceLineItemResponse {
  return {
    id: item.id,
    type: item.type as BillingInvoiceLineItemResponse['type'],
    metric: item.metric as BillingInvoiceLineItemResponse['metric'],
    label: item.label,
    quantity: item.quantity,
    unitAmountBrlCents: item.unitAmountBrlCents,
    subtotalBrlCents: item.subtotalBrlCents,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function serializeInvoice(invoice: {
  id: string;
  status: string;
  currency: string;
  subtotalBrlCents: number;
  taxRateBps: number;
  taxAmountBrlCents: number;
  totalBrlCents: number;
  paymentUrl: string | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  dueAt: Date | null;
  issuedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lineItems: Array<{
    id: string;
    type: string;
    metric: string | null;
    label: string;
    quantity: number;
    unitAmountBrlCents: number;
    subtotalBrlCents: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}): BillingInvoiceResponse {
  return {
    id: invoice.id,
    status: invoice.status as BillingInvoiceResponse['status'],
    currency: 'BRL',
    subtotalBrlCents: invoice.subtotalBrlCents,
    taxRateBps: invoice.taxRateBps,
    taxAmountBrlCents: invoice.taxAmountBrlCents,
    totalBrlCents: invoice.totalBrlCents,
    paymentUrl: invoice.paymentUrl,
    periodStart: invoice.periodStart?.toISOString() ?? null,
    periodEnd: invoice.periodEnd?.toISOString() ?? null,
    dueAt: invoice.dueAt?.toISOString() ?? null,
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    paidAt: invoice.paidAt?.toISOString() ?? null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    lineItems: invoice.lineItems.map(serializeInvoiceLineItem),
  };
}

async function ensureOpenInvoiceForPeriod(
  db: DbClient,
  input: {
    workspaceId: string;
    subscriptionId: string | null;
    periodStart: Date;
    periodEnd: Date;
  },
) {
  const existing = await db.billingInvoice.findFirst({
    where: {
      workspaceId: input.workspaceId,
      status: 'open',
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    },
  });

  if (existing) {
    return existing;
  }

  return db.billingInvoice.create({
    data: {
      workspaceId: input.workspaceId,
      subscriptionId: input.subscriptionId ?? undefined,
      status: 'open',
      currency: 'BRL',
      taxRateBps: env.BILLING_DEFAULT_TAX_RATE_BPS,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      issuedAt: new Date(),
      dueAt: input.periodEnd,
    },
  });
}

async function syncInvoiceTotalsAndPaymentLink(invoiceId: string) {
  const invoice = await prisma.billingInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      lineItems: true,
      workspace: {
        include: {
          billingCustomer: true,
        },
      },
    },
  });

  if (!invoice) {
    return null;
  }

  const subtotal = invoice.lineItems.reduce((sum, item) => sum + item.subtotalBrlCents, 0);
  const taxAmount = subtotal > 0 ? Math.round((subtotal * invoice.taxRateBps) / 10_000) : 0;
  const total = subtotal + taxAmount;

  let paymentUrl: string | null = null;
  let preferenceId: string | null = null;

  if (
    total > 0 &&
    invoice.workspace.billingCustomer?.email &&
    getMercadoPagoProviderState().checkoutEnabled
  ) {
    const payment = await startMercadoPagoInvoicePayment({
      externalReference: `invoice:${invoice.id}:${Date.now()}`,
      payerEmail: invoice.workspace.billingCustomer.email,
      title: `VowGrid invoice ${invoice.id}`,
      items: [
        {
          title: `VowGrid invoice ${invoice.id}`,
          quantity: 1,
          unitPriceBrlCents: subtotal,
        },
      ],
      taxAmountBrlCents: taxAmount,
    });

    paymentUrl = payment.checkoutUrl;
    preferenceId = payment.preferenceId;
  }

  const updated = await prisma.billingInvoice.update({
    where: { id: invoice.id },
    data: {
      subtotalBrlCents: subtotal,
      taxAmountBrlCents: taxAmount,
      totalBrlCents: total,
      paymentUrl,
      mercadoPagoPreferenceId: preferenceId,
    },
    include: {
      lineItems: true,
    },
  });

  return serializeInvoice(updated);
}

export async function listWorkspaceInvoices(
  workspaceId: string,
): Promise<BillingInvoiceResponse[]> {
  const invoices = await prisma.billingInvoice.findMany({
    where: { workspaceId },
    include: {
      lineItems: true,
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 12,
  });

  return invoices.map(serializeInvoice);
}

export async function recordAutomaticOverageBilling(input: {
  workspaceId: string;
  subscriptionId: string | null;
  planKey: BillingPlanKey | null;
  metric: InvoiceableMetric;
  used: number;
  limit: number | null;
}) {
  if (input.limit === null || input.used <= input.limit) {
    return null;
  }

  const unitAmount = getPlanUnitAmount(input.planKey, input.metric);

  if (!unitAmount) {
    return null;
  }

  const { start, end } = getCurrentMonthlyWindow();
  const overageUnits = input.used - input.limit;
  const invoice = await prisma.$transaction(async (tx) => {
    const ensured = await ensureOpenInvoiceForPeriod(tx, {
      workspaceId: input.workspaceId,
      subscriptionId: input.subscriptionId,
      periodStart: start,
      periodEnd: end,
    });

    await tx.billingInvoiceLineItem.upsert({
      where: {
        invoiceId_type_metric: {
          invoiceId: ensured.id,
          type: 'overage',
          metric: input.metric,
        },
      },
      update: {
        label:
          input.metric === 'executed_actions'
            ? 'Executed action overage'
            : 'Intent proposal overage',
        quantity: overageUnits,
        unitAmountBrlCents: unitAmount,
        subtotalBrlCents: overageUnits * unitAmount,
      },
      create: {
        invoiceId: ensured.id,
        type: 'overage',
        metric: input.metric,
        label:
          input.metric === 'executed_actions'
            ? 'Executed action overage'
            : 'Intent proposal overage',
        quantity: overageUnits,
        unitAmountBrlCents: unitAmount,
        subtotalBrlCents: overageUnits * unitAmount,
      },
    });

    return ensured;
  });

  return syncInvoiceTotalsAndPaymentLink(invoice.id);
}

export function calculateProrationPreview(input: {
  sourcePlanKey: BillingPlanKey | null;
  sourceBillingCycle: BillingCycle | null;
  targetPlanKey: SelfServeBillingPlanKey;
  targetBillingCycle: BillingCycle;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}): BillingProrationPreviewResponse | null {
  if (
    !input.sourcePlanKey ||
    !input.sourceBillingCycle ||
    !input.currentPeriodStart ||
    !input.currentPeriodEnd
  ) {
    return null;
  }

  if (
    input.sourcePlanKey === input.targetPlanKey &&
    input.sourceBillingCycle === input.targetBillingCycle
  ) {
    return null;
  }

  const sourceAmount = toBrlCents(
    input.sourceBillingCycle === 'monthly'
      ? PLAN_CATALOG[input.sourcePlanKey].monthlyBrl
      : PLAN_CATALOG[input.sourcePlanKey].yearlyBrl,
  );
  const targetAmount = toBrlCents(
    input.targetBillingCycle === 'monthly'
      ? PLAN_CATALOG[input.targetPlanKey].monthlyBrl
      : PLAN_CATALOG[input.targetPlanKey].yearlyBrl,
  );

  if (sourceAmount === null || targetAmount === null) {
    return null;
  }

  const now = Date.now();
  const periodStartMs = input.currentPeriodStart.getTime();
  const periodEndMs = input.currentPeriodEnd.getTime();
  const periodLengthMs = Math.max(periodEndMs - periodStartMs, 1);
  const remainingMs = Math.max(periodEndMs - now, 0);
  const remainingRatio = Number((remainingMs / periodLengthMs).toFixed(4));
  const creditBrlCents = Math.round(sourceAmount * remainingRatio);
  const chargeBrlCents = Math.round(targetAmount * remainingRatio);

  return {
    sourcePlanKey: input.sourcePlanKey,
    sourceBillingCycle: input.sourceBillingCycle,
    targetPlanKey: input.targetPlanKey,
    targetBillingCycle: input.targetBillingCycle,
    remainingRatio,
    creditBrlCents,
    chargeBrlCents,
    netBrlCents: chargeBrlCents - creditBrlCents,
  };
}

export async function recordProrationBilling(input: {
  workspaceId: string;
  subscriptionId: string | null;
  preview: BillingProrationPreviewResponse | null;
}) {
  if (!input.preview) {
    return null;
  }

  const preview = input.preview;

  const { start, end } = getCurrentMonthlyWindow();
  const invoice = await prisma.$transaction(async (tx) => {
    const ensured = await ensureOpenInvoiceForPeriod(tx, {
      workspaceId: input.workspaceId,
      subscriptionId: input.subscriptionId,
      periodStart: start,
      periodEnd: end,
    });

    const existingCharge = await tx.billingInvoiceLineItem.findFirst({
      where: {
        invoiceId: ensured.id,
        type: 'proration_charge',
        metric: null,
      },
    });

    if (preview.chargeBrlCents > 0) {
      if (existingCharge) {
        await tx.billingInvoiceLineItem.update({
          where: { id: existingCharge.id },
          data: {
            label: `Proration charge: ${preview.targetPlanKey} ${preview.targetBillingCycle}`,
            quantity: 1,
            unitAmountBrlCents: preview.chargeBrlCents,
            subtotalBrlCents: preview.chargeBrlCents,
          },
        });
      } else {
        await tx.billingInvoiceLineItem.create({
          data: {
            invoiceId: ensured.id,
            type: 'proration_charge',
            label: `Proration charge: ${preview.targetPlanKey} ${preview.targetBillingCycle}`,
            quantity: 1,
            unitAmountBrlCents: preview.chargeBrlCents,
            subtotalBrlCents: preview.chargeBrlCents,
          },
        });
      }
    } else if (existingCharge) {
      await tx.billingInvoiceLineItem.delete({
        where: { id: existingCharge.id },
      });
    }

    const existingCredit = await tx.billingInvoiceLineItem.findFirst({
      where: {
        invoiceId: ensured.id,
        type: 'proration_credit',
        metric: null,
      },
    });

    if (preview.creditBrlCents > 0) {
      if (existingCredit) {
        await tx.billingInvoiceLineItem.update({
          where: { id: existingCredit.id },
          data: {
            label: `Proration credit: ${preview.sourcePlanKey} ${preview.sourceBillingCycle}`,
            quantity: 1,
            unitAmountBrlCents: -preview.creditBrlCents,
            subtotalBrlCents: -preview.creditBrlCents,
          },
        });
      } else {
        await tx.billingInvoiceLineItem.create({
          data: {
            invoiceId: ensured.id,
            type: 'proration_credit',
            label: `Proration credit: ${preview.sourcePlanKey} ${preview.sourceBillingCycle}`,
            quantity: 1,
            unitAmountBrlCents: -preview.creditBrlCents,
            subtotalBrlCents: -preview.creditBrlCents,
          },
        });
      }
    } else if (existingCredit) {
      await tx.billingInvoiceLineItem.delete({
        where: { id: existingCredit.id },
      });
    }

    return ensured;
  });

  return syncInvoiceTotalsAndPaymentLink(invoice.id);
}

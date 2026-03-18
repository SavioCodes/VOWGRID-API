import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  BillingCycle,
  BillingProviderStateResponse,
  BillingSubscriptionStatus,
  SelfServeBillingPlanKey,
} from '@vowgrid/contracts';
import { PLAN_CATALOG } from '@vowgrid/contracts';
import { env } from '../../config/env.js';
import { BillingConfigurationError, ValidationError } from '../../common/errors.js';

interface MercadoPagoPreapprovalResponse {
  id: string;
  status?: string | null;
  external_reference?: string | null;
  payer_email?: string | null;
  payer_id?: string | number | null;
  init_point?: string | null;
  sandbox_init_point?: string | null;
  auto_recurring?: {
    frequency?: number | null;
    frequency_type?: string | null;
    transaction_amount?: number | null;
    currency_id?: string | null;
  } | null;
  next_payment_date?: string | null;
  date_created?: string | null;
  last_modified?: string | null;
}

interface MercadoPagoPreferenceResponse {
  id: string;
  init_point?: string | null;
  sandbox_init_point?: string | null;
}

export interface MercadoPagoWebhookPayload {
  action?: string;
  type?: string;
  data?: { id?: string };
  id?: string | number;
  date_created?: string;
  live_mode?: boolean;
}

export interface StartMercadoPagoCheckoutInput {
  planKey: SelfServeBillingPlanKey;
  billingCycle: BillingCycle;
  externalReference: string;
  payerEmail: string;
  reason: string;
}

export interface StartMercadoPagoInvoicePaymentInput {
  externalReference: string;
  payerEmail: string;
  title: string;
  items: Array<{
    title: string;
    quantity: number;
    unitPriceBrlCents: number;
  }>;
  taxAmountBrlCents: number;
}

function getMercadoPagoApiBaseUrl() {
  return env.MERCADO_PAGO_API_BASE_URL.replace(/\/$/, '');
}

function getMercadoPagoAccessToken() {
  if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
    throw new BillingConfigurationError(
      'Mercado Pago checkout is not configured. Add MERCADO_PAGO_ACCESS_TOKEN to enable self-serve billing.',
    );
  }

  return env.MERCADO_PAGO_ACCESS_TOKEN;
}

async function mercadoPagoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getMercadoPagoApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const json = (await response.json().catch(() => ({}))) as {
    message?: string;
    error?: string;
    cause?: unknown;
  };

  if (!response.ok) {
    throw new ValidationError(
      json.message ?? json.error ?? `Mercado Pago request to ${path} failed.`,
      json.cause,
    );
  }

  return json as T;
}

export function getMercadoPagoProviderState(): BillingProviderStateResponse {
  const manualSetupRequired: string[] = [];

  if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
    manualSetupRequired.push('Set MERCADO_PAGO_ACCESS_TOKEN in apps/api/.env.');
  }

  if (!env.MERCADO_PAGO_WEBHOOK_SECRET) {
    manualSetupRequired.push(
      'Configure MERCADO_PAGO_WEBHOOK_SECRET after enabling webhook signatures.',
    );
  }

  if (!env.MERCADO_PAGO_WEBHOOK_URL) {
    manualSetupRequired.push(
      'Set MERCADO_PAGO_WEBHOOK_URL to your public /v1/billing/webhooks/mercado-pago endpoint.',
    );
  }

  if (!env.MERCADO_PAGO_RETURN_URL) {
    manualSetupRequired.push(
      'Set MERCADO_PAGO_RETURN_URL so Mercado Pago can return users to the VowGrid billing surface.',
    );
  }

  return {
    name: 'mercado_pago',
    configured: Boolean(env.MERCADO_PAGO_ACCESS_TOKEN),
    checkoutEnabled: Boolean(env.MERCADO_PAGO_ACCESS_TOKEN && env.MERCADO_PAGO_RETURN_URL),
    manualSetupRequired,
  };
}

export function mapMercadoPagoStatus(status?: string | null): BillingSubscriptionStatus {
  switch ((status ?? '').toLowerCase()) {
    case 'authorized':
      return 'active';
    case 'paused':
      return 'paused';
    case 'cancelled':
    case 'canceled':
      return 'canceled';
    case 'pending':
      return 'incomplete';
    case 'rejected':
      return 'past_due';
    default:
      return status ? 'past_due' : 'incomplete';
  }
}

export async function startMercadoPagoCheckout(input: StartMercadoPagoCheckoutInput) {
  const plan = PLAN_CATALOG[input.planKey];
  const amount = input.billingCycle === 'monthly' ? plan.monthlyBrl : plan.yearlyBrl;

  if (amount === null) {
    throw new ValidationError('The selected plan is not available for self-serve checkout.');
  }

  const payload = {
    reason: input.reason,
    external_reference: input.externalReference,
    payer_email: input.payerEmail,
    back_url: env.MERCADO_PAGO_RETURN_URL,
    status: 'pending',
    auto_recurring: {
      frequency: input.billingCycle === 'monthly' ? 1 : 12,
      frequency_type: 'months',
      transaction_amount: amount,
      currency_id: 'BRL',
    },
    ...(env.MERCADO_PAGO_WEBHOOK_URL ? { notification_url: env.MERCADO_PAGO_WEBHOOK_URL } : {}),
  };

  const subscription = await mercadoPagoRequest<MercadoPagoPreapprovalResponse>('/preapproval', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const checkoutUrl = subscription.init_point ?? subscription.sandbox_init_point;

  if (!checkoutUrl) {
    throw new ValidationError('Mercado Pago did not return a checkout URL for the subscription.');
  }

  return {
    providerSubscriptionId: subscription.id,
    status: mapMercadoPagoStatus(subscription.status),
    checkoutUrl,
    providerPayload: subscription,
  };
}

export async function startMercadoPagoInvoicePayment(input: StartMercadoPagoInvoicePaymentInput) {
  const items = input.items
    .filter((item) => item.quantity > 0 && item.unitPriceBrlCents > 0)
    .map((item) => ({
      title: item.title,
      quantity: item.quantity,
      currency_id: 'BRL',
      unit_price: Number((item.unitPriceBrlCents / 100).toFixed(2)),
    }));

  if (input.taxAmountBrlCents > 0) {
    items.push({
      title: 'Tax',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number((input.taxAmountBrlCents / 100).toFixed(2)),
    });
  }

  if (items.length === 0) {
    throw new ValidationError('Mercado Pago invoice checkout requires at least one billable item.');
  }

  const preference = await mercadoPagoRequest<MercadoPagoPreferenceResponse>(
    '/checkout/preferences',
    {
      method: 'POST',
      body: JSON.stringify({
        external_reference: input.externalReference,
        payer: {
          email: input.payerEmail,
        },
        items,
        back_urls: env.MERCADO_PAGO_RETURN_URL
          ? {
              success: env.MERCADO_PAGO_RETURN_URL,
              pending: env.MERCADO_PAGO_RETURN_URL,
              failure: env.MERCADO_PAGO_RETURN_URL,
            }
          : undefined,
      }),
    },
  );

  const checkoutUrl = preference.init_point ?? preference.sandbox_init_point;

  if (!checkoutUrl) {
    throw new ValidationError('Mercado Pago did not return a checkout URL for the invoice.');
  }

  return {
    preferenceId: preference.id,
    checkoutUrl,
  };
}

export async function getMercadoPagoSubscription(providerSubscriptionId: string) {
  const subscription = await mercadoPagoRequest<MercadoPagoPreapprovalResponse>(
    `/preapproval/${providerSubscriptionId}`,
  );

  return {
    raw: subscription,
    status: mapMercadoPagoStatus(subscription.status),
  };
}

export async function cancelMercadoPagoSubscription(providerSubscriptionId: string) {
  const subscription = await mercadoPagoRequest<MercadoPagoPreapprovalResponse>(
    `/preapproval/${providerSubscriptionId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ status: 'cancelled' }),
    },
  );

  return {
    raw: subscription,
    status: mapMercadoPagoStatus(subscription.status),
  };
}

function parseSignatureHeader(headerValue?: string) {
  if (!headerValue) {
    return null;
  }

  const parts = headerValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, current) => {
      const [key, value] = current.split('=');
      if (key && value) {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});

  if (!parts.ts || !parts.v1) {
    return null;
  }

  return parts as { ts: string; v1: string };
}

export function buildMercadoPagoWebhookManifest({
  resourceId,
  requestId,
  timestamp,
}: {
  resourceId: string;
  requestId: string;
  timestamp: string;
}) {
  return `id:${resourceId};request-id:${requestId};ts:${timestamp};`;
}

export function signMercadoPagoWebhookManifest(secret: string, manifest: string) {
  return createHmac('sha256', secret).update(manifest).digest('hex');
}

export function validateMercadoPagoWebhookSignature({
  resourceId,
  signatureHeader,
  requestId,
}: {
  resourceId: string;
  signatureHeader?: string;
  requestId?: string;
}) {
  if (!env.MERCADO_PAGO_WEBHOOK_SECRET) {
    return env.NODE_ENV !== 'production';
  }

  const parsed = parseSignatureHeader(signatureHeader);

  if (!parsed || !requestId) {
    return false;
  }

  const manifest = buildMercadoPagoWebhookManifest({
    resourceId,
    requestId,
    timestamp: parsed.ts,
  });

  const expected = signMercadoPagoWebhookManifest(env.MERCADO_PAGO_WEBHOOK_SECRET, manifest);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(parsed.v1);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

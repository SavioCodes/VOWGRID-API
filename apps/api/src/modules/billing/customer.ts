import type {
  ApplyBillingCouponInput,
  BillingCouponResponse,
  BillingCustomerResponse,
  BillingTaxProfileResponse,
  UpdateBillingCustomerInput,
} from '@vowgrid/contracts';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ValidationError } from '../../common/errors.js';
import { env } from '../../config/env.js';

type BillingCouponDefinition = {
  code: string;
  label: string;
  kind: 'percent' | 'fixed_amount';
  percentOffBps?: number | null;
  amountOffBrlCents?: number | null;
};

type BillingCustomerMetadata = {
  taxProfile?: BillingTaxProfileResponse | null;
  activeCoupon?: BillingCouponResponse | null;
};

function toCustomerMetadataJson(metadata: BillingCustomerMetadata): Prisma.InputJsonValue {
  return metadata as unknown as Prisma.InputJsonValue;
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function parseBillingCustomerMetadata(value: unknown): BillingCustomerMetadata {
  const record = asRecord(value);
  const taxProfileRecord = asRecord(record.taxProfile);
  const couponRecord = asRecord(record.activeCoupon);

  return {
    taxProfile:
      Object.keys(taxProfileRecord).length > 0
        ? {
            countryCode:
              typeof taxProfileRecord.countryCode === 'string'
                ? taxProfileRecord.countryCode
                : null,
            regionCode:
              typeof taxProfileRecord.regionCode === 'string' ? taxProfileRecord.regionCode : null,
            documentType:
              taxProfileRecord.documentType === 'cpf' ||
              taxProfileRecord.documentType === 'cnpj' ||
              taxProfileRecord.documentType === 'vat' ||
              taxProfileRecord.documentType === 'other'
                ? taxProfileRecord.documentType
                : null,
            documentNumber:
              typeof taxProfileRecord.documentNumber === 'string'
                ? taxProfileRecord.documentNumber
                : null,
            taxExempt: taxProfileRecord.taxExempt === true,
            taxRateBpsOverride:
              typeof taxProfileRecord.taxRateBpsOverride === 'number'
                ? taxProfileRecord.taxRateBpsOverride
                : null,
          }
        : null,
    activeCoupon:
      typeof couponRecord.code === 'string' &&
      typeof couponRecord.label === 'string' &&
      (couponRecord.kind === 'percent' || couponRecord.kind === 'fixed_amount')
        ? {
            code: couponRecord.code,
            label: couponRecord.label,
            kind: couponRecord.kind,
            percentOffBps:
              typeof couponRecord.percentOffBps === 'number' ? couponRecord.percentOffBps : null,
            amountOffBrlCents:
              typeof couponRecord.amountOffBrlCents === 'number'
                ? couponRecord.amountOffBrlCents
                : null,
          }
        : null,
  };
}

export function serializeBillingCustomer(input: {
  id: string;
  workspaceId: string;
  email: string;
  legalName: string | null;
  mercadoPagoCustomerId: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}): BillingCustomerResponse {
  const metadata = parseBillingCustomerMetadata(input.metadata);

  return {
    id: input.id,
    workspaceId: input.workspaceId,
    email: input.email,
    legalName: input.legalName,
    providerCustomerId: input.mercadoPagoCustomerId,
    taxProfile: metadata.taxProfile ?? null,
    createdAt: input.createdAt.toISOString(),
    updatedAt: input.updatedAt.toISOString(),
  };
}

function getCouponCatalog(): BillingCouponDefinition[] {
  if (!env.BILLING_COUPON_CATALOG_JSON) {
    return [];
  }

  try {
    const parsed = JSON.parse(env.BILLING_COUPON_CATALOG_JSON) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => asRecord(entry))
      .filter(
        (entry): entry is Record<string, unknown> =>
          typeof entry.code === 'string' &&
          typeof entry.label === 'string' &&
          (entry.kind === 'percent' || entry.kind === 'fixed_amount'),
      )
      .map((entry) => ({
        code: String(entry.code).trim().toUpperCase(),
        label: String(entry.label).trim(),
        kind: entry.kind as 'percent' | 'fixed_amount',
        percentOffBps: typeof entry.percentOffBps === 'number' ? entry.percentOffBps : null,
        amountOffBrlCents:
          typeof entry.amountOffBrlCents === 'number' ? entry.amountOffBrlCents : null,
      }));
  } catch {
    return [];
  }
}

export function resolveCoupon(code: string): BillingCouponResponse | null {
  const normalized = code.trim().toUpperCase();
  const coupon = getCouponCatalog().find((entry) => entry.code === normalized);

  if (!coupon) {
    return null;
  }

  return {
    code: coupon.code,
    label: coupon.label,
    kind: coupon.kind,
    percentOffBps: coupon.percentOffBps ?? null,
    amountOffBrlCents: coupon.amountOffBrlCents ?? null,
  };
}

export function resolveBillingTaxRateBps(
  customer: {
    metadata: unknown;
  } | null,
): number {
  const metadata = parseBillingCustomerMetadata(customer?.metadata);
  const profile = metadata.taxProfile;

  if (!profile) {
    return env.BILLING_DEFAULT_TAX_RATE_BPS;
  }

  if (profile.taxExempt) {
    return 0;
  }

  if (profile.taxRateBpsOverride !== null) {
    return profile.taxRateBpsOverride;
  }

  if (profile.countryCode?.toUpperCase() === 'BR') {
    if (profile.documentType === 'cpf') {
      return env.BILLING_BR_CPF_TAX_RATE_BPS;
    }

    if (profile.documentType === 'cnpj') {
      return env.BILLING_BR_CNPJ_TAX_RATE_BPS;
    }
  }

  return env.BILLING_DEFAULT_TAX_RATE_BPS;
}

export function calculateCouponDiscountBrlCents(
  coupon: BillingCouponResponse | null,
  amountBrlCents: number,
) {
  if (!coupon || amountBrlCents <= 0) {
    return 0;
  }

  if (coupon.kind === 'fixed_amount') {
    return Math.min(coupon.amountOffBrlCents ?? 0, amountBrlCents);
  }

  return Math.min(
    Math.round((amountBrlCents * (coupon.percentOffBps ?? 0)) / 10_000),
    amountBrlCents,
  );
}

export async function updateWorkspaceBillingCustomer(
  workspaceId: string,
  input: UpdateBillingCustomerInput,
) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: {
      billingCustomer: true,
      users: {
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  const existingMetadata = parseBillingCustomerMetadata(workspace.billingCustomer?.metadata);
  const fallbackEmail = workspace.billingCustomer?.email ?? workspace.users[0]?.email;

  if (!fallbackEmail) {
    throw new ValidationError(
      'A workspace user email is required before the billing customer can be updated.',
    );
  }

  const customer = await prisma.billingCustomer.upsert({
    where: {
      workspaceId,
    },
    update: {
      legalName: input.legalName?.trim() ?? workspace.billingCustomer?.legalName ?? workspace.name,
      metadata: toCustomerMetadataJson({
        taxProfile: {
          countryCode:
            input.countryCode?.trim().toUpperCase() ??
            existingMetadata.taxProfile?.countryCode ??
            null,
          regionCode:
            input.regionCode?.trim().toUpperCase() ??
            existingMetadata.taxProfile?.regionCode ??
            null,
          documentType: input.documentType ?? existingMetadata.taxProfile?.documentType ?? null,
          documentNumber:
            input.documentNumber?.trim() ?? existingMetadata.taxProfile?.documentNumber ?? null,
          taxExempt: input.taxExempt ?? existingMetadata.taxProfile?.taxExempt ?? false,
          taxRateBpsOverride:
            input.taxRateBpsOverride !== undefined
              ? input.taxRateBpsOverride
              : (existingMetadata.taxProfile?.taxRateBpsOverride ?? null),
        },
        activeCoupon: existingMetadata.activeCoupon ?? null,
      }),
    },
    create: {
      workspaceId,
      email: fallbackEmail,
      legalName: input.legalName?.trim() ?? workspace.name,
      metadata: toCustomerMetadataJson({
        taxProfile: {
          countryCode: input.countryCode?.trim().toUpperCase() ?? null,
          regionCode: input.regionCode?.trim().toUpperCase() ?? null,
          documentType: input.documentType ?? null,
          documentNumber: input.documentNumber?.trim() ?? null,
          taxExempt: input.taxExempt ?? false,
          taxRateBpsOverride: input.taxRateBpsOverride ?? null,
        },
        activeCoupon: existingMetadata.activeCoupon ?? null,
      }),
    },
  });

  return serializeBillingCustomer(customer);
}

export async function applyWorkspaceCoupon(workspaceId: string, input: ApplyBillingCouponInput) {
  const coupon = resolveCoupon(input.code);

  if (!coupon) {
    throw new ValidationError('Coupon code is invalid or unavailable.');
  }

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: {
      billingCustomer: true,
      users: {
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  const existingMetadata = parseBillingCustomerMetadata(workspace.billingCustomer?.metadata);
  const fallbackEmail = workspace.billingCustomer?.email ?? workspace.users[0]?.email;

  if (!fallbackEmail) {
    throw new ValidationError(
      'A workspace user email is required before a billing coupon can be stored.',
    );
  }

  const customer = await prisma.billingCustomer.upsert({
    where: {
      workspaceId,
    },
    update: {
      metadata: toCustomerMetadataJson({
        taxProfile: existingMetadata.taxProfile ?? null,
        activeCoupon: coupon,
      }),
    },
    create: {
      workspaceId,
      email: fallbackEmail,
      legalName: workspace.name,
      metadata: toCustomerMetadataJson({
        taxProfile: existingMetadata.taxProfile ?? null,
        activeCoupon: coupon,
      }),
    },
  });

  return {
    customer: serializeBillingCustomer(customer),
    activeCoupon: coupon,
  };
}

export async function clearWorkspaceCoupon(workspaceId: string) {
  const customer = await prisma.billingCustomer.findUnique({
    where: {
      workspaceId,
    },
  });

  if (!customer) {
    return {
      customer: null,
      activeCoupon: null,
    };
  }

  const metadata = parseBillingCustomerMetadata(customer.metadata);
  const updated = await prisma.billingCustomer.update({
    where: {
      id: customer.id,
    },
    data: {
      metadata: toCustomerMetadataJson({
        taxProfile: metadata.taxProfile ?? null,
        activeCoupon: null,
      }),
    },
  });

  return {
    customer: serializeBillingCustomer(updated),
    activeCoupon: null,
  };
}

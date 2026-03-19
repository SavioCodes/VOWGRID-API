'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cancelSubscriptionSchema, createCheckoutSchema } from '@vowgrid/contracts';
import { assertValidCsrfToken } from '@/lib/vowgrid/csrf';
import {
  applyBillingCoupon,
  cancelWorkspaceSubscription,
  clearBillingCoupon,
  startWorkspaceCheckout,
  updateBillingCustomerProfile,
} from '@/lib/vowgrid/repository';

export async function startCheckoutAction(formData: FormData) {
  await assertValidCsrfToken(formData);

  const parsed = createCheckoutSchema.safeParse({
    planKey: formData.get('planKey'),
    billingCycle: formData.get('billingCycle'),
  });

  if (!parsed.success) {
    throw new Error('Invalid checkout request.');
  }

  const checkout = await startWorkspaceCheckout(parsed.data);
  revalidatePath('/app/billing');
  redirect(checkout.checkoutUrl);
}

export async function cancelSubscriptionAction(formData: FormData) {
  await assertValidCsrfToken(formData);

  const parsed = cancelSubscriptionSchema.safeParse({
    immediate: formData.get('immediate') === 'true',
  });

  if (!parsed.success) {
    throw new Error('Invalid cancellation request.');
  }

  await cancelWorkspaceSubscription(parsed.data);
  revalidatePath('/app/billing');
}

export interface BillingActionResult {
  ok: boolean;
  message: string;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function getOptionalString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value === '' ? undefined : value;
}

export async function updateBillingCustomerAction(
  formData: FormData,
): Promise<BillingActionResult> {
  try {
    await assertValidCsrfToken(formData);
    const documentType = getOptionalString(formData, 'documentType');
    const taxRateOverride = getOptionalString(formData, 'taxRateBpsOverride');

    if (taxRateOverride !== undefined && Number.isNaN(Number(taxRateOverride))) {
      return {
        ok: false,
        message: 'Tax rate override must be a valid number of basis points.',
      };
    }

    await updateBillingCustomerProfile({
      legalName: getOptionalString(formData, 'legalName'),
      countryCode: getOptionalString(formData, 'countryCode'),
      regionCode: getOptionalString(formData, 'regionCode'),
      documentType:
        documentType === 'cpf' ||
        documentType === 'cnpj' ||
        documentType === 'vat' ||
        documentType === 'other'
          ? documentType
          : undefined,
      documentNumber: getOptionalString(formData, 'documentNumber'),
      taxExempt: formData.get('taxExempt') === 'on',
      taxRateBpsOverride: taxRateOverride === undefined ? undefined : Number(taxRateOverride),
    });

    revalidatePath('/app/billing');
    return {
      ok: true,
      message: 'Billing customer profile updated successfully.',
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : 'Failed to update billing customer profile.',
    };
  }
}

export async function applyBillingCouponAction(formData: FormData): Promise<BillingActionResult> {
  try {
    await assertValidCsrfToken(formData);
    const code = getString(formData, 'code');

    if (!code) {
      return {
        ok: false,
        message: 'Provide a coupon code first.',
      };
    }

    await applyBillingCoupon({ code });
    revalidatePath('/app/billing');
    return {
      ok: true,
      message: `Coupon ${code.toUpperCase()} applied successfully.`,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to apply coupon.',
    };
  }
}

export async function clearBillingCouponAction(csrfToken: string): Promise<BillingActionResult> {
  try {
    await assertValidCsrfToken(csrfToken);
    await clearBillingCoupon();
    revalidatePath('/app/billing');
    return {
      ok: true,
      message: 'Active coupon cleared successfully.',
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Failed to clear coupon.',
    };
  }
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cancelSubscriptionSchema, createCheckoutSchema } from '@vowgrid/contracts';
import { cancelWorkspaceSubscription, startWorkspaceCheckout } from '@/lib/vowgrid/repository';

export async function startCheckoutAction(formData: FormData) {
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
  const parsed = cancelSubscriptionSchema.safeParse({
    immediate: formData.get('immediate') === 'true',
  });

  if (!parsed.success) {
    throw new Error('Invalid cancellation request.');
  }

  await cancelWorkspaceSubscription(parsed.data);
  revalidatePath('/app/billing');
}

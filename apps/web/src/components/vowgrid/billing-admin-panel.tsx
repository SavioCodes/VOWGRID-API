'use client';

import { useRef, useState, useTransition } from 'react';
import { Badge, Button, Card, CardContent, Input, Select } from '@vowgrid/ui';
import type { BillingAccountResponse } from '@vowgrid/contracts';
import { useRouter } from 'next/navigation';
import {
  applyBillingCouponAction,
  clearBillingCouponAction,
  type BillingActionResult,
  updateBillingCustomerAction,
} from '@/app/(app)/app/billing/actions';
import { CsrfTokenField } from '@/components/security/csrf-token-field';
import { useCsrfToken } from '@/components/security/csrf-provider';

export function BillingAdminPanel({ account }: { account: BillingAccountResponse }) {
  const router = useRouter();
  const csrfToken = useCsrfToken();
  const profileFormRef = useRef<HTMLFormElement>(null);
  const couponFormRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BillingActionResult | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const profile = account.customer?.taxProfile;

  const handleProfileSubmit = async (formData: FormData) => {
    setActiveAction('profile');
    const next = await updateBillingCustomerAction(formData);
    setResult(next);
    setActiveAction(null);

    if (next.ok) {
      router.refresh();
    }
  };

  const handleCouponSubmit = async (formData: FormData) => {
    setActiveAction('coupon');
    const next = await applyBillingCouponAction(formData);
    setResult(next);
    setActiveAction(null);

    if (next.ok) {
      couponFormRef.current?.reset();
      router.refresh();
    }
  };

  const handleCouponClear = () => {
    startTransition(async () => {
      setActiveAction('clear-coupon');
      const next = await clearBillingCouponAction(csrfToken);
      setResult(next);
      setActiveAction(null);

      if (next.ok) {
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
              Billing identity
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              Customer and tax profile
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)]">
              Keep the legal entity, region, and tax posture explicit so checkout math and invoice
              totals are explainable instead of buried inside provider metadata.
            </p>
          </div>

          {result ? (
            <div
              className={`rounded-[22px] border p-4 text-sm leading-6 ${
                result.ok
                  ? 'border-[rgba(46,211,183,0.28)] bg-[rgba(46,211,183,0.08)] text-[var(--color-text-primary)]'
                  : 'border-[rgba(245,89,89,0.28)] bg-[rgba(245,89,89,0.08)] text-[var(--color-text-primary)]'
              }`}
            >
              {result.message}
            </div>
          ) : null}

          <div className="rounded-[20px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--color-text-dim)]">
              Billing contact email
            </p>
            <p className="mt-2 text-sm text-[var(--color-text-primary)]">
              {account.customer?.email ?? 'No billing contact email resolved yet'}
            </p>
          </div>

          <form
            ref={profileFormRef}
            action={(formData) => {
              startTransition(async () => {
                await handleProfileSubmit(formData);
              });
            }}
            className="grid gap-3 md:grid-cols-2"
          >
            <CsrfTokenField />
            <Input
              name="legalName"
              placeholder="VowGrid Labs Ltda"
              defaultValue={account.customer?.legalName ?? ''}
            />
            <Input
              name="countryCode"
              placeholder="BR"
              maxLength={2}
              defaultValue={profile?.countryCode ?? ''}
            />
            <Input name="regionCode" placeholder="SP" defaultValue={profile?.regionCode ?? ''} />
            <Select name="documentType" defaultValue={profile?.documentType ?? ''}>
              <option value="">Select document type</option>
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="vat">VAT</option>
              <option value="other">Other</option>
            </Select>
            <Input
              name="documentNumber"
              placeholder="00.000.000/0001-00"
              defaultValue={profile?.documentNumber ?? ''}
            />
            <Input
              name="taxRateBpsOverride"
              type="number"
              min={0}
              max={10000}
              step={1}
              placeholder="Optional basis points override"
              defaultValue={profile?.taxRateBpsOverride ?? ''}
            />
            <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[rgba(9,14,28,0.9)] px-4 text-sm text-[var(--color-text-primary)] md:col-span-2">
              <input
                name="taxExempt"
                type="checkbox"
                defaultChecked={profile?.taxExempt ?? false}
                className="h-4 w-4 rounded border-[var(--color-border)] bg-transparent"
              />
              Tax exempt customer
            </label>
            <div className="md:col-span-2">
              <Button type="submit" block disabled={pending && activeAction === 'profile'}>
                {pending && activeAction === 'profile'
                  ? 'Saving billing profile...'
                  : 'Save billing profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-accent-soft)]">
              Commercial controls
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--color-text-primary)]">
              Coupons and invoice posture
            </h2>
            <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
              Coupons now change checkout amounts, overage invoices, and future proration math from
              the backend billing truth.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge tone={account.activeCoupon ? 'mint' : 'neutral'}>
              {account.activeCoupon ? `Coupon: ${account.activeCoupon.code}` : 'No active coupon'}
            </Badge>
            <Badge tone="neutral">
              Tax rate: {(account.entitlements.taxRateBps / 100).toFixed(2)}%
            </Badge>
          </div>

          {account.activeCoupon ? (
            <div className="rounded-[20px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
              <p className="font-medium text-[var(--color-text-primary)]">
                {account.activeCoupon.label}
              </p>
              <p>
                {account.activeCoupon.kind === 'percent'
                  ? `${((account.activeCoupon.percentOffBps ?? 0) / 100).toFixed(2)}% off`
                  : `${(account.activeCoupon.amountOffBrlCents ?? 0) / 100} BRL off`}
              </p>
            </div>
          ) : null}

          <form
            ref={couponFormRef}
            action={(formData) => {
              startTransition(async () => {
                await handleCouponSubmit(formData);
              });
            }}
            className="grid gap-3 md:grid-cols-[1fr_auto]"
          >
            <CsrfTokenField />
            <Input name="code" placeholder="LAUNCH10" />
            <Button type="submit" block disabled={pending && activeAction === 'coupon'}>
              {pending && activeAction === 'coupon' ? 'Applying...' : 'Apply coupon'}
            </Button>
          </form>

          <Button
            tone="ghost"
            block
            disabled={
              !csrfToken || !account.activeCoupon || (pending && activeAction === 'clear-coupon')
            }
            onClick={handleCouponClear}
          >
            {pending && activeAction === 'clear-coupon' ? 'Clearing...' : 'Clear active coupon'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

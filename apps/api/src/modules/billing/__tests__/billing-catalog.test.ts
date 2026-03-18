import { describe, expect, it } from 'vitest';
import { PLAN_CATALOG, TRIAL_EFFECTIVE_PLAN_KEY } from '@vowgrid/contracts';
import {
  mapMercadoPagoStatus,
  buildMercadoPagoWebhookManifest,
  signMercadoPagoWebhookManifest,
} from '../mercado-pago.js';

describe('Billing catalog', () => {
  it('keeps the launch pricing model aligned with launch monetization', () => {
    expect(PLAN_CATALOG.launch.monthlyBrl).toBe(79);
    expect(PLAN_CATALOG.launch.yearlyBrl).toBe(790);
    expect(PLAN_CATALOG.launch.limits.executedActionsPerMonth).toBe(300);
    expect(PLAN_CATALOG.launch.features.approvalsMode).toBe('basic');
  });

  it('keeps the pro pricing model aligned with launch monetization', () => {
    expect(PLAN_CATALOG.pro.monthlyBrl).toBe(249);
    expect(PLAN_CATALOG.pro.yearlyBrl).toBe(2490);
    expect(PLAN_CATALOG.pro.limits.intentsPerMonth).toBe(15000);
    expect(PLAN_CATALOG.pro.features.advancedPolicies).toBe(true);
  });

  it('keeps the business pricing model aligned with launch monetization', () => {
    expect(PLAN_CATALOG.business.monthlyBrl).toBe(799);
    expect(PLAN_CATALOG.business.yearlyBrl).toBe(7990);
    expect(PLAN_CATALOG.business.limits.executedActionsPerMonth).toBe(20000);
    expect(PLAN_CATALOG.business.features.supportTier).toBe('priority');
  });

  it('keeps enterprise as contact sales only', () => {
    expect(PLAN_CATALOG.enterprise.selfServeCheckout).toBe(false);
    expect(PLAN_CATALOG.enterprise.displayText).toBe('Sob consulta');
    expect(PLAN_CATALOG.enterprise.suggestedStartingTicketBrl).toBe(1990);
  });

  it('uses the pro plan as the effective trial entitlement profile', () => {
    expect(TRIAL_EFFECTIVE_PLAN_KEY).toBe('pro');
  });
});

describe('Mercado Pago billing helpers', () => {
  it('maps provider statuses into internal subscription statuses', () => {
    expect(mapMercadoPagoStatus('authorized')).toBe('active');
    expect(mapMercadoPagoStatus('pending')).toBe('incomplete');
    expect(mapMercadoPagoStatus('paused')).toBe('paused');
    expect(mapMercadoPagoStatus('cancelled')).toBe('canceled');
    expect(mapMercadoPagoStatus('rejected')).toBe('past_due');
  });

  it('builds the webhook manifest in the expected format', () => {
    expect(
      buildMercadoPagoWebhookManifest({
        resourceId: '123456',
        requestId: 'req-abc',
        timestamp: '1710000000',
      }),
    ).toBe('id:123456;request-id:req-abc;ts:1710000000;');
  });

  it('signs the webhook manifest deterministically', () => {
    const manifest = buildMercadoPagoWebhookManifest({
      resourceId: '123456',
      requestId: 'req-abc',
      timestamp: '1710000000',
    });

    expect(signMercadoPagoWebhookManifest('secret-123', manifest)).toBe(
      signMercadoPagoWebhookManifest('secret-123', manifest),
    );
  });
});

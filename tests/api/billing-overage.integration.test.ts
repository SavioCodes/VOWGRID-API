import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildServer } from '../../apps/api/src/server.js';
import { prisma } from '../../apps/api/src/lib/prisma.js';

describe('automatic overage billing integration', () => {
  const createdWorkspaceIds: string[] = [];
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    await prisma.$connect();
    app = await buildServer();
  });

  afterAll(async () => {
    if (createdWorkspaceIds.length > 0) {
      await prisma.workspace.deleteMany({
        where: {
          id: {
            in: createdWorkspaceIds,
          },
        },
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('creates an overage invoice instead of blocking a paid workspace at the included intent limit', async () => {
    const uniqueId = Date.now().toString();
    const signup = await app.inject({
      method: 'POST',
      url: '/v1/auth/signup',
      payload: {
        workspaceName: `Overage Workspace ${uniqueId}`,
        name: 'Billing Owner',
        email: `billing-owner-${uniqueId}@vowgrid.local`,
        password: 'owner_password_123',
      },
    });

    expect(signup.statusCode).toBe(201);
    const body = signup.json().data;
    const workspaceId = body.workspace.id as string;
    const ownerToken = body.session.token as string;
    createdWorkspaceIds.push(workspaceId);

    const agent = await prisma.agent.create({
      data: {
        workspaceId,
        name: 'Billing Agent',
        type: 'internal',
      },
    });

    const now = new Date();
    const nextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
    );
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

    await prisma.workspaceSubscription.create({
      data: {
        workspaceId,
        provider: 'mercado_pago',
        planKey: 'launch',
        billingCycle: 'monthly',
        status: 'active',
        currentPeriodStart: monthStart,
        currentPeriodEnd: nextMonth,
        startedAt: now,
      },
    });

    await prisma.trialState.update({
      where: { workspaceId },
      data: {
        status: 'converted',
        convertedAt: now,
      },
    });

    await prisma.usageCounter.upsert({
      where: {
        workspaceId_metric_periodStart: {
          workspaceId,
          metric: 'intents',
          periodStart: monthStart,
        },
      },
      update: {
        count: 1999,
      },
      create: {
        workspaceId,
        metric: 'intents',
        periodStart: monthStart,
        periodEnd: nextMonth,
        count: 1999,
      },
    });

    const atLimit = await app.inject({
      method: 'POST',
      url: '/v1/intents',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        title: 'Included intent',
        action: 'notify_ops',
        agentId: agent.id,
        environment: 'production',
      },
    });

    expect(atLimit.statusCode).toBe(201);

    const overLimit = await app.inject({
      method: 'POST',
      url: '/v1/intents',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
      payload: {
        title: 'Overage intent',
        action: 'notify_ops',
        agentId: agent.id,
        environment: 'production',
      },
    });

    expect(overLimit.statusCode).toBe(201);

    const account = await app.inject({
      method: 'GET',
      url: '/v1/billing/account',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(account.statusCode).toBe(200);
    const billingAccount = account.json().data;
    const intentsMetric = billingAccount.usage.metrics.find(
      (metric: { key: string }) => metric.key === 'intents',
    );

    expect(intentsMetric.status).toBe('overage');
    expect(intentsMetric.overageUnits).toBe(1);
    expect(billingAccount.invoices.length).toBeGreaterThan(0);
    expect(
      billingAccount.invoices[0].lineItems.some(
        (item: { type: string; metric: string | null }) =>
          item.type === 'overage' && item.metric === 'intents',
      ),
    ).toBe(true);
  });
});

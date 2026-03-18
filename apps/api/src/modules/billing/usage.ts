import type { UsageMetricKey, UsageMetricResponse } from '@vowgrid/contracts';
import { prisma } from '../../lib/prisma.js';
import { DEFAULT_WARNING_RATIO, MONTHLY_USAGE_METRICS, USAGE_METRIC_META } from './catalog.js';

type MonthlyUsageMetricKey = (typeof MONTHLY_USAGE_METRICS)[number];

export function getCurrentMonthlyWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return { start, end };
}

export async function getMonthlyUsageCounter(workspaceId: string, metric: MonthlyUsageMetricKey) {
  const { start, end } = getCurrentMonthlyWindow();
  return prisma.usageCounter.upsert({
    where: {
      workspaceId_metric_periodStart: {
        workspaceId,
        metric,
        periodStart: start,
      },
    },
    update: {},
    create: {
      workspaceId,
      metric,
      periodStart: start,
      periodEnd: end,
    },
  });
}

export async function incrementMonthlyUsageCounter(
  workspaceId: string,
  metric: MonthlyUsageMetricKey,
  amount = 1,
  limit: number | null = null,
) {
  const { start, end } = getCurrentMonthlyWindow();
  const now = new Date();

  const counter = await prisma.usageCounter.upsert({
    where: {
      workspaceId_metric_periodStart: {
        workspaceId,
        metric,
        periodStart: start,
      },
    },
    update: {
      count: { increment: amount },
      lastIncrementAt: now,
    },
    create: {
      workspaceId,
      metric,
      periodStart: start,
      periodEnd: end,
      count: amount,
      lastIncrementAt: now,
    },
  });

  const nextData: {
    warningTriggeredAt?: Date;
    limitReachedAt?: Date;
  } = {};

  if (
    limit !== null &&
    counter.count >= Math.ceil(limit * DEFAULT_WARNING_RATIO) &&
    !counter.warningTriggeredAt
  ) {
    nextData.warningTriggeredAt = now;
  }

  if (limit !== null && counter.count >= limit && !counter.limitReachedAt) {
    nextData.limitReachedAt = now;
  }

  if (Object.keys(nextData).length === 0) {
    return counter;
  }

  return prisma.usageCounter.update({
    where: { id: counter.id },
    data: nextData,
  });
}

export async function getCurrentUsageMetrics(
  workspaceId: string,
  limits: {
    workspaces: number | null;
    internalUsers: number | null;
    activeConnectors: number | null;
    intentsPerMonth: number | null;
    executedActionsPerMonth: number | null;
  },
): Promise<UsageMetricResponse[]> {
  const [usersCount, connectorsCount, intentCounter, executionCounter] = await Promise.all([
    prisma.user.count({ where: { workspaceId } }),
    prisma.connector.count({ where: { workspaceId, enabled: true } }),
    getMonthlyUsageCounter(workspaceId, 'intents'),
    getMonthlyUsageCounter(workspaceId, 'executed_actions'),
  ]);

  const { end } = getCurrentMonthlyWindow();

  const snapshots: Record<
    UsageMetricKey,
    { used: number; limit: number | null; resetsAt?: string | null }
  > = {
    workspaces: { used: 1, limit: limits.workspaces, resetsAt: null },
    internal_users: { used: usersCount, limit: limits.internalUsers, resetsAt: null },
    active_connectors: { used: connectorsCount, limit: limits.activeConnectors, resetsAt: null },
    intents: {
      used: intentCounter.count,
      limit: limits.intentsPerMonth,
      resetsAt: end.toISOString(),
    },
    executed_actions: {
      used: executionCounter.count,
      limit: limits.executedActionsPerMonth,
      resetsAt: end.toISOString(),
    },
  };

  return (Object.keys(snapshots) as UsageMetricKey[]).map((key) => {
    const meta = USAGE_METRIC_META[key];
    const snapshot = snapshots[key];
    const remaining = snapshot.limit === null ? null : Math.max(snapshot.limit - snapshot.used, 0);
    const ratio =
      snapshot.limit === null || snapshot.limit === 0 ? 0 : snapshot.used / snapshot.limit;
    const status =
      snapshot.limit !== null && snapshot.used >= snapshot.limit
        ? 'blocked'
        : ratio >= DEFAULT_WARNING_RATIO
          ? 'warning'
          : 'ok';

    return {
      key,
      label: meta.label,
      unit: meta.unit,
      period: meta.period,
      used: snapshot.used,
      limit: snapshot.limit,
      remaining,
      warningThreshold: DEFAULT_WARNING_RATIO,
      status,
      hardLimit: snapshot.limit !== null,
      resetsAt: snapshot.resetsAt ?? null,
    };
  });
}

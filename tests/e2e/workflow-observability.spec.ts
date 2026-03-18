import { expect, test } from '@playwright/test';
import {
  apiGet,
  apiGetPaginated,
  apiPost,
  loginSeededReviewer,
  seededWorkspace,
  waitForIntentStatus,
} from './support/vowgrid-api';

test('seeded workspace exposes a full workflow, receipt, rollback, billing, and metrics trail', async ({
  page,
  request,
}) => {
  const uniqueId = Date.now().toString();
  const title = `E2E workflow ${uniqueId}`;

  const intent = await apiPost<{
    id: string;
    title: string;
    status: string;
  }>(request, '/intents', {
    title,
    description: 'Deep E2E workflow verification',
    action: 'rotate_secret',
    connectorId: seededWorkspace.connectorId,
    agentId: seededWorkspace.agentId,
    environment: 'production',
    parameters: {
      secretName: `support-token-${uniqueId}`,
      amount: 1000,
    },
    idempotencyKey: `e2e-workflow-${uniqueId}`,
  });

  await apiPost(request, `/intents/${intent.id}/propose`);
  await apiPost(request, `/intents/${intent.id}/simulate`);

  const approvalSubmission = await apiPost<{
    approvalRequest: { id: string };
  }>(request, `/intents/${intent.id}/submit-for-approval`, {
    requiredCount: 1,
  });

  await apiPost(request, `/approvals/${approvalSubmission.approvalRequest.id}/approve`, {
    userId: seededWorkspace.reviewerId,
    rationale: 'Deep E2E approval',
  });

  await apiPost(request, `/intents/${intent.id}/execute`);
  const succeededIntent = await waitForIntentStatus(request, intent.id, 'succeeded');

  const executionReceipt = succeededIntent.receipts.find((receipt) => receipt.type === 'execution');
  expect(executionReceipt?.id).toBeTruthy();

  await apiPost(request, `/intents/${intent.id}/rollback`, {
    reason: 'Deep E2E rollback verification',
  });
  const rolledBackIntent = await waitForIntentStatus(request, intent.id, 'rolled_back');

  const rollbackReceipt = rolledBackIntent.receipts.find((receipt) => receipt.type === 'rollback');
  expect(rollbackReceipt?.id).toBeTruthy();

  const receipt = await apiGet<{
    summary: string;
    intent: { id: string; title: string };
  }>(request, `/receipts/${rollbackReceipt!.id}`);
  expect(receipt.intent.id).toBe(intent.id);

  const auditEvents = await apiGetPaginated<{
    action: string;
    entityId: string;
  }>(request, `/audit-events?entityType=intent&entityId=${intent.id}&pageSize=50`);

  expect(auditEvents.some((event) => event.action === 'execution.completed')).toBeTruthy();
  expect(auditEvents.some((event) => event.action === 'rollback.completed')).toBeTruthy();

  const metricsResponse = await request.get('http://127.0.0.1:4000/v1/metrics');
  expect(metricsResponse.ok()).toBeTruthy();
  const metricsText = await metricsResponse.text();
  expect(metricsText).toContain('vowgrid_execution_events_total');
  expect(metricsText).toContain('event="completed"');
  expect(metricsText).toContain('vowgrid_rollback_events_total');

  await loginSeededReviewer(page);

  await page.goto(`/app/intents/${intent.id}`);
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await expect(page.getByText(/rolled back/i)).toBeVisible();
  await expect(page.getByText(/proof exists/i)).toBeVisible();

  await page.goto(`/app/receipts/${rollbackReceipt!.id}`);
  await expect(page.getByRole('heading', { name: receipt.summary })).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();

  await page.goto('/app/audit');
  await expect(
    page.getByRole('heading', {
      name: /investigate what happened, who triggered it, and what proof remains/i,
    }),
  ).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();

  await page.goto('/app/billing');
  await expect(page.getByRole('heading', { name: /make limit pressure visible/i })).toBeVisible();
  await expect(page.getByText(/usage and limits/i)).toBeVisible();
  await expect(page.getByText(/invoices and adjustments/i)).toBeVisible();
});

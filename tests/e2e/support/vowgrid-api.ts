import { expect, type APIRequestContext, type Page } from '@playwright/test';

const API_BASE_URL = process.env.VOWGRID_E2E_API_BASE_URL ?? 'http://127.0.0.1:4000/v1';

export const seededWorkspace = {
  apiKey: 'vowgrid_local_dev_key',
  reviewerId: 'cmg0000000000000000000003',
  agentId: 'cmg0000000000000000000002',
  connectorId: 'cmg0000000000000000000004',
  email: 'reviewer@vowgrid.local',
  password: 'vowgrid_local_password',
};

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface PaginatedEnvelope<T> extends ApiEnvelope<T[]> {
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

export async function loginSeededReviewer(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(seededWorkspace.email);
  await page.getByLabel('Password').fill(seededWorkspace.password);
  await page.getByRole('button', { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/app$/);
}

export async function apiGet<T>(
  request: APIRequestContext,
  path: string,
  headers?: Record<string, string>,
) {
  const response = await request.get(`${API_BASE_URL}${path}`, {
    headers: {
      'X-Api-Key': seededWorkspace.apiKey,
      ...headers,
    },
  });

  expect(response.ok(), `GET ${path} should succeed`).toBeTruthy();
  const body = (await response.json()) as ApiEnvelope<T>;
  expect(body.success, `GET ${path} should return success envelope`).toBeTruthy();
  return body.data as T;
}

export async function apiGetPaginated<T>(
  request: APIRequestContext,
  path: string,
  headers?: Record<string, string>,
) {
  const response = await request.get(`${API_BASE_URL}${path}`, {
    headers: {
      'X-Api-Key': seededWorkspace.apiKey,
      ...headers,
    },
  });

  expect(response.ok(), `GET ${path} should succeed`).toBeTruthy();
  const body = (await response.json()) as PaginatedEnvelope<T>;
  expect(body.success, `GET ${path} should return success envelope`).toBeTruthy();
  return body.data as T[];
}

export async function apiPost<T>(
  request: APIRequestContext,
  path: string,
  payload?: unknown,
  headers?: Record<string, string>,
) {
  const response = await request.post(`${API_BASE_URL}${path}`, {
    data: payload,
    headers: {
      'X-Api-Key': seededWorkspace.apiKey,
      ...headers,
    },
  });

  expect(response.ok(), `POST ${path} should succeed`).toBeTruthy();
  const body = (await response.json()) as ApiEnvelope<T>;
  expect(body.success, `POST ${path} should return success envelope`).toBeTruthy();
  return body.data as T;
}

export async function waitForIntentStatus(
  request: APIRequestContext,
  intentId: string,
  expectedStatus: string,
) {
  await expect
    .poll(
      async () => {
        const intent = await apiGet<{ status: string }>(request, `/intents/${intentId}`);
        return intent.status;
      },
      {
        timeout: 30_000,
        intervals: [500, 1000, 1500],
        message: `Intent ${intentId} should reach ${expectedStatus}`,
      },
    )
    .toBe(expectedStatus);

  return apiGet<{
    id: string;
    title: string;
    status: string;
    receipts: Array<{ id: string; type: string }>;
    approvalRequest: { id: string } | null;
  }>(request, `/intents/${intentId}`);
}

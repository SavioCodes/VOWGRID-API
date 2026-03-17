import type { ApiResponse } from '@vowgrid/contracts';

type ApiAuth =
  | { kind: 'none' }
  | { kind: 'session'; token: string }
  | { kind: 'apiKey'; apiKey: string };

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

export function getApiBaseUrl() {
  const apiBaseUrl = process.env.VOWGRID_API_BASE_URL?.replace(/\/$/, '');

  if (!apiBaseUrl) {
    throw new Error('Missing VOWGRID_API_BASE_URL.');
  }

  return apiBaseUrl;
}

export async function fetchApiEnvelope<T>(
  path: string,
  init?: RequestInit & {
    auth?: ApiAuth;
  },
): Promise<T> {
  const headers = new Headers(init?.headers);
  const auth = init?.auth ?? { kind: 'none' as const };

  if (auth.kind === 'session') {
    headers.set('Authorization', `Bearer ${auth.token}`);
  }

  if (auth.kind === 'apiKey') {
    headers.set('X-Api-Key', auth.apiKey);
  }

  if (init?.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !json.success) {
    throw new ApiRequestError(
      json.error?.message ?? `Request to ${path} failed.`,
      response.status,
      json.error?.code,
    );
  }

  return json.data as T;
}

export async function fetchPublicJson<T>(path: string) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: 'no-store',
  });

  if (!response.ok && response.status !== 503) {
    throw new ApiRequestError(`Request to ${path} failed.`, response.status);
  }

  return (await response.json()) as T;
}

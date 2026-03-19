import type {
  ApiResponse,
  ApprovalDecisionInput,
  ApprovalDecisionResultResponse,
  AuditEventResponse,
  BillingAccountResponse,
  BillingCheckoutResponse,
  BillingInvoiceResponse,
  BillingPlanCatalogEntry,
  CancelSubscriptionInput,
  ConnectorResponse,
  CreateCheckoutInput,
  CreateIntentInput,
  CreatePolicyInput,
  HealthResponse,
  IntentDetailResponse,
  IntentResponse,
  ListConnectorsResponse,
  ListIntentsInput,
  PolicyResponse,
  ReceiptDetailResponse,
  RollbackInput,
  SimulationResultResponse,
  SubmitForApprovalInput,
  SubmitForApprovalResponse,
} from '@vowgrid/contracts';

type ClientAuth =
  | { kind: 'apiKey'; apiKey: string }
  | { kind: 'session'; token: string }
  | { kind: 'none' };

export class VowGridClientError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'VowGridClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface VowGridClientOptions {
  baseUrl: string;
  apiKey?: string;
  sessionToken?: string;
  fetch?: typeof globalThis.fetch;
  headers?: HeadersInit;
}

function buildQuery(input: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export class VowGridClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly defaultHeaders: HeadersInit;
  private readonly auth: ClientAuth;

  constructor(options: VowGridClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetcher = options.fetch ?? fetch;
    this.defaultHeaders = options.headers ?? {};
    this.auth = options.apiKey
      ? { kind: 'apiKey', apiKey: options.apiKey }
      : options.sessionToken
        ? { kind: 'session', token: options.sessionToken }
        : { kind: 'none' };
  }

  withSessionToken(token: string) {
    return new VowGridClient({
      baseUrl: this.baseUrl,
      sessionToken: token,
      fetch: this.fetcher,
      headers: this.defaultHeaders,
    });
  }

  withApiKey(apiKey: string) {
    return new VowGridClient({
      baseUrl: this.baseUrl,
      apiKey,
      fetch: this.fetcher,
      headers: this.defaultHeaders,
    });
  }

  private async request<T>(path: string, init?: RequestInit, auth = this.auth): Promise<T> {
    const headers = new Headers(this.defaultHeaders);

    if (auth.kind === 'apiKey') {
      headers.set('X-Api-Key', auth.apiKey);
    }

    if (auth.kind === 'session') {
      headers.set('Authorization', `Bearer ${auth.token}`);
    }

    if (init?.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    const json = (await response.json().catch(() => ({}))) as ApiResponse<T>;

    if (!response.ok || !json.success) {
      throw new VowGridClientError(
        json.error?.message ?? `Request to ${path} failed.`,
        response.status,
        json.error?.code,
        json.error?.details,
      );
    }

    return json.data as T;
  }

  health() {
    return this.request<HealthResponse>('/v1/health', undefined, { kind: 'none' });
  }

  metrics(token?: string) {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    return this.fetcher(`${this.baseUrl}/v1/metrics`, { headers }).then((response) =>
      response.text(),
    );
  }

  listBillingPlans() {
    return this.request<BillingPlanCatalogEntry[]>('/v1/billing/plans', undefined, {
      kind: 'none',
    });
  }

  getBillingAccount() {
    return this.request<BillingAccountResponse>('/v1/billing/account');
  }

  startCheckout(input: CreateCheckoutInput) {
    return this.request<BillingCheckoutResponse>('/v1/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  cancelSubscription(input: CancelSubscriptionInput) {
    return this.request<BillingAccountResponse>('/v1/billing/subscription/cancel', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  listIntents(input: Partial<ListIntentsInput> = {}) {
    return this.request<IntentResponse[]>(
      `/v1/intents${buildQuery({
        page: input.page,
        pageSize: input.pageSize,
        status: input.status,
        agentId: input.agentId,
        connectorId: input.connectorId,
      })}`,
    );
  }

  createIntent(input: CreateIntentInput) {
    return this.request<IntentResponse>('/v1/intents', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  getIntent(intentId: string) {
    return this.request<IntentDetailResponse>(`/v1/intents/${intentId}`);
  }

  proposeIntent(intentId: string) {
    return this.request<IntentResponse>(`/v1/intents/${intentId}/propose`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  simulateIntent(intentId: string) {
    return this.request<SimulationResultResponse>(`/v1/intents/${intentId}/simulate`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  submitForApproval(intentId: string, input: SubmitForApprovalInput) {
    return this.request<SubmitForApprovalResponse>(`/v1/intents/${intentId}/submit-for-approval`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  reviewApproval(approvalRequestId: string, input: ApprovalDecisionInput) {
    return this.request<ApprovalDecisionResultResponse>(
      `/v1/approvals/${approvalRequestId}/decisions`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }

  queueExecution(intentId: string) {
    return this.request<{ id: string; status: string }>(`/v1/intents/${intentId}/execute`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  rollbackIntent(intentId: string, input: RollbackInput = {}) {
    return this.request<{ id: string; status: string }>(`/v1/intents/${intentId}/rollback`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  listPolicies() {
    return this.request<PolicyResponse[]>('/v1/policies');
  }

  createPolicy(input: CreatePolicyInput) {
    return this.request<PolicyResponse>('/v1/policies', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  listConnectors() {
    return this.request<ListConnectorsResponse>('/v1/connectors');
  }

  createConnector(input: Record<string, unknown>) {
    return this.request<ConnectorResponse>('/v1/connectors', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  listAuditEvents(pageSize = 100) {
    return this.request<AuditEventResponse[]>(`/v1/audit-events?pageSize=${pageSize}`);
  }

  getReceipt(receiptId: string) {
    return this.request<ReceiptDetailResponse>(`/v1/receipts/${receiptId}`);
  }

  listInvoices() {
    return this.getBillingAccount().then((account) => account.invoices as BillingInvoiceResponse[]);
  }
}

export type { VowGridClientOptions as ClientOptions };

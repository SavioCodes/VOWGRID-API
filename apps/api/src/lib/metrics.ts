import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'vowgrid_',
});

export const httpRequestsTotal = new Counter({
  name: 'vowgrid_http_requests_total',
  help: 'Total HTTP requests handled by the VowGrid API.',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [metricsRegistry],
});

export const httpRequestDurationMs = new Histogram({
  name: 'vowgrid_http_request_duration_ms',
  help: 'HTTP request duration in milliseconds.',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [metricsRegistry],
});

export const authEventsTotal = new Counter({
  name: 'vowgrid_auth_events_total',
  help: 'Auth lifecycle events emitted by the dashboard auth system.',
  labelNames: ['event', 'provider'] as const,
  registers: [metricsRegistry],
});

export const executionEventsTotal = new Counter({
  name: 'vowgrid_execution_events_total',
  help: 'Execution lifecycle events emitted by the workflow runtime.',
  labelNames: ['event'] as const,
  registers: [metricsRegistry],
});

export const rollbackEventsTotal = new Counter({
  name: 'vowgrid_rollback_events_total',
  help: 'Rollback lifecycle events emitted by the workflow runtime.',
  labelNames: ['event'] as const,
  registers: [metricsRegistry],
});

export const billingInvoiceEventsTotal = new Counter({
  name: 'vowgrid_billing_invoice_events_total',
  help: 'Billing invoice and adjustment events emitted by the billing subsystem.',
  labelNames: ['event', 'metric'] as const,
  registers: [metricsRegistry],
});

export function observeHttpRequest(input: {
  method: string;
  route: string;
  statusCode: number;
  durationMs: number;
}) {
  const labels = {
    method: input.method,
    route: input.route,
    status_code: String(input.statusCode),
  };

  httpRequestsTotal.inc(labels);
  httpRequestDurationMs.observe(labels, input.durationMs);
}

export function observeAuthEvent(event: string, provider = 'password') {
  authEventsTotal.inc({ event, provider });
}

export function observeExecutionEvent(event: string) {
  executionEventsTotal.inc({ event });
}

export function observeRollbackEvent(event: string) {
  rollbackEventsTotal.inc({ event });
}

export function observeBillingInvoiceEvent(event: string, metric: string) {
  billingInvoiceEventsTotal.inc({ event, metric });
}

# Observability Stack

VowGrid ships with a self-hosted observability path under `infra/observability`.

## Default Path

First-party stack:

- Prometheus
- Alertmanager
- Grafana
- API metrics endpoint at `/v1/metrics`

This is the default observability path for the repository. Vendor services are optional extensions, not the primary launch dependency.

## What Is Measured

Current metric families include:

- HTTP request totals and latency
- auth lifecycle counters
- execution lifecycle counters
- rollback lifecycle counters
- billing invoice, proration, and overage counters

## Local Startup

```bash
pnpm docker:obs:up
pnpm docker:obs:status
```

Local URLs:

- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Grafana: `http://localhost:3001`

## Prometheus Query Cheat Sheet

### API request rate

```promql
sum(rate(vowgrid_http_requests_total[5m]))
```

### 5xx request rate

```promql
sum(rate(vowgrid_http_requests_total{status_code=~"5.."}[5m]))
```

### p95 API latency

```promql
histogram_quantile(0.95, sum(rate(vowgrid_http_request_duration_ms_bucket[5m])) by (le))
```

### Execution failures

```promql
sum(increase(vowgrid_execution_failures_total[15m]))
```

### Rollback failures

```promql
sum(increase(vowgrid_rollback_failures_total[15m]))
```

## Alert Rules Included

Current bundled rules cover:

- API target down
- elevated 5xx rate
- slow p95 latency
- execution failures
- rollback failures

## Dashboards

Grafana ships with a VowGrid control-plane dashboard in:

- `infra/observability/grafana/dashboards/vowgrid-control-plane.json`

## Release Compose Behavior

The release stack supports an optional observability profile:

```bash
docker compose --env-file infra/.env.production.example \
  -f infra/docker-compose.release.yml \
  --profile observability config
```

In the chosen topology, observability ports bind to `127.0.0.1`.

## Optional Vendor Sinks

The API can forward operational errors to external sinks when configured.

### Sentry

Environment:

- `SENTRY_DSN`

### Datadog Logs

Environment:

- `DATADOG_LOGS_API_KEY`
- `DATADOG_SITE`

### New Relic Logs

Environment:

- `NEW_RELIC_LICENSE_KEY`
- `NEW_RELIC_LOGS_URL`

### Slack

Environment:

- `SLACK_ALERT_WEBHOOK_URL`

Current vendor sink wiring focuses on:

- API request failures
- execution worker failures
- rollback worker failures

## Recommended Rollout

1. start with the self-hosted stack only
2. add Slack if you want lightweight operator visibility
3. add Sentry or Datadog/New Relic when you need centralized external incident tooling

## What Still Needs Manual Setup

- vendor account creation
- real credentials
- dashboards
- alert routing policy
- environment-specific severity thresholds
- on-call ownership

## Honest Limits

VowGrid does not yet ship:

- PagerDuty integration
- Opsgenie integration
- formal SLA/SLO error-budget automation
- vendor-specific IaC modules for observability accounts

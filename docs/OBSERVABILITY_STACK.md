# Observability Stack

## What Exists

VowGrid now ships with a self-hosted observability stack under `infra/observability`:

- Prometheus for scraping `/v1/metrics`
- Alertmanager for local alert routing
- Grafana with a pre-provisioned VowGrid control-plane dashboard

The API exposes Prometheus-compatible metrics at `GET /v1/metrics`.

## Local Development

1. Start Docker Desktop.
2. Start the normal infra and the API/web stack.
3. Run `pnpm docker:obs:up`.

Local URLs:

- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Grafana: `http://localhost:3001`

Default Grafana credentials:

- username: `admin`
- password: `vowgrid_admin`

## Metrics Included

- HTTP request totals and latency histograms
- Auth lifecycle counters
- Execution lifecycle counters
- Rollback lifecycle counters
- Billing invoice/proration/overage counters

## Alert Rules Included

- API target down
- Elevated 5xx rate
- Slow p95 request latency
- Execution failures observed
- Rollback failures observed

## Release Compose

`infra/docker-compose.release.yml` now has an optional `observability` profile.

Example:

```bash
docker compose --env-file infra/.env.production.example \
  -f infra/docker-compose.release.yml \
  --profile observability \
  config
```

## What Still Requires Environment Setup

- Grafana admin credentials should be changed outside local development.
- If you want vendor tooling such as Datadog, Sentry, New Relic, or hosted alert receivers, you still need to wire those separately.
- If you enable `METRICS_AUTH_TOKEN`, make sure your scrape topology can still authenticate to `/v1/metrics`.

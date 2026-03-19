# Observability Stack

VowGrid ships with a self-hosted observability path under `infra/observability`.

## Components

- Prometheus
- Alertmanager
- Grafana
- API metrics endpoint at `/v1/metrics`

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

## Recommended Tuning

Before real production:

1. adjust thresholds for expected traffic
2. define who receives which severity
3. confirm alert noise stays manageable
4. validate scrape auth if `METRICS_AUTH_TOKEN` is set

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

## External Extensions

For vendor sinks and external receivers, see:

- `docs/OBSERVABILITY_VENDORS.md`

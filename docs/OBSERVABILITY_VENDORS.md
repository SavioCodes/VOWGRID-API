# Observability Vendors

## Current Default Path

The default observability path is self-hosted:

- Prometheus
- Alertmanager
- Grafana

This remains the recommended launch path.

## Optional Vendor Sinks

The API now supports optional outbound error reporting to:

- Sentry
- Datadog Logs
- New Relic Logs

Environment variables:

- `SENTRY_DSN`
- `DATADOG_LOGS_API_KEY`
- `DATADOG_SITE`
- `NEW_RELIC_LICENSE_KEY`
- `NEW_RELIC_LOGS_URL`

## Scope Of Current Integration

Current vendor wiring focuses on operational error reporting from:

- API request failures
- execution worker failures
- rollback worker failures

## What Still Needs Environment Setup

- vendor account credentials
- dashboards
- on-call routing
- external alert receivers such as Slack or PagerDuty

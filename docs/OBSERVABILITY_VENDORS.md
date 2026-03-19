# Observability Vendors

The default VowGrid path is self-hosted observability. Vendor integrations are optional extensions, not the primary launch dependency.

## Default Path

First-party stack:

- Prometheus
- Alertmanager
- Grafana

## Optional Vendor Integrations

The API can forward operational errors to external sinks when configured.

## Sentry

Environment:

- `SENTRY_DSN`

Best for:

- exception grouping
- stack traces
- release health visibility

## Datadog Logs

Environment:

- `DATADOG_LOGS_API_KEY`
- `DATADOG_SITE`

## New Relic Logs

Environment:

- `NEW_RELIC_LICENSE_KEY`
- `NEW_RELIC_LOGS_URL`

## Slack

Environment:

- `SLACK_ALERT_WEBHOOK_URL`

Current scope:

- lightweight API-side alert delivery for operational failures

## What Is Covered Today

Current vendor sink wiring focuses on:

- API request failures
- execution worker failures
- rollback worker failures

## What Still Needs Manual Setup

- vendor account creation
- real credentials
- dashboards
- alert routing policy
- environment-specific severity thresholds
- on-call ownership

## Recommended Rollout

1. start with self-hosted stack only
2. add Slack if you want lightweight operator visibility
3. add Sentry or Datadog/New Relic when you need centralized external incident tooling

## Honest Limits

VowGrid does not yet ship:

- PagerDuty integration
- Opsgenie integration
- formal SLA/SLO error-budget automation
- vendor-specific IaC modules for observability accounts

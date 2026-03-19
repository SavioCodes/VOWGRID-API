# Troubleshooting

This document collects the most common local, staging, and release-side issues for VowGrid.

## Local Development

### Docker containers do not start

- confirm Docker Desktop is running
- run `pnpm docker:status`
- confirm ports `5432` and `6379` are free or overridden in `infra/.env`

### Prisma commands fail

- run `pnpm generate`
- confirm `apps/api/.env` exists
- confirm Postgres is healthy
- rerun `pnpm migrate`

### Web keeps redirecting to `/login`

- confirm the session is still valid
- confirm `apps/web/.env.local` points to the correct API base URL
- clear old cookies if the auth shape changed during local development

### API key does not authenticate

- confirm the key was not revoked or rotated
- confirm the request sends `X-Api-Key`
- confirm the key belongs to the intended workspace

### Checkout is disabled

- inspect `apps/api/.env`
- run `pnpm ops:readiness`

### OAuth buttons do not appear or do nothing

- confirm provider envs exist in API and web env files
- confirm callback URLs match the current web base URL
- confirm provider apps are configured for the active domain

### E2E tests fail to boot

- confirm `apps/api/.env` exists
- confirm `apps/web/.env.local` exists
- run `pnpm test:e2e:install`
- confirm Postgres and Redis are running

## Release And Production

### Release compose does not render

- run `pnpm docker:release:config`
- confirm `infra/.env`, `infra/api.env`, and `infra/web.env` exist on the real host

### Site is deployed but unreachable

- confirm DNS points to the host
- confirm ports `80` and `443` are allowed
- confirm Caddy is healthy
- confirm `VOWGRID_PRIMARY_DOMAIN` matches the requested host

### `/v1/health` fails in production

- inspect API container logs
- inspect Postgres and Redis health
- confirm API envs are mounted
- confirm migrations were applied

### Billing webhook does not update subscription state

- confirm `MERCADO_PAGO_WEBHOOK_SECRET`
- confirm public webhook reachability
- inspect API logs around `/v1/billing/webhooks/mercado-pago`

### SMTP-backed auth emails never arrive

- confirm SMTP credentials are real
- inspect logs for fallback-to-application-log delivery
- confirm `MAIL_FROM_EMAIL` and `MAIL_FROM_NAME`

### Observability looks empty

- confirm `/v1/metrics` is reachable
- confirm Prometheus is scraping the API
- if `METRICS_AUTH_TOKEN` is set, confirm the scraper includes it

### Blue/green cutover behaves oddly

- confirm which slot is active
- validate the inactive slot before flipping
- inspect Caddy routing
- keep the previous slot alive until post-cutover validation is complete

## When To Stop And Escalate

Treat the problem as external setup, not code, when the blocker is:

- missing Mercado Pago credentials
- missing OAuth credentials
- missing SMTP provider
- missing domain or DNS
- missing host secrets
- GitHub Actions billing/account lock

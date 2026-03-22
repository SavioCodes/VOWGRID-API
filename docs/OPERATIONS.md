# Operations Handbook

This document is the day-2 operations reference for VowGrid. Use it together with:

- `docs/PRODUCTION_BLUEPRINT.md` for the chosen deployment topology
- `docs/DEPLOYMENT_FLOW.md` for CI/CD behavior
- `docs/BACKUP_AND_RECOVERY.md` for backup policy
- `docs/TROUBLESHOOTING.md` for known failure modes
- `docs/OBSERVABILITY_STACK.md` for metrics, dashboards, and alerting

## Operating Model

The current launch path is intentionally simple:

- one Linux VPS
- Docker Compose release stack
- Caddy as the public ingress and TLS terminator
- API, web, Postgres, and Redis in the same host-level trust boundary
- optional observability profile bound to `127.0.0.1`

This is suitable for launch validation, internal demos, and early production usage. It is not yet a multi-node or multi-region architecture.

The API also supports a managed-data variation of this model:

- `VOWGRID_DATABASE_URL` in `infra/.env` to point the API at managed Postgres
- `VOWGRID_REDIS_URL` in `infra/.env` to point the API at managed Redis
- `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` as direct provider exports for Prisma-based workflows

## Service Inventory

| Service        | Role                                               | Health source                           |
| -------------- | -------------------------------------------------- | --------------------------------------- |
| `caddy`        | Public ingress, TLS, reverse proxy                 | `docker compose ps`, Caddy logs         |
| `web`          | Next.js operator dashboard and marketing site      | `/`                                     |
| `api`          | Fastify API, auth, billing, workflow orchestration | `/v1/health`, `/v1/docs`, `/v1/metrics` |
| `postgres`     | Primary relational database                        | container healthcheck, `pg_isready`     |
| `redis`        | Queue and ephemeral coordination                   | container healthcheck, `redis-cli ping` |
| `prometheus`   | Metrics scraping and rule evaluation               | optional observability profile          |
| `alertmanager` | Alert routing                                      | optional observability profile          |
| `grafana`      | Dashboards                                         | optional observability profile          |

## Standard Environment Layout

On the target host, keep runtime configuration under `infra/`:

- `infra/.env`
- `infra/api.env`
- `infra/web.env`

If you are using managed Postgres or Redis, keep those connection strings in `infra/.env` so Compose can inject them into the API service.

Recommended deployment directory:

```text
/srv/vowgrid/
|-- repo checkout
|-- infra/.env
|-- infra/api.env
|-- infra/web.env
|-- backups/postgres/
`-- logs/ (optional if using host-level collection)
```

## Routine Commands

### Local or remote base stack

```bash
docker compose -f infra/docker-compose.release.yml ps
docker compose -f infra/docker-compose.release.yml logs --tail=200
docker compose -f infra/docker-compose.release.yml up -d
docker compose -f infra/docker-compose.release.yml down
```

### Release stack with observability profile

```bash
docker compose --env-file infra/.env \
  -f infra/docker-compose.release.yml \
  --profile observability ps
```

### Repository scripts

```bash
pnpm docker:up
pnpm docker:down
pnpm docker:status
pnpm docker:logs
pnpm docker:obs:up
pnpm docker:obs:down
pnpm db:backup
pnpm db:restore -- --input backups/postgres/<file>.sql.gz
pnpm ops:readiness
```

## Pre-Deploy Checklist

Before each staging or production deploy, confirm:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm test:integration`
5. `pnpm test:e2e`
6. `pnpm build`
7. `pnpm docker:release:config`
8. `pnpm ops:readiness` with real env files in place

If any of these fail, stop the rollout.

## Release Procedure

### In-place release path

1. Build and publish the API and web images.
2. Update `VOWGRID_API_IMAGE` and `VOWGRID_WEB_IMAGE` in the deployment environment.
3. Run the release workflow or redeploy with Compose.
4. Validate:
   - `docker compose ps`
   - `https://<domain>/v1/health`
   - `https://<domain>/v1/docs`
   - operator login
   - one seed-free smoke workflow in the dashboard

When `VOWGRID_DATABASE_URL` or `VOWGRID_REDIS_URL` are set, verify the API is talking to the managed stores before considering the release good.

### Blue/green path

Use `docs/BLUE_GREEN_DEPLOY.md` when you need safer cutover and rollback on the same host.

## Health Expectations

### Required checks

- `GET /v1/health` returns `200 OK`
- `GET /v1/docs` loads the Swagger UI
- `GET /v1/metrics` is reachable by the configured scraper
- `docker compose ps` shows healthy `postgres`, `redis`, `api`, and `web`

If managed stores are in use, `postgres` and `redis` containers are no longer the source of truth for API data-path health.

### Warning signs

- repeated container restarts
- `PrismaClientInitializationError`
- `ECONNREFUSED` between API and Postgres or Redis
- checkout/webhook errors on billing paths
- repeated rollback job failures

## Backup And Recovery

### Backup cadence

For launch-stage operation, the minimum recommended policy is:

- nightly Postgres dump
- before-each-release manual dump
- before major migrations

Use:

```bash
pnpm db:backup
```

### Restore workflow

1. Confirm the target Postgres container is healthy.
2. Stop write traffic if restoring into a live environment.
3. Run:

```bash
pnpm db:restore -- --input backups/postgres/<file>.sql.gz
```

4. Re-run a health check and a read-only smoke check.

## Incident Categories

### P0: Full product outage

Symptoms:

- dashboard unavailable
- API health failing
- Caddy returning 502/503

Immediate actions:

1. Inspect `docker compose ps`
2. Inspect `docker compose logs --tail=200`
3. Confirm Postgres and Redis health
4. Roll back the latest deployment if the failure began immediately after release

### P1: Workflow execution degraded

Symptoms:

- intents queue but do not execute
- rollback attempts pile up
- receipts stop appearing

Immediate actions:

1. Inspect API logs for worker startup failures
2. Confirm Redis health
3. Inspect BullMQ-related logs and execution/rollback counters on `/v1/metrics`
4. Check connector-specific configuration errors

### P1: Billing degraded

Symptoms:

- checkout disabled unexpectedly
- webhook sync stops updating subscription state
- invoices stop appearing

Immediate actions:

1. Run `pnpm ops:readiness`
2. Inspect billing webhook logs
3. Confirm Mercado Pago credentials and public webhook reachability
4. Validate the workspace billing account response

## Operational Ownership

Suggested launch-stage owners:

- application owner: VowGrid engineering
- infrastructure owner: whoever controls the VPS, DNS, and GitHub Actions secrets
- billing owner: whoever controls Mercado Pago credentials and reconciliation
- enterprise owner: whoever owns the sales inbox and provisioning handoff

## What Is Still Manual

These paths still require operator involvement:

- Enterprise lead intake and handoff
- production credential provisioning
- Terraform value finalization
- registry access and deploy secret management
- billing provider account setup and webhook validation

## Launch-Ready But Not Yet Platform-Grade

The current operations model is good for early production, but it is not yet:

- multi-node
- auto-scaling
- WAF-backed
- managed-secrets-based
- disaster-recovery-automated
- compliance-automated

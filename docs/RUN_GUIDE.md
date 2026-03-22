# Run Guide

This is the canonical developer setup and verification guide for VowGrid.

## Local Setup

1. Install dependencies with `pnpm install`
2. Copy `apps/api/.env.development.example` to `apps/api/.env`
3. Copy `apps/web/.env.example` to `apps/web/.env.local`
4. Optionally copy `infra/.env.development.example` to `infra/.env`
5. Start Docker Desktop
6. Run `pnpm docker:up`
7. Run `pnpm migrate`
8. Run `pnpm seed`
9. Start the API with `pnpm dev:api`
10. Start the web app with `pnpm dev:web`

One-command startup:

- `pnpm start:dev`

## Managed Postgres And Redis

The API can now run against managed data stores without renaming everything by hand.

Runtime precedence:

- `DATABASE_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`

Prisma CLI precedence:

- `DATABASE_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`

Practical examples:

- Supabase Postgres can be wired through `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`
- managed Redis can be wired directly through `REDIS_URL`

To start only the API against managed services, set those env values in `apps/api/.env` and then run:

- `pnpm dev:api`

You do not need local Docker Postgres or Redis for that mode.

## Environment File Pattern

Tracked example files:

- `apps/api/.env.development.example`
- `apps/api/.env.production.example`
- `apps/api/.env.example`
- `apps/web/.env.example`
- `apps/web/.env.production.example`
- `infra/.env.development.example`
- `infra/.env.production.example`
- `infra/.env.example`
- `infra/api.env.example`
- `infra/web.env.example`

Working files:

- `apps/api/.env`
- `apps/web/.env.local`
- `infra/.env`

Release hosts also expect:

- `infra/api.env`
- `infra/web.env`

Managed provider aliases accepted by the API:

- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING` for Prisma CLI

## Local URLs

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/v1/docs`
- Metrics: `http://localhost:4000/v1/metrics`

## Seeded Local Access

- Dashboard email: `reviewer@vowgrid.local`
- Dashboard password: `vowgrid_local_password`
- API key: `vowgrid_local_dev_key`
- Workspace ID: `cmg0000000000000000000001`
- Agent ID: `cmg0000000000000000000002`
- Reviewer ID: `cmg0000000000000000000003`
- Mock connector ID: `cmg0000000000000000000004`

Seeded billing state:

- active 14-day trial
- billing contact created from the workspace user
- current-month usage counters for intents and executed actions

## Quick Verification

- API health: `curl http://localhost:4000/v1/health`
- Swagger: open `http://localhost:4000/v1/docs`
- Login: `http://localhost:3000/login`
- Signup: `http://localhost:3000/signup`
- Protected app: `http://localhost:3000/app`
- Pricing: `http://localhost:3000/pricing`
- Billing: `http://localhost:3000/app/billing`
- Settings: `http://localhost:3000/app/settings`
- Metrics: `curl http://localhost:4000/v1/metrics`
- Docker status: `pnpm docker:status`

## Minimal Product Workflow Check

1. Log in as `reviewer@vowgrid.local` or sign up a new workspace.
2. Create a draft intent.
3. Promote it with `POST /v1/intents/:intentId/propose`.
4. Simulate it.
5. Submit it for approval.
6. Approve it with the signed-in reviewer session.
7. Execute it.
8. Read the generated receipt.
9. Inspect `/v1/audit-events`.
10. Optionally request rollback and confirm the attempt completes.
11. Open `/app/settings` and confirm members, invites, workspaces, exports, and API keys are visible to the current admin.

## Preview Mode

- `/preview` exists only when `VOWGRID_ENABLE_PROVISIONAL_DATA=true` in `apps/web/.env.local`
- `/app` never auto-falls back to provisional data

## Docker Commands

Base stack:

- `pnpm docker:up`
- `pnpm docker:down`
- `pnpm docker:status`
- `pnpm docker:logs`
- `pnpm docker:config`
- `pnpm docker:reset`

Observability overlay:

- `pnpm docker:obs:up`
- `pnpm docker:obs:down`
- `pnpm docker:obs:status`
- `pnpm docker:obs:logs`
- `pnpm docker:obs:config`

Release config rendering:

- `pnpm docker:release:config`

Persistent local volumes:

- `infra_pgdata`
- `infra_redisdata`

## Observability

Start the local observability stack on top of the API + infra:

- `pnpm docker:obs:up`
- `pnpm docker:obs:status`

URLs:

- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Grafana: `http://localhost:3001`

Default Grafana login:

- user: `admin`
- password: `vowgrid_admin`

## Test Commands

- Unit: `pnpm test`
- Integration: `pnpm test:integration`
- Coverage: `pnpm test:coverage`
- E2E: `pnpm test:e2e`
- Browser install: `pnpm test:e2e:install`

## Backup And Packaging Helpers

- `pnpm db:backup`
- `pnpm db:restore -- --input backups/postgres/<file>.sql.gz`
- `pnpm sdk:pack`
- `pnpm ops:readiness`

## Production And Deploy Notes

The chosen launch-stage path is one AWS Ubuntu VPS with Docker Compose and Caddy.

Important operational truth:

- `Deploy Staging` may pass by intentionally skipping remote deployment when staging SSH secrets are not configured
- production deploy workflows and the blue/green path exist, but still require real SSH secrets, host wiring, DNS, and remote env files
- the release compose can now prefer `VOWGRID_DATABASE_URL` and `VOWGRID_REDIS_URL` when you want managed data stores
- `pnpm ops:readiness` only becomes meaningful after real production-facing env values are filled

See:

- `docs/DEPLOYMENT_FLOW.md`
- `docs/PRODUCTION_BLUEPRINT.md`
- `docs/BACKUP_AND_RECOVERY.md`

## Provider Caveats

Mercado Pago, OAuth, OIDC, SMTP, and vendor observability sinks are all real code paths, but remain credential-gated.

Without provider envs:

- local auth and billing state still work
- `/v1/billing/account` still works
- checkout stays disabled
- social login buttons stay inactive

## Troubleshooting

- If `pnpm docker:up` fails, Docker Desktop is usually not running.
- If `http://localhost:3000/app` redirects to `/login`, confirm the dashboard session is valid.
- If `3000` is already occupied, run `pnpm --filter web dev -- --port 3001`.
- If `5432` or `6379` are already occupied, override host ports in `infra/.env`.
- If provider-backed flows stay disabled, check the relevant env values in `apps/api/.env` or `apps/web/.env.local`.

See `docs/TROUBLESHOOTING.md` for the broader issue list.

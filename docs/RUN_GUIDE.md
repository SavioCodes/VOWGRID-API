# Run Guide

## Start The Stack

1. Make sure Docker Desktop is running.
2. Install dependencies with `pnpm install`.
3. Copy `apps/api/.env.development.example` to `apps/api/.env`.
4. Copy `apps/web/.env.development.example` to `apps/web/.env.local`.
5. Optionally copy `infra/.env.development.example` to `infra/.env` if you need custom Docker ports or credentials.
6. Start Postgres and Redis with `pnpm docker:up`.
7. Apply migrations with `pnpm migrate`.
8. Seed local data with `pnpm seed`.
9. Start the API with `pnpm dev:api`.
10. Start the web app with `pnpm dev:web`.

One-command local startup:

- `pnpm start:dev`

## Local URLs

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/v1/docs`

## Seeded Local Access

- Dashboard email: `reviewer@vowgrid.local`
- Dashboard password: `vowgrid_local_password`
- API key: `vowgrid_local_dev_key`
- Workspace ID: `cmg0000000000000000000001`
- Agent ID: `cmg0000000000000000000002`
- Reviewer ID: `cmg0000000000000000000003`
- Mock connector ID: `cmg0000000000000000000004`

Seeded billing state:

- Active 14-day trial
- Billing contact created from the workspace user
- Current-month usage counters for intents and executed actions

## Quick Verification

- API health: `curl http://localhost:4000/v1/health`
- Swagger: open `http://localhost:4000/v1/docs`
- Login page: open `http://localhost:3000/login`
- Signup page: open `http://localhost:3000/signup`
- Protected app: open `http://localhost:3000/app`
- Pricing page: open `http://localhost:3000/pricing`
- Billing page: open `http://localhost:3000/app/billing`
- Settings page: open `http://localhost:3000/app/settings`
- Forgot password: open `http://localhost:3000/forgot-password`
- Verification flow: open `http://localhost:3000/verify-email`
- Metrics: `curl http://localhost:4000/v1/metrics`
- Docker status: `pnpm docker:status`
- Docker logs: `pnpm docker:logs`

## Centralized Observability

Start the local observability stack on top of the API + infra:

- `pnpm docker:obs:up`
- `pnpm docker:obs:status`

Local observability URLs:

- Prometheus: `http://localhost:9090`
- Alertmanager: `http://localhost:9093`
- Grafana: `http://localhost:3001`

Default Grafana login:

- user: `admin`
- password: `vowgrid_admin`

Shut it down with:

- `pnpm docker:obs:down`

## API Auth Checks

Session auth:

- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `POST /v1/auth/logout`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `POST /v1/auth/email-verification/request`
- `POST /v1/auth/email-verification/verify`
- `POST /v1/auth/oauth/complete`
- `POST /v1/auth/oauth/signup/complete`
- `POST /v1/auth/invites/accept`
- `POST /v1/auth/switch-workspace`

Machine auth:

- Send `X-Api-Key: vowgrid_local_dev_key` to the workflow routes
- Create and rotate workspace-scoped API keys from `/app/settings`

Workspace admin auth:

- Owners and admins can create, update, disable, and re-enable workspace members from `/app/settings`
- Owners and admins can create, revoke, and inspect invites from `/app/settings`
- Disabled members lose active sessions immediately and cannot log back in until re-enabled

## Minimal Product Workflow Check

1. Log in as `reviewer@vowgrid.local` or create a new workspace through signup.
2. Create a draft intent with the seeded agent and connector.
3. Promote it with `POST /v1/intents/:intentId/propose`.
4. Simulate it with `POST /v1/intents/:intentId/simulate`.
5. Submit it for approval.
6. Approve it with the signed-in reviewer session.
7. Execute it.
8. Read the generated receipt.
9. Inspect `/v1/audit-events`.
10. Optionally request rollback and confirm the attempt completes through the rollback worker.
11. Open `/app/settings` and confirm member management, invites, workspace switching, and API key management are all available to the current admin user.

## Preview Mode

- `/preview` exists only when `VOWGRID_ENABLE_PROVISIONAL_DATA=true` in `apps/web/.env.local`
- `/app` never auto-falls back to provisional data

## Docker Operations

- Start or reconcile infra containers: `pnpm docker:up`
- Stop infra containers: `pnpm docker:down`
- Recreate infra volumes from scratch: `pnpm docker:reset`
- Render the resolved compose file: `pnpm docker:config`
- Render the production release compose file: `pnpm docker:release:config`
- Create a compressed Postgres dump: `pnpm db:backup`
- Restore a Postgres dump: `pnpm db:restore -- --input backups/postgres/<file>.sql.gz`
- Pack the SDK like an npm publish candidate: `pnpm sdk:pack`
- Validate production env completeness: `pnpm ops:readiness`

The compose stack only manages Postgres and Redis. Persistent data lives in the named volumes `infra_pgdata` and `infra_redisdata`.

The observability overlay adds Prometheus, Alertmanager, and Grafana volumes on top of the same `infra` compose project without changing the base database/Redis services.

## Production Layout

The chosen launch-stage production path is:

- one AWS Ubuntu VPS
- Docker Compose release stack
- Caddy terminating TLS on `80` and `443`
- API and web kept internal to the Compose network
- optional observability services bound to `127.0.0.1`

Remote runtime files should live under `infra/` on the target host:

- `infra/.env`
- `infra/api.env`
- `infra/web.env`

Recommended bootstrap:

- copy `infra/.env.production.example` to `infra/.env`
- copy `infra/api.env.example` to `infra/api.env`
- copy `infra/web.env.example` to `infra/web.env`
- optionally run `infra/scripts/bootstrap-host.sh` on a new Ubuntu VPS before the first deploy

See `docs/PRODUCTION_BLUEPRINT.md` for the full decision record.

## Backup And Recovery

- create a compressed Postgres dump: `pnpm db:backup`
- restore from a dump: `pnpm db:restore -- --input backups/postgres/<file>.sql.gz`
- see `docs/BACKUP_AND_RECOVERY.md` for the operational policy notes

## Production Readiness Check

- run `pnpm ops:readiness` after filling real production env files
- it validates Mercado Pago, OAuth, SMTP, and domain-related requirements
- when `VOWGRID_PRIMARY_DOMAIN` is configured, it also probes `/v1/health` and `/v1/docs`

## Test Commands

- Unit: `pnpm test`
- Integration: `pnpm test:integration`
- Coverage: `pnpm test:coverage`
- E2E smoke: `pnpm test:e2e`
- Browser install for E2E: `pnpm test:e2e:install`

The E2E suite now covers:

- signup and protected app access
- invite acceptance and workspace switching
- password reset
- seeded workflow creation through execution and rollback
- receipt, audit, billing, and metrics visibility

## Billing Provider Setup

Mercado Pago is optional for general local development. Without provider envs:

- `/v1/billing/account` still works
- Trial, entitlement, usage, and warning states still render in the dashboard
- Self-serve checkout remains disabled and returns a configuration error if forced

To enable checkout locally, set these in `apps/api/.env`:

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_WEBHOOK_URL`
- `MERCADO_PAGO_RETURN_URL`

See `docs/billing/MERCADO_PAGO_SETUP.md` for the full setup flow.

Enterprise contact setup in `apps/web/.env.local`:

- `NEXT_PUBLIC_VOWGRID_ENTERPRISE_CONTACT_URL`
- or `NEXT_PUBLIC_VOWGRID_ENTERPRISE_CONTACT_EMAIL`

OAuth setup for the web and API:

- `GITHUB_OAUTH_CLIENT_ID`
- `GITHUB_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `APP_WEB_BASE_URL`
- `VOWGRID_WEB_BASE_URL`

Metrics endpoint protection:

- set `METRICS_AUTH_TOKEN` in `apps/api/.env`
- then call `GET /v1/metrics` with `Authorization: Bearer <token>`

## Troubleshooting

- If `pnpm docker:up` fails, Docker Desktop is usually not running.
- If `http://localhost:3000/app` keeps redirecting to `/login`, confirm the dashboard session is valid.
- If checkout stays disabled, verify the Mercado Pago envs in `apps/api/.env`.
- If `3000` is already occupied, run `pnpm --filter web dev -- --port 3001`.
- If `5432` or `6379` are already occupied, override the host ports in `infra/.env`.
- See `docs/TROUBLESHOOTING.md` for the broader local troubleshooting guide.

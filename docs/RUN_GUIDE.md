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
- Docker status: `pnpm docker:status`
- Docker logs: `pnpm docker:logs`

## API Auth Checks

Session auth:

- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `POST /v1/auth/logout`

Machine auth:

- Send `X-Api-Key: vowgrid_local_dev_key` to the workflow routes
- Create and rotate workspace-scoped API keys from `/app/settings`

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

## Preview Mode

- `/preview` exists only when `VOWGRID_ENABLE_PROVISIONAL_DATA=true` in `apps/web/.env.local`
- `/app` never auto-falls back to provisional data

## Docker Operations

- Start or reconcile infra containers: `pnpm docker:up`
- Stop infra containers: `pnpm docker:down`
- Recreate infra volumes from scratch: `pnpm docker:reset`
- Render the resolved compose file: `pnpm docker:config`

The compose stack only manages Postgres and Redis. Persistent data lives in the named volumes `infra_pgdata` and `infra_redisdata`.

## Test Commands

- Unit: `pnpm test`
- Integration: `pnpm test:integration`
- Coverage: `pnpm test:coverage`
- E2E smoke: `pnpm test:e2e`

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

## Troubleshooting

- If `pnpm docker:up` fails, Docker Desktop is usually not running.
- If `http://localhost:3000/app` keeps redirecting to `/login`, confirm the dashboard session is valid.
- If checkout stays disabled, verify the Mercado Pago envs in `apps/api/.env`.
- If `3000` is already occupied, run `pnpm --filter web dev -- --port 3001`.
- If `5432` or `6379` are already occupied, override the host ports in `infra/.env`.
- See `docs/TROUBLESHOOTING.md` for the broader local troubleshooting guide.

# Runbook

## Start the stack

1. Make sure Docker Desktop is running.
2. Install dependencies.
   `pnpm install`
3. Copy `apps/api/.env.example` to `apps/api/.env` if needed.
4. Start Postgres and Redis.
   `pnpm docker:up`
5. Apply migrations.
   `pnpm migrate`
6. Seed local data.
   `pnpm seed`
7. Start the API.
   `pnpm dev:api`
8. Create `apps/web/.env.local` from `apps/web/.env.example`.
9. Start the web app.
   `pnpm dev:web`

## Local ports

- Web: `3000`
- API: `4000`
- Postgres: `5432`
- Redis: `6379`

## Seeded local values

- API key: `vowgrid_local_dev_key`
- Workspace ID: `cmg0000000000000000000001`
- Agent ID: `cmg0000000000000000000002`
- Reviewer ID: `cmg0000000000000000000003`
- Mock connector ID: `cmg0000000000000000000004`

## Quick verification

- API health: `curl http://localhost:4000/v1/health`
- Swagger: open `http://localhost:4000/v1/docs`
- Web app: open `http://localhost:3000/app`

## Minimal workflow check

1. Create a draft intent with the seeded agent and connector.
2. Promote it with `POST /v1/intents/:intentId/propose`.
3. Simulate it with `POST /v1/intents/:intentId/simulate`.
4. Submit it for approval.
5. Approve it with the seeded reviewer.
6. Execute it.
7. Read the generated receipt.
8. Inspect `/v1/audit-events?entityId=<intentId>`.
9. Optionally request rollback and confirm the attempt appears as pending.

## Troubleshooting

- If `pnpm docker:up` fails, Docker Desktop is usually not running.
- If the web app shows the provisional adapter, confirm `apps/web/.env.local` points to `http://localhost:4000` and includes `vowgrid_local_dev_key`.
- If a client sends a body-less `POST` with a forced JSON content type, send `{}` instead or omit the header.
- If port `3000` is already occupied, run the web app on another port, for example `pnpm --filter web dev -- --port 3001`.

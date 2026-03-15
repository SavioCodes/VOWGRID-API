# VOWGRID-API

VowGrid is the trust layer between AI agents and real-world actions.

Case study: https://saviocodes.github.io/saviofilho.dev/work/vowgrid-api/

The product flow is:

`Propose -> Simulate -> Evaluate Policy -> Approve -> Execute -> Generate Receipt -> Rollback visibility`

## Monorepo

```text
vowgrid/
|-- apps/
|   |-- api/   Fastify API, Prisma schema, BullMQ worker
|   `-- web/   Next.js control plane and landing page
|-- packages/
|   |-- contracts/ Shared Zod schemas and response types
|   |-- ui/        Shared UI primitives
|   `-- config/    Shared package metadata
|-- docs/          Backend, design, runbook, and integration reports
`-- infra/         Docker Compose for Postgres and Redis
```

## Current Reality

- The API, contracts, and web app are now aligned on the core intent workflow.
- Root `build`, `lint`, `typecheck`, and `test` commands work.
- The repo now includes a real Prisma migration and a repeatable local seed path.
- The web app can render in live mode against the API when `apps/web` is started with the backend env configured.
- Rollback visibility exists, but rollback processing stops at a pending attempt because there is no rollback worker yet.

## Quick Start

1. Install dependencies.
   `pnpm install`
2. Copy `apps/api/.env.example` to `apps/api/.env` if you do not already have a local API env file.
3. Make sure Docker Desktop is running, then start local infra.
   `pnpm docker:up`
4. Apply migrations.
   `pnpm migrate`
5. Seed a local workspace, users, connectors, policies, and API key.
   `pnpm seed`
6. Start the API.
   `pnpm dev:api`
7. Configure the web app with the live API values from `apps/web/.env.example`, then start the web app.
   `pnpm dev:web`

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/v1/docs`

The seeded local API key is `vowgrid_local_dev_key`.

## Useful Commands

- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm migrate`
- `pnpm seed`
- `pnpm docker:up`
- `pnpm docker:down`

## Verified Status

Implemented and verified:

- Intent create, propose, simulate, policy evaluation, approval, execute, receipt generation
- Audit event listing
- Live and provisional web data adapters
- Root workspace verification scripts
- Local Docker, migration, and seed flow

Still partial:

- Rollback processing is not completed by a worker
- JWT dashboard auth does not exist
- User-facing API key management does not exist
- E2E test coverage is not present yet

## Docs

- `docs/FINAL_INTEGRATION_REPORT.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/RUNBOOK.md`
- `docs/FRONTEND_INTEGRATION_REPORT.md`
- `docs/backend/API_OVERVIEW.md`
- `docs/backend/LOCAL_DEVELOPMENT.md`

## Notes

- `docs/handoffs/*` remain historical handoff artifacts.
- The web app intentionally keeps a provisional adapter for environments where the live backend is unavailable.

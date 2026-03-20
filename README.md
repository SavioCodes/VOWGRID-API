# VOWGRID-API

VowGrid is the trust layer between AI agents and real-world actions.

Core product flow:

`Propose -> Simulate -> Evaluate Policy -> Approve -> Execute -> Generate Receipt -> Rollback visibility`

## Current Reality

- The core workflow is real end to end: intents, simulation, policy evaluation, approvals, execution, receipts, audit visibility, and queue-backed rollback.
- Human operators use session-backed dashboard auth with signup, login, password reset, email verification, invites, and workspace switching.
- Machine clients use workspace API keys and can integrate through raw HTTP or the repository-local TypeScript SDK in `packages/sdk`.
- Billing is deeper than a pricing mock: plan catalog, trial, entitlements, usage tracking, overage, coupons, tax profile controls, proration preview, invoices, and Mercado Pago foundations all exist.
- Runtime connectors currently registered by the API are `mock`, `http`, and `github`.
- CI validates typecheck, lint, unit tests, integration tests, coverage, build, and Playwright E2E on the latest push.

## Monorepo

```text
vowgrid/
|-- apps/
|   |-- api/   Fastify API, Prisma schema, queues, auth, billing
|   `-- web/   Next.js site and protected control plane
|-- packages/
|   |-- contracts/ Shared schemas and API types
|   |-- sdk/       TypeScript client SDK
|   `-- ui/        Shared UI primitives
|-- docs/          Canonical docs plus archive
`-- infra/         Compose, observability, and deploy topology
```

## Quick Start

1. `pnpm install`
2. Copy `apps/api/.env.development.example` to `apps/api/.env`
3. Copy `apps/web/.env.example` to `apps/web/.env.local`
4. Optionally copy `infra/.env.development.example` to `infra/.env`
5. `pnpm docker:up`
6. `pnpm migrate`
7. `pnpm seed`
8. `pnpm dev:api`
9. `pnpm dev:web`

Or use:

- `pnpm start:dev`

Local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/v1/docs`

Seeded local access:

- Dashboard email: `reviewer@vowgrid.local`
- Dashboard password: `vowgrid_local_password`
- API key: `vowgrid_local_dev_key`

## Documentation

Start with:

- [Documentation guide](docs/README.md)
- [Run guide](docs/RUN_GUIDE.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API reference](docs/API_REFERENCE.md)

Historical reports and handoffs now live under:

- [Documentation archive](docs/ARCHIVE/README.md)

## Useful Commands

- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm migrate`
- `pnpm seed`
- `pnpm docker:up`
- `pnpm docker:down`
- `pnpm docker:obs:up`
- `pnpm docker:release:config`
- `pnpm db:backup`
- `pnpm ops:readiness`

## External Prerequisites

The repository is code-complete for local development and CI, but these remain external setup:

- Mercado Pago credentials and webhook URL
- OAuth or OIDC provider credentials
- SMTP provider
- real host, DNS, and deploy secrets
- Enterprise contact inbox or form

See [External setup status](docs/EXTERNAL_SETUP_STATUS.md) and [Go-live checklist](docs/GO_LIVE_CHECKLIST.md) for the operational gaps.

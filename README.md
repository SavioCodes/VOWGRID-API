# VOWGRID-API

VowGrid is the trust layer between AI agents and real-world actions.

Case study: https://saviocodes.github.io/saviofilho.dev/work/vowgrid-api/

Core product flow:

`Propose -> Simulate -> Evaluate Policy -> Approve -> Execute -> Generate Receipt -> Rollback visibility`

## Architecture At A Glance

```mermaid
flowchart LR
  Browser[Operator browser] --> Web[apps/web]
  Web --> Contracts[packages/contracts]
  Web --> API[apps/api]
  API --> Prisma[Prisma]
  Prisma --> Postgres[(PostgreSQL)]
  API --> Redis[(Redis)]
  API --> Workers[BullMQ workers]
  API --> MercadoPago[Mercado Pago]
  Web --> UI[packages/ui]
```

## Current Reality

- The core trust workflow is implemented through receipt generation, audit visibility, queue-backed execution, and queue-backed rollback.
- Dashboard auth is now real: email/password signup and login create a session-backed dashboard experience, password reset and email verification are implemented, and GitHub/Google OAuth can be enabled with env-backed provider credentials.
- Workspace access management is real: owners and admins can create, update, disable, re-enable, and invite members directly from the dashboard.
- Multi-workspace membership and switching are implemented through accepted invites and the workspace switcher in the app shell.
- API keys exist as the machine-to-machine auth path and can now be created, rotated, and revoked from the dashboard.
- Billing is implemented internally with launch pricing, a backend-managed 14-day trial, usage tracking, entitlement enforcement, automatic overage invoicing on paid plans, proration previews for plan changes, invoice records, and Mercado Pago provider integration foundations.
- Provisional data still exists, but only behind the explicit dev-only `/preview` route when enabled.
- CI now validates typecheck, lint, unit tests, integration tests, coverage, build, and deep E2E paths that cover auth, invites, billing surfaces, execution, receipts, rollback, and observability assertions.
- A Prometheus-compatible metrics endpoint exists at `/v1/metrics`, and a self-hosted observability stack now lives in `infra/observability` with Prometheus, Alertmanager, and Grafana wiring for both local and release-style environments.
- The chosen launch-stage production path is now explicit: AWS VPS, Docker Compose, Caddy TLS termination, one primary domain, and only `80` / `443` exposed publicly.

## Monorepo

```text
vowgrid/
|-- apps/
|   |-- api/   Fastify API, Prisma schema, auth, billing, BullMQ worker
|   `-- web/   Next.js site, auth pages, and protected control plane
|-- packages/
|   |-- contracts/ Shared Zod schemas and API types
|   `-- ui/        Shared UI primitives
|-- docs/          Run guides, reports, backend, design, and billing docs
`-- infra/         Docker Compose for Postgres and Redis
```

## Quick Start

1. Install dependencies with `pnpm install`.
2. Copy `apps/api/.env.development.example` to `apps/api/.env`.
3. Copy `apps/web/.env.development.example` to `apps/web/.env.local`.
4. Optionally copy `infra/.env.development.example` to `infra/.env` if you need custom Docker ports or credentials.
5. Start Docker Desktop, then run `pnpm docker:up`.
6. Apply migrations with `pnpm migrate`.
7. Seed local data with `pnpm seed`.
8. Start the API with `pnpm dev:api`.
9. Start the web app with `pnpm dev:web`.

Or use the unified dev command:

- `pnpm start:dev`

Local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/v1/docs`

Seeded local access:

- Dashboard email: `reviewer@vowgrid.local`
- Dashboard password: `vowgrid_local_password`
- API key: `vowgrid_local_dev_key`

## Common Scenarios

### Human operator path

1. Sign up at `/signup` or log in at `/login`.
2. Review the control plane at `/app`.
3. Use `/forgot-password`, `/verify-email`, or social login when the current auth posture requires it.
4. Manage workspace members, invites, workspace switching, and programmatic API keys from `/app/settings`.
5. Review billing, usage, invoices, and trial state from `/app/billing`.

### Machine-to-machine path

```bash
curl -H "X-Api-Key: vowgrid_local_dev_key" \
  http://localhost:4000/v1/intents?pageSize=5
```

### End-to-end trust workflow

See `docs/REAL_WORLD_SCENARIOS.md` for common intent, billing, and enterprise paths.

## Auth Model

- Human dashboard access uses session-backed auth through `/v1/auth/signup`, `/v1/auth/login`, `/v1/auth/me`, and `/v1/auth/logout`.
- Recovery and verification routes exist for password reset, email verification, invite acceptance, and workspace switching.
- GitHub and Google OAuth flows are supported when provider credentials are configured.
- The web app stores the session token in an HttpOnly cookie named `vowgrid_dashboard_session`.
- Protected product routes live under `/app`.
- Owners and admins can manage members, invites, and workspace-scoped API keys directly from the dashboard.
- API keys remain the direct auth layer for programmatic clients.

## Billing Snapshot

| Plan       | Monthly        | Yearly         | Executed actions / month | Intents / month | Self-serve checkout |
| ---------- | -------------- | -------------- | ------------------------ | --------------- | ------------------- |
| Launch     | `R$ 79`        | `R$ 790`       | `300`                    | `2,000`         | Yes                 |
| Pro        | `R$ 249`       | `R$ 2,490`     | `3,000`                  | `15,000`        | Yes                 |
| Business   | `R$ 799`       | `R$ 7,990`     | `20,000`                 | `100,000`       | Yes                 |
| Enterprise | `Sob consulta` | `Sob consulta` | Custom                   | Custom          | No                  |

Launch billing notes:

- Free trial: `14` days, managed internally by the VowGrid backend
- Primary commercial metric: executed actions per month
- Secondary usage guardrail: intents per month
- Paid subscriptions can use automatic overage billing for intents and executed actions
- Plan changes compute proration previews and record proration invoice line items
- Enterprise remains sales-assisted

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
- `pnpm docker:status`
- `pnpm docker:logs`
- `pnpm docker:obs:up`
- `pnpm docker:obs:down`
- `pnpm docker:obs:status`
- `pnpm docker:obs:logs`
- `pnpm docker:release:config`

Useful live endpoints:

- `GET /v1/health`
- `GET /v1/metrics`
- `GET /v1/docs`

## Documentation

Current docs:

- `docs/ARCHITECTURE.md`
- `docs/TECH_CHOICES.md`
- `docs/ENVIRONMENT_STRATEGY.md`
- `docs/DEPLOYMENT_FLOW.md`
- `docs/PRODUCTION_BLUEPRINT.md`
- `docs/OBSERVABILITY_STACK.md`
- `docs/GO_LIVE_CHECKLIST.md`
- `docs/EXTERNAL_SETUP_STATUS.md`
- `docs/AGENT_INTEGRATION_GUIDE.md`
- `docs/TROUBLESHOOTING.md`
- `docs/REAL_WORLD_SCENARIOS.md`
- `docs/ROADMAP.md`
- `docs/RUN_GUIDE.md`
- `docs/AUTH_SETUP.md`
- `docs/ACCESS_MANAGEMENT.md`
- `docs/ENTERPRISE_HANDOFF.md`
- `docs/ROLLBACK_PROCESSING.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/PROJECT_AUDIT_REPORT.md`
- `docs/billing/BILLING_ARCHITECTURE.md`
- `docs/billing/PRICING_STRATEGY.md`
- `docs/billing/MERCADO_PAGO_SETUP.md`
- `docs/billing/ENTITLEMENTS_AND_LIMITS.md`
- `docs/backend/API_OVERVIEW.md`
- `docs/backend/DOMAIN_MODEL.md`
- `docs/backend/STATUS.md`

Historical reports:

- `docs/FINAL_INTEGRATION_REPORT.md`
- `docs/FRONTEND_INTEGRATION_REPORT.md`
- `docs/BILLING_UPDATE_REPORT.md`
- `docs/handoffs/*`

## Known Limitations

- Enterprise still depends on a configured contact inbox and manual commercial handling.
- Mercado Pago checkout still requires real provider env configuration.
- Social login requires real GitHub or Google OAuth credentials before the provider buttons become usable.
- Advanced tax handling and full invoice compliance workflows are not implemented yet.
- The self-hosted observability stack is included, but external notification receivers and vendor-specific sinks still require environment-specific setup if you want Datadog, Sentry, or similar tools.
- Deploy automation and Terraform scaffolding now encode a concrete production path, but they still require real GitHub secrets, DNS, registry setup, remote env files, and target infrastructure values before they can be treated as production-ready.

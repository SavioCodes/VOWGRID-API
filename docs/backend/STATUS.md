# Backend Status

> Last updated: 2026-03-15

## Implementation Status

| Component | Status | Notes |
| --- | --- | --- |
| Monorepo scaffolding | Complete | pnpm workspaces and shared packages are in place |
| Docker Compose | Complete | Local Postgres 16 and Redis 7 stack |
| Prisma schema and migrations | Complete | Core operational models plus billing models are migrated locally |
| Seed data | Complete | Repeatable seed includes workspace, users, connectors, policies, API key, trial state, and usage counters |
| Server bootstrap | Complete | Fastify 5, plugins, error handler, Swagger |
| API key auth | Complete | Current production path for authenticated API access |
| Billing module | Complete | Catalog, account endpoint, entitlement resolution, usage tracking, checkout foundation, webhook endpoint |
| Intents module | Complete | Draft through receipt flow is implemented |
| Policies module | Complete | MVP policy engine plus billing gating for advanced policy types |
| Approvals module | Complete | Approval workflow plus billing gating for advanced approval mode |
| Executions module | Complete | Queue path, receipts, and billing gating for executed action limits |
| Connectors module | Partial | Mock connector works; Slack remains a skeleton |
| Audit module | Complete | Queryable audit trail across product actions |
| Mercado Pago setup | Partial | Code path exists, but provider account and env setup are still manual |
| Webhook authenticity in production mode | Partial | Signature validation is implemented when a webhook secret is configured |
| JWT auth | Not implemented | Dashboard login flow does not exist |
| API key self-service | Not implemented | No user-facing management routes |
| Rollback worker | Not implemented | Rollback visibility exists, but no worker completes the rollback |
| Automated E2E coverage | Not implemented | No dedicated E2E suite yet |

## What Actually Works

- Create, propose, simulate, approve, execute, and inspect receipts
- Query audit events
- Resolve billing account state for a workspace
- Manage a backend-owned 14-day trial
- Track current-month intent and executed-action usage
- Warn near plan limits and hard-block critical write paths at hard limits
- Start Mercado Pago checkout when provider envs are configured
- Accept and idempotently process Mercado Pago subscription webhooks

## Partial Or Known Gaps

- Rollback processing stops at the visible pending state
- Internal user and multi-workspace limits are surfaced but not yet tied to self-serve provisioning flows
- Enterprise still needs a real sales path before launch
- Slack connector is not ready for real execution

## Known Limitations

1. JWT dashboard auth is not available.
2. User-facing API key management is not available.
3. Automatic overage billing is intentionally not implemented in this release.
4. Tax and invoice systems are intentionally out of scope for this release.

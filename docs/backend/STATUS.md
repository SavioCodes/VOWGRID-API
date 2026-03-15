# Backend Status

> Last updated: 2026-03-15

## Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Monorepo scaffolding | ✅ Complete | pnpm workspaces, shared configs |
| Docker Compose | ✅ Complete | Postgres 16 + Redis 7 |
| Prisma schema | ✅ Complete | 16 entities, indexes, relations |
| Prisma migration | ⏳ Pending | Requires Docker running |
| Server bootstrap | ✅ Complete | Fastify 5, plugins, error handler |
| Auth plugin | ✅ Complete | API key auth with hashing |
| Health module | ✅ Complete | DB + Redis check |
| Intents module | ✅ Complete | CRUD + 13-state machine |
| Simulations module | ✅ Complete | Connector simulation orchestration |
| Policies module | ✅ Complete | MVP policy engine (5 rule types) |
| Approvals module | ✅ Complete | Multi-step approval workflow |
| Executions module | ✅ Complete | BullMQ queue + rollback |
| Connectors module | ✅ Complete | Framework + mock + Slack skeleton |
| Receipts module | ✅ Complete | Execution proof |
| Audits module | ✅ Complete | Queryable audit trail |
| Execution worker | ✅ Complete | BullMQ worker with retries |
| Contracts package | ✅ Complete | Shared Zod schemas + types |
| Unit tests | ✅ Complete | 65 tests (state machine + policy engine) |
| Integration tests | ❌ Not started | Route-level tests |
| E2E tests | ❌ Not started | Full lifecycle flow |
| Seed data | ❌ Not started | Dev seed script |
| User/JWT auth | ❌ Not started | Foundation only (API key) |
| Webhook module | ❌ Not started | Event notifications |

## What Actually Works

- Full intent lifecycle through all 13 states
- Connector simulation via pluggable connectors
- MVP policy evaluation (5 rule types)
- Multi-step approval with policy gating
- BullMQ execution with retry and receipt generation
- Audit trail for every action
- Rollback awareness with connector capability checking

## What Is Stubbed/Incomplete

- **Slack connector**: validate + simulate work, execute + rollback throw errors
- **JWT auth**: Only API key auth is implemented
- **Webhooks**: Not implemented
- **Seed data**: No dev seed script yet
- **Integration/E2E tests**: Only unit tests exist
- **Database migration**: Prisma schema exists but migration hasn't been run (requires Docker)

## Known Limitations

1. No multi-workspace support in routes (auth scopes to one workspace per API key)
2. No pagination on receipts endpoint
3. Policy engine doesn't support compound rules (AND/OR logic)
4. No webhook notifications for state changes
5. No API key creation endpoint (must be created manually or via Prisma Studio)

# Backend Status

> Last updated: 2026-03-18

## Implementation Status

| Component                               | Status   | Notes                                                                                                     |
| --------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| Monorepo scaffolding                    | Complete | pnpm workspaces and shared packages are in place                                                          |
| Docker Compose                          | Complete | Local Postgres 16 and Redis 7 stack                                                                       |
| Prisma schema and migrations            | Complete | Core operational models plus billing models are migrated locally                                          |
| Seed data                               | Complete | Repeatable seed includes workspace, users, connectors, policies, API key, trial state, and usage counters |
| Server bootstrap                        | Complete | Fastify 5, plugins, error handler, Swagger                                                                |
| API key auth                            | Complete | Current production path for authenticated API access                                                      |
| Billing module                          | Complete | Catalog, account endpoint, entitlement resolution, usage tracking, checkout foundation, webhook endpoint  |
| Intents module                          | Complete | Draft through receipt flow is implemented                                                                 |
| Policies module                         | Complete | MVP policy engine plus billing gating for advanced policy types                                           |
| Approvals module                        | Complete | Approval workflow plus billing gating for advanced approval mode                                          |
| Executions module                       | Complete | Queue path, receipts, and billing gating for executed action limits                                       |
| Connectors module                       | Partial  | Mock connector works; Slack remains a skeleton                                                            |
| Audit module                            | Complete | Queryable audit trail across product actions                                                              |
| Mercado Pago setup                      | Partial  | Code path exists, but provider account and env setup are still manual                                     |
| Webhook authenticity in production mode | Partial  | Signature validation is implemented when a webhook secret is configured                                   |
| Dashboard session auth                  | Complete | Signup, login, logout, and `/me` are implemented                                                          |
| API key self-service                    | Complete | Owners and admins can create, rotate, and revoke workspace API keys                                       |
| Rollback worker                         | Complete | Dedicated BullMQ worker completes rollback attempts and writes receipts                                   |
| Automated E2E coverage                  | Partial  | Smoke path exists through Playwright; coverage is still intentionally shallow                             |

## What Actually Works

- Create, propose, simulate, approve, execute, and inspect receipts
- Query audit events
- Resolve billing account state for a workspace
- Manage a backend-owned 14-day trial
- Track current-month intent and executed-action usage
- Warn near plan limits and hard-block critical write paths at hard limits
- Start Mercado Pago checkout when provider envs are configured
- Accept and idempotently process Mercado Pago subscription webhooks
- Create, rotate, revoke, and list workspace API keys from session-backed dashboard routes
- Complete rollback asynchronously and record rollback receipts

## Partial Or Known Gaps

- Internal user and multi-workspace limits are surfaced but not yet tied to self-serve provisioning flows
- Enterprise still needs a real sales path before launch
- Slack connector is not ready for real execution

## Known Limitations

1. Automatic overage billing is intentionally not implemented in this release.
2. Tax and invoice systems are intentionally out of scope for this release.
3. Password reset, email verification, invites, and SSO are still missing.
4. Multi-workspace membership and switching are still missing.

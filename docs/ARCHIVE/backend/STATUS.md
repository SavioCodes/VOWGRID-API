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
| Password reset and email verification   | Complete | Request and confirmation paths are implemented and verified                                               |
| OAuth dashboard auth                    | Partial  | GitHub and Google flows exist but require provider env configuration                                      |
| Workspace member admin                  | Complete | Owners and admins can create, update, disable, and re-enable members                                      |
| Workspace invites and switching         | Complete | Invite creation, acceptance, and multi-workspace switching are implemented                                |
| API key self-service                    | Complete | Owners and admins can create, rotate, and revoke workspace API keys                                       |
| Rollback worker                         | Complete | Dedicated BullMQ worker completes rollback attempts and writes receipts                                   |
| Automatic overage billing               | Complete | Paid workspaces can exceed included limits and generate invoice line items                                |
| Proration preview                       | Partial  | Proration math and invoice line items exist, but full provider-backed plan changes need provider setup    |
| Metrics endpoint                        | Complete | `/v1/metrics` exposes Prometheus-style metrics with optional bearer-token protection                      |
| Automated E2E coverage                  | Partial  | Auth, recovery, and invite/switch flows are covered; broader browser coverage is still intentionally thin |

## What Actually Works

- Create, propose, simulate, approve, execute, and inspect receipts
- Query audit events
- Resolve billing account state for a workspace
- Manage a backend-owned 14-day trial
- Track current-month intent and executed-action usage
- Warn near plan limits and hard-block critical write paths at hard limits
- Start Mercado Pago checkout when provider envs are configured
- Accept and idempotently process Mercado Pago subscription webhooks
- Request password resets and confirm them with expiring tokens
- Request email verification and confirm it with expiring tokens
- Create invites, accept them, and switch between active workspace memberships
- Create, update, disable, re-enable, and list workspace members from session-backed dashboard routes
- Create, rotate, revoke, and list workspace API keys from session-backed dashboard routes
- Complete rollback asynchronously and record rollback receipts
- Emit Prometheus-compatible application metrics from `/v1/metrics`

## Partial Or Known Gaps

- Enterprise still needs a real sales path before launch
- Slack connector is not ready for real execution
- OAuth only becomes active when real provider credentials are configured
- Proration is calculated internally, but full provider-backed plan change flows still depend on Mercado Pago setup
- Observability is still local-first; dashboards and alert routing are not configured

## Known Limitations

1. Tax and invoice compliance systems are still intentionally out of scope for this release.
2. Enterprise SSO is still not implemented.
3. Centralized observability and alerting are still not wired.
4. Deploy automation and Terraform need production secrets, hosts, and hardening before they should be treated as launch-ready.
   > Archived on 2026-03-19 during documentation cleanup.
   > This backend status snapshot is historical and has been superseded by `docs/IMPLEMENTATION_STATUS.md`.
   > Use `docs/ARCHITECTURE.md`, `docs/API_REFERENCE.md`, and `docs/IMPLEMENTATION_STATUS.md` for current truth.

# Implementation Status

## Fully Implemented And Verified

| Area                                                               | Status                              |
| ------------------------------------------------------------------ | ----------------------------------- |
| Shared contracts package                                           | Implemented and used by API and web |
| Intent lifecycle through receipt generation                        | Implemented and live-verified       |
| Policy evaluation during approval submission                       | Implemented and live-verified       |
| Audit event listing                                                | Implemented and live-verified       |
| Dashboard signup, login, logout, and `/me` flow                    | Implemented and verified            |
| Protected app shell under `/app`                                   | Implemented and verified            |
| Public landing page, pricing page, and billing dashboard           | Implemented                         |
| Internal billing catalog for Launch, Pro, Business, and Enterprise | Implemented                         |
| Backend-managed 14-day trial state                                 | Implemented                         |
| Billing entitlements, warnings, and hard-block logic               | Implemented                         |
| Usage tracking for intents and executed actions                    | Implemented                         |
| Mercado Pago checkout foundation and webhook endpoint              | Implemented                         |
| API key management from the dashboard                              | Implemented                         |
| Rollback worker and rollback receipts                              | Implemented                         |
| GitHub Actions CI with integration, coverage, and smoke E2E        | Implemented                         |
| Root `build`, `lint`, `typecheck`, and `test` scripts              | Implemented and verified            |
| Prisma migration and local seed flow                               | Implemented and verified            |

## Partially Implemented

| Area                               | Current state                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Mercado Pago account setup         | Code path exists, but checkout remains disabled until provider envs are configured                     |
| Workspace identity in the shell    | One workspace per user is real; multi-workspace switching is intentionally hidden                      |
| Internal user and workspace limits | Limits are modeled and surfaced, but there are no invite or workspace provisioning flows yet           |
| Enterprise contact path            | Enterprise is sales-assisted and now env-configurable, but still depends on manual commercial handling |
| Preview mode                       | Available only through explicit `/preview` access when `VOWGRID_ENABLE_PROVISIONAL_DATA=true`          |

## Not Implemented Yet

| Area                                | Gap                                      |
| ----------------------------------- | ---------------------------------------- |
| Automatic overage billing           | No metered charging or overage invoicing |
| Complex proration                   | No proration engine for plan changes     |
| Advanced tax and invoice systems    | Not implemented                          |
| Password reset                      | Not implemented                          |
| Email verification                  | Not implemented                          |
| Invites and membership management   | Not implemented                          |
| SSO or social login                 | Not implemented                          |
| Deep E2E coverage                   | Only smoke coverage exists so far        |
| Automated staging/production deploy | Not implemented                          |
| Infrastructure as Code              | Not implemented                          |

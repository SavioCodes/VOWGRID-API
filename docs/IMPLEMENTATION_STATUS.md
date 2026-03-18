# Implementation Status

## Fully Implemented And Verified

| Area                                                               | Status                              |
| ------------------------------------------------------------------ | ----------------------------------- |
| Shared contracts package                                           | Implemented and used by API and web |
| Intent lifecycle through receipt generation                        | Implemented and live-verified       |
| Policy evaluation during approval submission                       | Implemented and live-verified       |
| Audit event listing                                                | Implemented and live-verified       |
| Dashboard signup, login, logout, and `/me` flow                    | Implemented and verified            |
| Password reset request and confirmation                            | Implemented and verified            |
| Email verification request and confirmation                        | Implemented and verified            |
| Protected app shell under `/app`                                   | Implemented and verified            |
| Public landing page, pricing page, and billing dashboard           | Implemented                         |
| Internal billing catalog for Launch, Pro, Business, and Enterprise | Implemented                         |
| Backend-managed 14-day trial state                                 | Implemented                         |
| Billing entitlements, warnings, and hard-block logic               | Implemented                         |
| Usage tracking for intents and executed actions                    | Implemented                         |
| Automatic overage billing for paid workspaces                      | Implemented and verified            |
| Invoice records and proration previews                             | Implemented                         |
| Mercado Pago checkout foundation and webhook endpoint              | Implemented                         |
| Single-workspace member management from the dashboard              | Implemented                         |
| Invite-by-email acceptance flow                                    | Implemented and verified            |
| Multi-workspace membership and switching                           | Implemented and verified            |
| API key management from the dashboard                              | Implemented                         |
| Rollback worker and rollback receipts                              | Implemented                         |
| GitHub Actions CI with integration, coverage, and smoke E2E        | Implemented                         |
| Prometheus-compatible metrics endpoint                             | Implemented                         |
| Release Dockerfiles, release compose, and Terraform scaffold       | Implemented                         |
| Root `build`, `lint`, `typecheck`, and `test` scripts              | Implemented and verified            |
| Prisma migration and local seed flow                               | Implemented and verified            |

## Partially Implemented

| Area                       | Current state                                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Mercado Pago account setup | Code path exists, but checkout remains disabled until provider envs are configured                                      |
| Social login               | GitHub and Google OAuth flows exist, but require provider envs before the buttons become active                         |
| Deploy automation          | GitHub Actions workflows, release compose, and Dockerfiles exist, but require real secrets, registry setup, and targets |
| Infrastructure as Code     | Terraform scaffold exists for an AWS VPS-style environment, but still needs real values and hardening for production    |
| Enterprise contact path    | Enterprise is sales-assisted and now env-configurable, but still depends on manual commercial handling                  |
| Preview mode               | Available only through explicit `/preview` access when `VOWGRID_ENABLE_PROVISIONAL_DATA=true`                           |
| Observability              | Native metrics endpoint exists, but centralized sinks, dashboards, and alert routing are still external-setup dependent |
| Deep E2E coverage          | Real auth and invite flows are covered, but the overall product journey still needs broader browser coverage            |

## Not Implemented Yet

| Area                             | Gap                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| SSO beyond GitHub/Google OAuth   | Enterprise identity providers and SAML/OIDC setup are not implemented              |
| Advanced tax and invoice systems | No jurisdiction-aware invoicing or full compliance engine exists                   |
| Centralized observability        | No Datadog, Prometheus stack, New Relic, or Sentry wiring is configured yet        |
| Production-grade deploy setup    | Workflows and Terraform scaffold need real secrets, infra values, and host wiring  |
| Deep E2E coverage                | The main browser paths are covered, but execution, billing, and rollback need more |

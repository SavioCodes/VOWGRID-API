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
| Workspace data export and member anonymization                     | Implemented and verified            |
| Rollback worker and rollback receipts                              | Implemented                         |
| Runtime connectors for mock, HTTP, and GitHub                      | Implemented and verified            |
| TypeScript client SDK package                                      | Implemented                         |
| Generic enterprise OIDC auth path                                  | Implemented                         |
| Coupon application and tax profile controls                        | Implemented                         |
| GitHub Actions CI with integration, coverage, and smoke E2E        | Implemented                         |
| Prometheus-compatible metrics endpoint                             | Implemented                         |
| Self-hosted Prometheus, Alertmanager, and Grafana stack            | Implemented                         |
| Optional Sentry, Datadog, and New Relic error sinks                | Implemented                         |
| Release Dockerfiles, release compose, and Terraform scaffold       | Implemented                         |
| Blue/green single-host deploy path                                 | Implemented                         |
| Root `build`, `lint`, `typecheck`, and `test` scripts              | Implemented and verified            |
| Prisma migration and local seed flow                               | Implemented and verified            |

## Partially Implemented

| Area                       | Current state                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mercado Pago account setup | Code path exists, but checkout remains disabled until provider envs are configured                                                                                                  |
| Social login               | GitHub and Google OAuth flows exist, but require provider envs before the buttons become active                                                                                     |
| Enterprise OIDC            | Generic OIDC flow exists in the web auth layer, but still requires issuer, client credentials, and enterprise IdP setup                                                             |
| Deploy automation          | GitHub Actions workflows now target a concrete AWS VPS + Compose + Caddy path, but still require real secrets, registry setup, and hosts                                            |
| Infrastructure as Code     | Terraform scaffold exists for the chosen AWS VPS launch topology, but still needs real values and hardening for production                                                          |
| Enterprise contact path    | Enterprise is sales-assisted and now env-configurable, but still depends on manual commercial handling                                                                              |
| Preview mode               | Available only through explicit `/preview` access when `VOWGRID_ENABLE_PROVISIONAL_DATA=true`                                                                                       |
| Observability vendor sinks | Self-hosted metrics, dashboards, and alert rules exist, and optional Sentry / Datadog / New Relic sinks are wired, but provider setup and alert routing remain environment-specific |
| Deep E2E coverage          | Core auth, invite, workspace switch, billing surface, execution, receipt, rollback, and metrics flows are covered, but the full regression matrix still needs more scenarios        |
| Privacy controls           | Workspace export and member anonymization exist, but broad GDPR automation and repository-wide soft delete semantics are still incomplete                                           |
| Advanced billing           | Coupons, tax profile controls, overage, and proration exist, but refunds and full multi-jurisdiction invoice compliance remain incomplete                                           |

## Not Implemented Yet

| Area                             | Gap                                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| SAML enterprise SSO              | Generic OIDC is available, but SAML-specific enterprise federation is not implemented                           |
| Advanced tax and invoice systems | No jurisdiction-aware fiscal issuance or full compliance engine exists                                          |
| Refund processing                | Coupons, overage, and proration exist, but provider-backed refund automation is not implemented                 |
| Production-grade deploy setup    | The path is now chosen, but workflows and Terraform still need real secrets, DNS, infra values, and host wiring |

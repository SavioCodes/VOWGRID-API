# Implementation Status

## Fully Implemented And Verified

| Area | Status |
| --- | --- |
| Shared contracts package | Implemented and used by API and web |
| Intent lifecycle through receipt generation | Implemented and live-verified |
| Policy evaluation during approval submission | Implemented and live-verified |
| Audit event listing | Implemented and live-verified |
| Dashboard signup, login, logout, and `/me` flow | Implemented and verified |
| Protected app shell under `/app` | Implemented and verified |
| Public landing page, pricing page, and billing dashboard | Implemented |
| Internal billing catalog for Launch, Pro, Business, and Enterprise | Implemented |
| Backend-managed 14-day trial state | Implemented |
| Billing entitlements, warnings, and hard-block logic | Implemented |
| Usage tracking for intents and executed actions | Implemented |
| Mercado Pago checkout foundation and webhook endpoint | Implemented |
| Root `build`, `lint`, `typecheck`, and `test` scripts | Implemented and verified |
| Prisma migration and local seed flow | Implemented and verified |

## Partially Implemented

| Area | Current state |
| --- | --- |
| Mercado Pago account setup | Code path exists, but checkout remains disabled until provider envs are configured |
| Rollback | Request and visibility exist, but there is no processor to complete rollback work |
| Workspace identity in the shell | One workspace per user is real; multi-workspace switching is intentionally hidden |
| Internal user and workspace limits | Limits are modeled and surfaced, but there are no invite or workspace provisioning flows yet |
| Enterprise contact path | Enterprise is sales-assisted, but still needs a real inbox or form |
| Preview mode | Available only through explicit `/preview` access when `VOWGRID_ENABLE_PROVISIONAL_DATA=true` |

## Not Implemented Yet

| Area | Gap |
| --- | --- |
| Automatic overage billing | No metered charging or overage invoicing |
| Complex proration | No proration engine for plan changes |
| Advanced tax and invoice systems | Not implemented |
| Password reset | Not implemented |
| Email verification | Not implemented |
| Invites and membership management | Not implemented |
| SSO or social login | Not implemented |
| API key self-service management | No user-facing route or UI |
| Automated E2E coverage | No dedicated E2E suite |
| Rollback worker | No asynchronous rollback execution pipeline |

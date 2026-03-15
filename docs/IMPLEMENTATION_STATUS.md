# Implementation Status

## Fully implemented and verified

| Area | Status |
| --- | --- |
| Shared contracts package | Implemented and used by API and web |
| Intent lifecycle through receipt generation | Implemented and live-verified |
| Policy evaluation during approval submission | Implemented and live-verified |
| Audit event listing | Implemented and live-verified |
| Web landing page and control-plane shell | Implemented |
| Intents, policy, approvals, executions, receipts, connectors, audit, settings surfaces | Implemented |
| Root `build`, `lint`, `typecheck`, `test` scripts | Implemented and verified |
| Prisma migration and local seed flow | Implemented and verified |

## Partially implemented

| Area | Current state |
| --- | --- |
| Rollback | Rollback request and visibility exist, but there is no processor to complete rollback work |
| Live workspace labels | Core data is live, but human directory labels still fall back to provisional data |
| Connector catalog | Mock connector is fully usable; Slack remains a partial skeleton |
| Frontend live mode | Works when env is configured, but provisional fallback still exists by design |

## Not implemented yet

| Area | Gap |
| --- | --- |
| JWT dashboard auth | No backend or frontend login flow |
| API key self-service management | No user-facing route or UI |
| Automated E2E coverage | No dedicated E2E suite |
| Rollback worker | No asynchronous rollback execution pipeline |

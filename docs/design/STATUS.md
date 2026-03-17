# Design Status

## Completed

- Replaced the stock Next.js starter with a branded landing page and premium control-plane shell
- Added shared UI primitives in `packages/ui`
- Added contract-aware web adapters with live session-backed loading for the protected dashboard
- Added overview, intents, simulation, policy review, approvals, executions, receipts, connectors, audit, and settings routes
- Added loading, error, empty, and success states across the app shell
- Verified the `/app` subtree renders dynamically so live integration mode is chosen at runtime

## Important truths

- The backend now exposes `draft -> proposed` and returns policy evaluation history on intent detail
- The protected dashboard now uses session-backed auth for human operators, while API keys remain the machine auth layer
- Provisional data is isolated to the explicit `/preview` route and is no longer used as an automatic fallback inside `/app`
- Rollback visibility exists, but rollback processing is still incomplete

## Next sensible steps

- Add a rollback processor and receipt flow for rollback completion
- Add password reset, invites, and API key self-service management
- Add workspace and directory endpoints so live mode can show human labels without provisional data
- Add route-level and E2E web coverage now that seeded backend data exists

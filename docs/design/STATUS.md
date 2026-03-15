# Design Status

## Completed

- Replaced the stock Next.js starter with a branded landing page and premium control-plane shell
- Added shared UI primitives in `packages/ui`
- Added contract-aware web adapters with a visible provisional fallback
- Added overview, intents, simulation, policy review, approvals, executions, receipts, connectors, audit, and settings routes
- Added loading, error, empty, and success states across the app shell
- Verified the `/app` subtree renders dynamically so live integration mode is chosen at runtime

## Important truths

- The backend now exposes `draft -> proposed` and returns policy evaluation history on intent detail
- The web app can run in live mode against the local API when `VOWGRID_API_BASE_URL` and `VOWGRID_API_KEY` are set
- Dashboard JWT auth is still not implemented; API key auth is the current backend truth
- Rollback visibility exists, but rollback processing is still incomplete

## Next sensible steps

- Add a rollback processor and receipt flow for rollback completion
- Add user-facing auth and API key management
- Add workspace and directory endpoints so live mode can show human labels without provisional data
- Add route-level and E2E web coverage now that seeded backend data exists

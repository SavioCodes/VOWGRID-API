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
- Password reset, email verification, invite acceptance, and workspace switching are now real product flows instead of placeholder account states
- Provisional data is isolated to the explicit `/preview` route and is no longer used as an automatic fallback inside `/app`
- Rollback now runs through a dedicated BullMQ worker and writes rollback receipts on success or failure
- `/app/settings` is now a real admin surface for member management, invite management, workspace switching, and API key lifecycle operations
- `/app/billing` now shows overage posture and invoice visibility instead of a trial-only billing summary

## Next sensible steps

- Add workspace and directory endpoints so live mode can show human labels without provisional data
- Deepen social login and enterprise SSO posture beyond GitHub/Google OAuth
- Deepen route-level and E2E web coverage now that seeded backend data exists
  > Archived on 2026-03-19 during documentation cleanup.
  > This design status snapshot is historical and has been superseded by the current design docs and implementation status.

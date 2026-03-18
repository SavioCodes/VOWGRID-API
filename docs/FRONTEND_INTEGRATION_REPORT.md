# Frontend Integration Report

> Historical snapshot from the earlier frontend/design pass.
> Current frontend truth now lives in `README.md`, `docs/IMPLEMENTATION_STATUS.md`, `docs/PROJECT_AUDIT_REPORT.md`, and `docs/AUTH_SETUP.md`.

## 1. What was inspected

- `README.md`
- `docs/backend/*`
- `docs/design/*`
- `docs/handoffs/BACKEND_TO_GEMINI.md`
- `packages/contracts/*`
- `apps/api/*`
- `apps/web/*`

`docs/handoffs/GEMINI_FRONTEND_REPORT.md` was not present.

## 2. What UI/screens/components were created or refined

- Marketing landing page
- Control-plane shell with sidebar, workspace switcher, and command bar
- Overview dashboard
- Intents list and detail
- Simulation review
- Policy review
- Approval queue
- Execution monitor
- Receipt detail
- Connector management
- Audit explorer
- Settings/auth-truth surface
- Shared UI primitives in `packages/ui`

## 3. What is wired to real backend contracts

- Intent list and intent detail
- Policy evaluations on live intent detail
- Connector list
- Policy list
- Receipt detail
- Audit event list
- Health endpoint
- Canonical intent states from `@vowgrid/contracts`

The web app uses:

- `VOWGRID_API_BASE_URL`
- `VOWGRID_API_KEY`

## 4. What still uses provisional adapters or mocks

- Full UI rendering when live env vars are missing or the backend is unreachable
- Workspace naming and directory labels that the current backend does not expose
- Demo-only records used for design review when live mode is unavailable
- Mock connector execution for the verified local end-to-end flow

## 5. What was fixed

- Replaced the stock starter UI with the VowGrid product experience
- Added shared primitives in `packages/ui`
- Expanded `packages/contracts` for frontend-facing detail payloads
- Wired the live adapter to the current backend routes
- Added runtime rendering for the `/app` subtree so live mode is not frozen at build time
- Updated the web env example to the API's local port `4000`

## 6. What remained at the time of this report

- There was no user-facing JWT auth flow
- There was no user-facing API key management UI or backend route
- There was no live workspace directory API for human-readable labels
- There was no rollback worker to move rollback attempts beyond visibility and pending state

## 7. What commands were run

- `pnpm --filter web typecheck`
- `pnpm --filter web lint`
- `pnpm --filter web build`
- `pnpm exec next start --port 3002` with live API env injected for verification

## 8. What passed / failed

- `typecheck`: passed
- `lint`: passed
- `build`: passed
- Live `next start` verification: passed after the `/app` subtree was changed to runtime rendering

## Drift notes

- The web control plane now reflects the current API flow, including `draft -> proposed`.
- The live policy review surface now receives policy evaluation history from the backend detail route.
- Provisional mode remains intentionally visible for offline or partially configured environments.

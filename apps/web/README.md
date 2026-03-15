# VowGrid Web

Premium Next.js frontend for the VowGrid control plane.

## What it includes

- Landing page at `/`
- Control plane shell at `/app`
- Intents, approvals, executions, policies, connectors, audit, and settings
- Intent detail, simulation, policy review, and receipt detail views
- Shared primitives from `packages/ui`
- Live contract adapter with a clearly labeled provisional fallback

## Environment

Create `apps/web/.env.local` from `apps/web/.env.example` when you want live API data:

```bash
VOWGRID_API_BASE_URL=http://localhost:4000
VOWGRID_API_KEY=vowgrid_local_dev_key
VOWGRID_ENABLE_PROVISIONAL_DATA=true
```

If those vars are absent, the web app renders with the isolated provisional adapter and labels that state in the UI.

## Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web typecheck
```

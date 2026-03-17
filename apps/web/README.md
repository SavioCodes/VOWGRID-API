# VowGrid Web

Next.js frontend for the VowGrid site and protected control plane.

## What It Includes

- Landing page at `/`
- Pricing page at `/pricing`
- Login page at `/login`
- Signup page at `/signup`
- Protected control plane under `/app`
- Explicit dev-only preview page at `/preview`

## Environment

Create `apps/web/.env.local` from `apps/web/.env.example`:

```bash
VOWGRID_API_BASE_URL=http://localhost:4000
VOWGRID_ENABLE_PROVISIONAL_DATA=false
```

Notes:

- `/app` uses dashboard session auth and does not fall back to provisional data.
- `/preview` only works when `VOWGRID_ENABLE_PROVISIONAL_DATA=true`.

## Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web typecheck
```

# Contributing

## Development standards

- Use Conventional Commits.
- Prefer shared contracts in `packages/contracts` instead of duplicating API shapes.
- Keep product truth honest: do not invent backend behavior or silent mock fallbacks.
- Add or update docs when behavior, setup, or public routes change.

## Local setup

1. `pnpm install`
2. Copy:
   - `apps/api/.env.development.example` to `apps/api/.env`
   - `apps/web/.env.development.example` to `apps/web/.env.local`
   - `infra/.env.development.example` to `infra/.env`
3. `pnpm start:dev`

## Validation before opening a PR

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration`
- `pnpm build`

Run `pnpm test:e2e` when you change login, billing, or primary web flows.

## Commit style

Recommended format:

- `feat(api): add rollback worker`
- `feat(web): add API key management surface`
- `docs(project): expand architecture and onboarding guides`
- `fix(integration): align auth and machine access routes`

## Where to start

- Product behavior and runbooks: `README.md` and `docs/RUN_GUIDE.md`
- Architecture and design: `docs/ARCHITECTURE.md` and `docs/TECH_CHOICES.md`
- Backend API truth: `docs/backend/API_OVERVIEW.md`
- Open work: `docs/ROADMAP.md`

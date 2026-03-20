# Contributing

## Development standards

- Use Conventional Commits.
- Prefer shared contracts in `packages/contracts` instead of duplicating API shapes.
- Keep product truth honest: do not invent backend behavior or silent mock fallbacks.
- Update canonical docs when behavior, setup, workflows, or public routes change.

## Local setup

1. `pnpm install`
2. Copy:
   - `apps/api/.env.development.example` to `apps/api/.env`
   - `apps/web/.env.example` to `apps/web/.env.local`
   - `infra/.env.development.example` to `infra/.env` if needed
3. `pnpm start:dev`

## Validation before opening a PR

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration`
- `pnpm build`

Run `pnpm test:e2e` when you change auth, billing, or primary web flows.

## Commit style

Recommended format:

- `feat(api): add rollback worker`
- `feat(web): add API key management surface`
- `docs(project): simplify canonical documentation`
- `fix(integration): align auth and machine access routes`

## Where to start

- Product overview and docs map: [README.md](README.md) and [docs/README.md](docs/README.md)
- Local setup and workflow verification: [docs/RUN_GUIDE.md](docs/RUN_GUIDE.md)
- Architecture and design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/TECH_CHOICES.md](docs/TECH_CHOICES.md)
- Current implementation truth: [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md)
- API routes and auth model: [docs/API_REFERENCE.md](docs/API_REFERENCE.md) and [docs/AUTH_SETUP.md](docs/AUTH_SETUP.md)
- Open work: [docs/ROADMAP.md](docs/ROADMAP.md)

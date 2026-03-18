# Environment Strategy

## Pattern

Use this naming pattern consistently:

- `apps/api/.env.development.example`
- `apps/api/.env.production.example`
- `apps/web/.env.development.example`
- `apps/web/.env.production.example`
- `infra/.env.development.example`
- `infra/.env.production.example`

Local working files should remain:

- `apps/api/.env`
- `apps/web/.env.local`
- `infra/.env`

## Principles

- Example files are committed and documented.
- Real secrets never enter the repository.
- Development and production examples stay structurally aligned.
- The web app only exposes values that truly need to be public via `NEXT_PUBLIC_*`.

## Current important variables

### API

- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `API_KEY_SALT`
- Mercado Pago variables

### Web

- `VOWGRID_API_BASE_URL`
- `VOWGRID_ENABLE_PROVISIONAL_DATA`
- `NEXT_PUBLIC_VOWGRID_ENTERPRISE_CONTACT_EMAIL`

### Infra

- Postgres credentials and host port overrides
- Redis host port override

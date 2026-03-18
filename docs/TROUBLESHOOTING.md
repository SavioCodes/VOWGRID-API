# Troubleshooting

## Common local problems

### Docker containers do not start

- Confirm Docker Desktop is running.
- Run `pnpm docker:status`.
- If ports are occupied, override them in `infra/.env`.

### Prisma or integration tests fail

- Confirm Postgres is running with `pnpm docker:status`.
- Re-run `pnpm migrate`.
- Re-run `pnpm seed`.

### Web keeps redirecting to `/login`

- Log in again or create a new workspace through `/signup`.
- Confirm `apps/web/.env.local` points to the correct API base URL.

### API key does not authenticate

- Check whether the key was revoked or rotated from `/app/settings`.
- Confirm the request sends `X-Api-Key`.

### Mercado Pago checkout is disabled

- This is expected until provider envs are configured.
- Verify the Mercado Pago variables in `apps/api/.env`.

### E2E tests fail to boot the app

- Ensure `apps/api/.env` and `apps/web/.env.local` exist.
- Install browsers with `pnpm test:e2e:install`.
- Confirm Postgres and Redis are running.

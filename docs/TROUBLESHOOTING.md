# Troubleshooting

## Common local problems

### Docker containers do not start

- Confirm Docker Desktop is running.
- Run `pnpm docker:status`.
- If ports are occupied, override them in `infra/.env`.

### Release compose does not render

- Run `pnpm docker:release:config`.
- Confirm `infra/.env.production.example` still matches the current release compose variables.
- On a real host, confirm `infra/.env`, `infra/api.env`, and `infra/web.env` exist.

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

### OAuth buttons do not appear or do nothing

- Confirm GitHub or Google client ids and secrets are set in both API and web env files.
- Confirm the provider redirect URIs match the current web base URL.
- In production, confirm the callback domain matches the primary Caddy-served domain.

### Metrics or observability look empty

- Confirm the API is up and `/v1/metrics` is reachable.
- If `METRICS_AUTH_TOKEN` is set, include `Authorization: Bearer <token>` when scraping.
- Run `pnpm docker:obs:status` and confirm Prometheus, Alertmanager, and Grafana are healthy.

### Production deploy looks healthy but the site is not reachable

- Confirm DNS points at the host.
- Confirm only `80` and `443` are exposed publicly and that Caddy is running.
- Confirm the remote `infra/.env` contains the expected `VOWGRID_PRIMARY_DOMAIN`.
- Confirm the host firewall and cloud security group allow `80` and `443`.

### E2E tests fail to boot the app

- Ensure `apps/api/.env` and `apps/web/.env.local` exist.
- Install browsers with `pnpm test:e2e:install`.
- Confirm Postgres and Redis are running.

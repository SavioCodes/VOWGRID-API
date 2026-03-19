# Runbook

This is the operator quick-reference for VowGrid. If you only need the essential commands and incident flow, start here.

For deeper detail, also use:

- `docs/RUN_GUIDE.md`
- `docs/OPERATIONS.md`
- `docs/TROUBLESHOOTING.md`
- `docs/BACKUP_AND_RECOVERY.md`

## Fast Start

### Local

```bash
pnpm install
pnpm docker:up
pnpm migrate
pnpm seed
pnpm dev:api
pnpm dev:web
```

### Release host

```bash
docker compose --env-file infra/.env -f infra/docker-compose.release.yml up -d
docker compose --env-file infra/.env -f infra/docker-compose.release.yml ps
docker compose --env-file infra/.env -f infra/docker-compose.release.yml logs --tail=200
```

## Core Health Checks

```bash
curl http://localhost:4000/v1/health
curl http://localhost:4000/v1/docs
curl http://localhost:4000/v1/metrics
pnpm docker:status
```

Release equivalents:

```bash
curl https://<domain>/v1/health
curl https://<domain>/v1/docs
```

## Standard Release Validation

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm test:integration`
5. `pnpm test:e2e`
6. `pnpm build`
7. `pnpm docker:release:config`
8. `pnpm ops:readiness`

## Docker Cheat Sheet

```bash
pnpm docker:up
pnpm docker:down
pnpm docker:status
pnpm docker:logs
pnpm docker:obs:up
pnpm docker:obs:down
pnpm docker:release:config
```

## Database Recovery

```bash
pnpm db:backup
pnpm db:restore -- --input backups/postgres/<file>.sql.gz
```

## Primary Incident Flow

### Product unavailable

1. Check `docker compose ps`
2. Check API, web, Caddy, Postgres, and Redis logs
3. Confirm `/v1/health`
4. Roll back the last release if the issue started immediately after deployment

### Workflow degraded

1. Check API logs
2. Check Redis health
3. Check execution and rollback metrics
4. Check connector-specific configuration

### Billing degraded

1. Check `pnpm ops:readiness`
2. Check billing routes
3. Check Mercado Pago webhook delivery
4. Check workspace billing account state

## What Still Requires Human Setup

- Mercado Pago production credentials
- OAuth provider credentials
- SMTP provider
- production domain and DNS
- GitHub Actions secrets
- enterprise contact inbox or form

## Escalation Rule

If a failure is caused by missing real credentials, external DNS, host provisioning, or billing-provider setup, it is not a repository bug. Track it as environment setup, not code failure.

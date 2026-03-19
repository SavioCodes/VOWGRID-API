# Docker Guide

VowGrid uses Docker in two different ways:

- local infrastructure for development
- release-style runtime topology for API, web, and ingress

## Local Development Stack

Primary local file:

- `infra/docker-compose.yml`

Services:

- `postgres`
- `redis`

Commands:

```bash
pnpm docker:up
pnpm docker:down
pnpm docker:status
pnpm docker:logs
pnpm docker:config
pnpm docker:reset
```

Named volumes:

- `infra_pgdata`
- `infra_redisdata`

## Observability Overlay

Compose overlay:

- `infra/docker-compose.observability.yml`

Commands:

```bash
pnpm docker:obs:up
pnpm docker:obs:down
pnpm docker:obs:status
pnpm docker:obs:logs
pnpm docker:obs:config
```

This adds:

- Prometheus
- Alertmanager
- Grafana

## Release Topology

Release compose:

- `infra/docker-compose.release.yml`

Services:

- `caddy`
- `postgres`
- `redis`
- `api`
- `web`
- optional observability profile

## Dockerfiles

Application images are built from:

- `apps/api/Dockerfile`
- `apps/web/Dockerfile`

The API image builds the contracts package and the API dist output.

The web image builds the contracts package, typechecks shared UI, and runs a Next standalone production build.

## Volume Management

Local important volumes:

- `infra_pgdata`
- `infra_redisdata`

Release important volumes:

- `vowgrid_postgres_data`
- `vowgrid_redis_data`
- `vowgrid_caddy_data`
- `vowgrid_caddy_config`
- observability volumes when that profile is enabled

## Destructive Commands

Be careful with:

```bash
pnpm docker:reset
docker compose down -v
```

These remove persistent volumes and can wipe local development data.

## Useful Compose Checks

```bash
docker compose -f infra/docker-compose.yml ps
docker compose -f infra/docker-compose.yml logs --tail=200
docker compose --env-file infra/.env.production.example -f infra/docker-compose.release.yml config
```

## Recommended Local Flow

1. `pnpm docker:up`
2. `pnpm migrate`
3. `pnpm seed`
4. `pnpm dev:api`
5. `pnpm dev:web`

## Recommended Release Flow

1. build and publish images
2. fill `infra/.env`, `infra/api.env`, and `infra/web.env`
3. render config with `pnpm docker:release:config`
4. deploy with the release compose or the blue/green flow

## Current Limits

Docker is production-capable for the chosen single-host launch path, but it is not yet:

- a Kubernetes deployment
- a managed multi-node topology
- an IaC-complete platform by itself

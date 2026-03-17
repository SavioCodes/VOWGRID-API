# Docker

## Scope

VowGrid uses Docker only for local infrastructure services:

- PostgreSQL 16
- Redis 7

There are currently no committed application `Dockerfile`s for the API or web app. Local application processes still run directly with `pnpm`.

## Compose stack

The stack lives in `infra/docker-compose.yml` and is intentionally small:

- Compose project: `infra`
- Containers: `vowgrid-postgres`, `vowgrid-redis`
- Network: `infra_default`
- Persistent volumes: `infra_pgdata`, `infra_redisdata`

## Commands

- Start or reconcile infra: `pnpm docker:up`
- Stop infra: `pnpm docker:down`
- Show status: `pnpm docker:status`
- Tail service logs: `pnpm docker:logs`
- Render resolved compose config: `pnpm docker:config`
- Reset infra volumes from scratch: `pnpm docker:reset`

`docker:reset` is destructive because it removes the named Postgres and Redis volumes before recreating the stack.

## Local overrides

Optional overrides can be defined in `infra/.env` using `infra/.env.example` as the template.

Supported variables:

- `VOWGRID_POSTGRES_USER`
- `VOWGRID_POSTGRES_PASSWORD`
- `VOWGRID_POSTGRES_DB`
- `VOWGRID_POSTGRES_PORT`
- `VOWGRID_REDIS_PORT`

Defaults are development-safe and match the API example env file.

## Health and persistence

- Postgres healthcheck: `pg_isready`
- Redis healthcheck: `redis-cli ping`
- Both services use `restart: unless-stopped`
- Redis runs with append-only mode enabled for more durable local persistence
- Container logs are capped with Docker `json-file` rotation options

## Cleanup policy

Safe cleanup:

- Remove stopped orphan containers
- Remove empty orphan networks
- Remove dangling images or build cache when they exist

Protected by default:

- Named database volumes
- Named Redis volumes
- Any volume from another project unless its data is known to be disposable

This repository favors preserving local state over aggressive pruning.

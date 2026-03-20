# Deployment Flow

This document describes how the repository workflows behave today. It is intentionally honest about what is automated versus what still depends on external setup.

## Current Workflows

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-staging.yml`
- `.github/workflows/deploy-production.yml`
- `.github/workflows/deploy-production-bluegreen.yml`

## What CI Does

The main CI workflow now validates:

- dependency install
- contracts build needed by seed
- local env preparation from committed examples
- local Postgres and Redis startup
- Prisma migrate + seed
- typecheck
- lint
- unit tests
- integration tests
- coverage
- build
- Playwright E2E in a separate job

Latest push status is green for both:

- `quality-and-integration`
- `e2e`

## Staging Deploy Behavior

`deploy-staging.yml` is triggered on pushes to `main` and by manual dispatch.

It now behaves in two honest modes:

### Mode 1: staging secrets exist

The workflow:

1. logs in to GHCR
2. builds and pushes API and web images
3. connects to the remote host over SSH
4. copies release assets
5. runs the release compose deployment

### Mode 2: staging secrets are missing

The workflow:

1. detects that remote deploy secrets are not configured
2. skips remote deployment intentionally
3. exits green with an explicit log message

That means a green staging check does not always mean a remote staging host was updated. It only guarantees the workflow behaved correctly for the current repository configuration.

## Production Deploy Behavior

`deploy-production.yml` is manual only.

It is a real workflow and can:

1. build and push release images
2. connect to a configured host over SSH
3. copy release assets
4. run migrations and reconcile the release stack

But it still depends on:

- `PRODUCTION_DEPLOY_SSH_KEY`
- `PRODUCTION_DEPLOY_USER`
- `PRODUCTION_DEPLOY_HOST`
- `PRODUCTION_DEPLOY_PATH`
- a prepared remote host
- `infra/.env`, `infra/api.env`, and `infra/web.env` on that host

## Blue/Green Production Behavior

`deploy-production-bluegreen.yml` is also manual only.

It is structurally valid and manually triggerable, and it can:

1. build and push API and web images
2. copy blue/green compose and Caddy assets
3. deploy the selected slot
4. switch traffic through the blue/green host-side script

It still depends on the same production SSH and host prerequisites as the standard production workflow.

## Release Prerequisites

Before any real remote deploy, you still need:

- GHCR access
- a reachable SSH target
- Docker and Compose on the target host
- remote env files under `infra/`
- real provider credentials for billing/auth if those paths are expected to work in the target environment
- DNS and TLS setup consistent with `docs/PRODUCTION_BLUEPRINT.md`

## Release Checklist

1. CI is green on the branch or commit
2. Prisma migrations are reviewed
3. env example changes are committed when behavior changes
4. remote `infra/.env`, `infra/api.env`, and `infra/web.env` exist
5. billing, contact, and auth provider configuration is appropriate for the target environment
6. only `80` and `443` are exposed publicly
7. post-deploy smoke checks cover `/`, `/app`, `/v1/health`, and `/v1/docs`

## Terraform Scope

`infra/terraform/aws-vps` is a launch-stage scaffold for the chosen VPS path.

It is not a full production platform module set. You still need real values, host bootstrap, backup policy, secret handling, and provider setup around it.

## Related Docs

- `docs/PRODUCTION_BLUEPRINT.md`
- `docs/OPERATIONS.md`
- `docs/BLUE_GREEN_DEPLOY.md`
- `docs/GO_LIVE_CHECKLIST.md`
- `docs/EXTERNAL_SETUP_STATUS.md`

# Deployment Flow

## Current state

The repository now has CI for validation, but it does **not** yet have automatic staging or production deployment. This document describes the intended release path so engineers can reason about environment boundaries consistently.

## Suggested environments

### Development

- local Docker for Postgres and Redis
- API via `pnpm dev:api`
- Web via `pnpm dev:web`

### Staging

- production-like Postgres and Redis
- real Mercado Pago sandbox configuration
- smoke E2E after each deploy

### Production

- managed Postgres and Redis
- real Mercado Pago credentials
- protected secrets store
- centralized log shipping and error monitoring

## Release checklist

1. CI passes on the branch.
2. Migrations are reviewed.
3. Env changes are documented.
4. Billing/contact paths are configured for the target environment.
5. Smoke checks cover login, billing page, API key management, execution, and rollback.

## What is still missing

- automated deployment workflow
- Infrastructure as Code for staging/production
- centralized metrics/alerting integration

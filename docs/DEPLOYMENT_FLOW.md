# Deployment Flow

## Current State

The repository now has:

- validation CI in `.github/workflows/ci.yml`
- staging deploy automation in `.github/workflows/deploy-staging.yml`
- production deploy automation in `.github/workflows/deploy-production.yml`
- release Dockerfiles for `apps/api` and `apps/web`
- release compose in `infra/docker-compose.release.yml`
- Caddy-based TLS termination in `infra/Caddyfile`
- optional release observability profile in `infra/docker-compose.release.yml`
- Terraform scaffold in `infra/terraform/aws-vps`

Those pieces are real, but they still depend on external setup:

- GitHub Actions secrets
- GHCR or another image registry
- a reachable SSH target
- real production env files and secrets
- infrastructure values for Terraform

## Suggested Environments

### Development

- local Docker for Postgres and Redis
- API via `pnpm dev:api`
- Web via `pnpm dev:web`

### Staging

- production-like Postgres and Redis
- real Mercado Pago sandbox configuration
- `deploy-staging.yml` builds and pushes images, then deploys with Docker Compose over SSH
- smoke E2E after each deploy

### Production

- single AWS Ubuntu VPS with Docker, Docker Compose, and Caddy
- public ingress only on `80` and `443`
- API and web exposed internally and proxied behind the same primary domain
- remote runtime files stored under `infra/.env`, `infra/api.env`, and `infra/web.env`
- real Mercado Pago credentials
- protected secrets store
- `deploy-production.yml` runs only on manual dispatch
- optional `observability` compose profile for Prometheus, Alertmanager, and Grafana

## Release Checklist

1. CI passes on the branch.
2. Prisma migrations are reviewed and applied.
3. Env changes are documented in the committed example files.
4. `infra/.env`, `infra/api.env`, and `infra/web.env` exist on the target host.
   Start from `infra/.env.production.example`, `infra/api.env.example`, and `infra/web.env.example`.
5. Billing/contact paths are configured for the target environment.
6. Only `80` and `443` are exposed publicly at the infrastructure layer.
7. The deploy target can complete `pnpm migrate` inside the release API image.
8. Smoke checks cover the proxied web and API surfaces after deploy.

## Terraform Scope

`infra/terraform/aws-vps` is a launch-stage scaffold for a simple VPS-style deployment:

- VPC
- subnet
- security group
- EC2 instance
- cloud-init/user-data for Docker and Compose
- reverse-proxy-friendly ingress policy (`80` and `443` only for the app surface)

It is not yet a complete production platform module set. Database hardening, backups, secret distribution, TLS termination, and managed service choices still need to be designed for a real deployment target.

## What Is Still Missing

- reusable production modules beyond the single VPS scaffold
- secret management beyond GitHub and host-side `infra/*.env`
- hosted vendors or external notification receivers on top of the bundled observability stack
- rollout, rollback, and blue/green deployment strategy

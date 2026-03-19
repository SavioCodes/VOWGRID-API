# Production Blueprint

## Chosen Launch Path

VowGrid now has a single recommended production topology:

- one Ubuntu VPS on AWS
- Docker and Docker Compose on the host
- Caddy terminating TLS on `80` and `443`
- one primary domain serving both the web app and the API
- `apps/web` behind the root path
- `apps/api` behind `/v1/*`
- Postgres and Redis on the same host for launch-stage simplicity
- optional self-hosted Prometheus, Alertmanager, and Grafana bound to `127.0.0.1`

This is intentionally simple and operationally clear for the current stage of the product.

## Why This Path

- It matches the repository's existing Compose and Terraform scaffolding.
- It avoids exposing the raw Node processes publicly.
- It removes unnecessary CORS and multi-domain complexity.
- It keeps deploys understandable: build image, push image, SSH into host, run Compose.
- It is easy to harden incrementally later with managed data stores or separate worker hosts.

## Public Surface

- `https://app.example.com/` -> Next.js web app
- `https://app.example.com/app/*` -> protected control plane
- `https://app.example.com/pricing` -> public pricing
- `https://app.example.com/v1/*` -> Fastify API

Only `80` and `443` should be reachable from the public internet.

## Host Layout

Recommended remote layout:

```text
/opt/vowgrid/
`-- infra/
    |-- .env
    |-- api.env
    |-- web.env
    |-- Caddyfile
    |-- docker-compose.release.yml
    `-- observability/
```

## Runtime Env Files

The release compose now expects:

- `infra/.env`
  - compose-level values such as image tags, DB credentials, primary domain, and optional `COMPOSE_PROFILES`
- `infra/api.env`
  - API secrets and provider credentials
- `infra/web.env`
  - web-specific runtime values such as enterprise contact and optional OAuth client ids

Recommended bootstrap on a new host:

1. Copy `infra/.env.production.example` to `infra/.env`.
2. Copy `infra/api.env.example` to `infra/api.env`.
3. Copy `infra/web.env.example` to `infra/web.env`.
4. Replace all placeholder secrets and URLs before the first deploy.
5. Run `infra/scripts/bootstrap-host.sh` if you want the repository-standard Docker/bootstrap posture on a fresh Ubuntu VPS.

For repository-side validation, the compose file falls back to the committed production example env files under `infra/`.

## Deploy Flow

1. GitHub Actions builds and pushes the API and web images.
2. GitHub Actions copies `docker-compose.release.yml`, `Caddyfile`, committed release env examples, and `infra/observability` to the host.
3. The host uses `infra/.env` for compose variables and `infra/api.env` / `infra/web.env` for service env injection.
4. The workflow starts Postgres and Redis, runs Prisma migrations in the release API image, then reconciles the full stack.
5. The workflow verifies the API and web containers locally on the host.

## Blue/Green Option

The repository now also ships a single-host blue/green path:

- `infra/docker-compose.bluegreen.yml`
- `infra/Caddyfile.bluegreen`
- `.github/workflows/deploy-production-bluegreen.yml`

This keeps the same single-VPS philosophy while allowing slot-based cutovers between `blue` and
`green` services on the same host.

## Intentional Limits

- This is not a multi-node production platform yet.
- Secrets are still host-managed rather than coming from a dedicated secrets manager.
- Managed databases, fully hosted observability vendors, automated off-host backups, and multi-region rollout remain future upgrades.

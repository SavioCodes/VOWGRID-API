# Blue Green Deploy

VowGrid includes a single-host blue/green rollout path for teams that want safer cutovers without adding Kubernetes.

## When To Use It

Use blue/green when you want:

- lower-risk releases on one VPS
- clean traffic cutover between two app slots
- fast rollback to the previous slot

## Files

- `infra/docker-compose.bluegreen.yml`
- `infra/Caddyfile.bluegreen`
- `infra/.env.bluegreen.example`
- `.github/workflows/deploy-production-bluegreen.yml`

## Model

- one host
- two app slots: `blue` and `green`
- one live slot at a time behind Caddy
- deploy updates the inactive slot first
- validation runs before traffic flips

## Practical Flow

1. create `infra/.env`, `infra/api.env`, and `infra/web.env`
2. render config with:

```bash
docker compose --env-file infra/.env.bluegreen.example \
  -f infra/docker-compose.bluegreen.yml config
```

3. deploy the inactive slot
4. validate health before cutover
5. flip Caddy to the new slot
6. validate auth, `/v1/health`, `/v1/docs`, billing, and one trust workflow
7. roll back to the previous slot if validation fails

## Example Validation Commands

```bash
docker compose --env-file infra/.env.bluegreen.example \
  -f infra/docker-compose.bluegreen.yml ps

docker compose --env-file infra/.env.bluegreen.example \
  -f infra/docker-compose.bluegreen.yml logs --tail=200
```

## Limits

Blue/green still does not solve:

- secrets management
- database failover
- multi-node scale-out
- cross-region disaster recovery

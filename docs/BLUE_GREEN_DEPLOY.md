# Blue Green Deploy

## Purpose

VowGrid now includes a single-host blue/green deployment path for operators who want safer cutovers
without switching to Kubernetes.

## Files

- `infra/docker-compose.bluegreen.yml`
- `infra/Caddyfile.bluegreen`
- `infra/.env.bluegreen.example`
- `.github/workflows/deploy-production-bluegreen.yml`

## Model

- one host
- two application slots: `blue` and `green`
- Caddy routes traffic to the active slot
- the deploy workflow updates the inactive slot, validates it, then flips traffic

## What It Solves

- safer deploy cutovers
- easier rollbacks than in-place replacement
- no need for a cluster scheduler at current scale

## What It Does Not Solve

- multi-region failover
- managed autoscaling
- secrets management
- infrastructure provisioning by itself

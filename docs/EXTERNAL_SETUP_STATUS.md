# External Setup Status

This document separates repository-complete work from setup that must be finished outside Git.

## Repository-Complete

- auth flows
- password reset
- email verification
- invites and multi-workspace switching
- API key management
- billing catalog, trial, entitlements, overage, invoices, and proration preview
- Mercado Pago provider adapter and webhook endpoint
- generic enterprise OIDC path
- policy evaluation engine
- execution and rollback workers
- runtime connectors for `mock`, `http`, and `github`
- workspace export and member anonymization
- TypeScript SDK package
- self-hosted observability stack
- release compose, deploy workflows, and AWS VPS scaffold
- blue/green single-host deployment files

## External Setup Required

## Billing

- create Mercado Pago app/account
- set `MERCADO_PAGO_ACCESS_TOKEN`
- set `MERCADO_PAGO_WEBHOOK_SECRET`
- publish webhook URL
- validate one real checkout and one webhook event

## Auth

- configure SMTP provider
- configure optional GitHub OAuth app
- configure optional Google OAuth app
- configure optional enterprise OIDC issuer/client

## Deploy

- provision VPS
- configure DNS
- configure GitHub Actions secrets
- configure image registry access
- place `infra/.env`, `infra/api.env`, and `infra/web.env` on target host

## Enterprise

- configure real contact inbox or form
- define internal provisioning ownership

## Troubleshooting External Setup

Use these checks:

- `pnpm ops:readiness`
- `https://<domain>/v1/health`
- `https://<domain>/v1/docs`
- provider-specific credential validation in their console

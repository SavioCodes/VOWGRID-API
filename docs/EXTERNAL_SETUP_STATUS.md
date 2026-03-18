# External Setup Status

This document separates repository-complete work from external setup that must be finished outside Git.

## Repository-Complete

- auth flows
- password reset
- email verification
- invites and multi-workspace switching
- API key management
- billing catalog, trial, entitlements, overage, invoices, and proration preview
- billing coupons, tax profiles, and workspace billing customer controls
- Mercado Pago provider adapter and webhook endpoint
- generic enterprise OIDC path in the web auth layer
- policy evaluation engine
- execution and rollback workers
- runtime connectors for mock, HTTP, and GitHub
- workspace export and member anonymization
- TypeScript SDK package
- self-hosted observability stack
- optional Sentry, Datadog, and New Relic sinks
- release compose, deploy workflows, and AWS VPS scaffold
- blue/green single-host deployment files

## External Setup Required

### Production billing

- real Mercado Pago account
- production token
- webhook URL
- webhook secret
- live checkout validation

### Production auth

- real SMTP provider
- optional GitHub OAuth credentials
- optional Google OAuth credentials
- optional enterprise OIDC issuer and client credentials

### Production deploy

- target VPS
- DNS
- GitHub Actions secrets
- registry access
- remote runtime env files

### Enterprise path

- real sales inbox or form
- manual provisioning process owned by an operator

### Observability

- external alert receivers if desired
- optional vendor tooling such as Datadog, Sentry, or New Relic

## Intentionally Not In Scope

- SAML-specific enterprise federation
- advanced tax compliance engine
- jurisdiction-specific invoice compliance engine
- managed multi-region deployment platform
- provider-backed refund automation
- repository-wide soft delete semantics for every domain entity

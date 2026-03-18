# External Setup Status

This document separates repository-complete work from external setup that must be finished outside Git.

## Repository-Complete

- auth flows
- password reset
- email verification
- invites and multi-workspace switching
- API key management
- billing catalog, trial, entitlements, overage, invoices, and proration preview
- Mercado Pago provider adapter and webhook endpoint
- policy evaluation engine
- execution and rollback workers
- self-hosted observability stack
- release compose, deploy workflows, and AWS VPS scaffold

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

- enterprise SSO / SAML / generic OIDC
- advanced tax compliance engine
- jurisdiction-specific invoice compliance engine
- managed blue/green or multi-region deployment platform

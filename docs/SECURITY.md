# Security Guide

This document describes the current security posture of VowGrid, what is already implemented, and what still remains outside the MVP scope.

## Security Goals

VowGrid is a trust layer, so security goals are directly tied to product value:

- authenticate both humans and agents
- make approvals explicit
- keep sensitive configuration out of UI responses
- preserve reliable audit trails
- reduce accidental privilege escalation
- surface security gaps honestly instead of pretending they are closed

## Current Controls

## Authentication And Sessions

- dashboard users authenticate with email/password sessions
- password hashes are stored server-side, not raw passwords
- session tokens are stored hashed in the database
- sessions can be revoked on logout, member disable, and certain account actions
- password reset and email verification flows exist
- OAuth support exists for GitHub and Google when configured
- enterprise OIDC path exists for identity-provider-backed dashboard login

## Authorization

- operator RBAC exists with `owner`, `admin`, `member`, and `viewer`
- workspace admin routes explicitly enforce `owner`/`admin`
- billing mutation routes enforce billing-admin capability
- approval stages can now enforce reviewer roles per stage
- API keys remain workspace-scoped machine credentials

## Browser Security

- CSRF protection is implemented for dashboard form actions
- session cookies are HttpOnly
- `SameSite` protection is used
- Content Security Policy is explicitly configured
- CORS is allowlist-based in production

## API And Infra Security

- Fastify Helmet is enabled
- global rate limiting exists
- auth-specific rate limiting exists for public auth routes
- Swagger UI is served with CSP tightening
- connector configs are encrypted at rest before persistence
- API key rotation and expiry semantics now exist

## Audit Integrity

- audit events are append-oriented
- audit events now include an integrity chain (`previousHash`, `integrityHash`)
- this makes tampering detectable

This is tamper-evident, not immutable WORM storage.

## Sensitive Data Handling

- connector credentials are not returned by connector list routes
- billing provider payload handling is minimized
- password reset and verification tokens are stored hashed
- API keys are stored hashed

## Security Headers

Current server-side headers come from:

- `@fastify/helmet` on the API
- Next.js header configuration on the web
- Caddy on the edge

## Current Gaps

These are still open by design or by roadmap:

- no SAML-specific enterprise federation yet
- no MFA yet
- no dedicated secrets manager such as Vault
- no WAF configuration committed in the repo
- no hardware-backed key management
- no append-only external audit log archive yet
- no advanced jurisdiction-specific tax/compliance controls
- no full GDPR automation

## Production Hardening Checklist

Before real production go-live, complete:

1. set all production secrets outside Git
2. configure SMTP, Mercado Pago, OAuth, and domain secrets
3. review CORS allowlist for the final domains
4. set `METRICS_AUTH_TOKEN`
5. rotate seeded and local-only credentials
6. verify TLS and Caddy configuration on the real host
7. review rate-limit values against expected load
8. wire external alert receivers if needed
9. define backup retention and restore testing cadence

## Recommended Next Security Steps

Near-term:

- add MFA
- add formal secret rotation procedures
- add external immutable audit shipping
- add security-focused CI checks and dependency review

Later:

- enterprise SAML
- managed secret store
- WAF and stricter edge protections
- compliance automation by jurisdiction

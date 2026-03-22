# Changelog

All notable repository changes should be documented in this file.

This project follows a simple rule:

- shipped and user-visible repository baselines belong in a tagged release
- the changelog describes what is real in that tag
- operational prerequisites that still depend on external setup are called out explicitly

## [0.1.0] - 2026-03-21

First versioned baseline of the private VowGrid repository.

### Core workflow

- implemented the end-to-end intent lifecycle through receipts
- added queue-backed execution and rollback processing
- added policy evaluation and multi-step approval support
- kept audit and receipt history as durable product records

### Auth and access

- added dashboard signup, login, logout, password reset, and email verification
- added session-backed protected `/app` access
- added invites, member management, API key lifecycle, workspace switching, and multi-workspace membership
- added machine access through workspace API keys and the repository-local SDK

### Billing and commerce foundations

- added billing catalog, trial state, entitlements, usage tracking, overage, coupons, tax profile controls, and proration preview
- added invoice records and Mercado Pago integration foundations
- kept enterprise handling honest as a sales-assisted path

### Connectors and integrations

- shipped runtime connectors for `mock`, `http`, and `github`
- added a local TypeScript SDK package under `packages/sdk`
- added generic OIDC support and credential-gated GitHub and Google OAuth paths

### Infrastructure and operations

- added CI for typecheck, lint, unit, integration, coverage, build, and Playwright E2E
- added release Dockerfiles, release compose, blue/green deploy path, and AWS VPS scaffold
- added self-hosted observability with Prometheus, Alertmanager, and Grafana
- added managed data-store support so the API can run against provider Postgres and Redis

### Documentation

- reduced the docs surface to a smaller canonical set
- moved historical reports into `docs/ARCHIVE/`
- added a documentation index and audit report
- aligned setup, deploy, architecture, and implementation docs with the actual code and workflows

### Known external prerequisites

These are not repository gaps, but they still block a real production launch:

- permanent host and DNS
- GitHub deploy secrets
- SMTP provider
- Mercado Pago production credentials and webhook wiring
- OAuth or OIDC provider credentials
- enterprise commercial inbox or form

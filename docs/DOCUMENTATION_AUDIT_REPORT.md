# Documentation Audit Report

## What Was Inspected

- root docs: `README.md`, `CONTRIBUTING.md`
- all Markdown files under `docs/`
- app and package READMEs
- API, web, contracts, SDK, scripts, infra, tests, and CI workflows

## Canonical Docs Kept

- `README.md`
- `docs/README.md`
- `docs/IMPLEMENTATION_STATUS.md`
- `docs/RUN_GUIDE.md`
- `docs/RUNBOOK.md`
- `docs/ARCHITECTURE.md`
- `docs/API_REFERENCE.md`
- `docs/AUTH_SETUP.md`
- `docs/ACCESS_MANAGEMENT.md`
- `docs/SECURITY.md`
- `docs/TESTING.md`
- `docs/OPERATIONS.md`
- `docs/PRODUCTION_BLUEPRINT.md`
- `docs/DEPLOYMENT_FLOW.md`
- `docs/BACKUP_AND_RECOVERY.md`
- `docs/TROUBLESHOOTING.md`
- `docs/GO_LIVE_CHECKLIST.md`
- `docs/CONNECTOR_IMPLEMENTATIONS.md`
- `docs/CONNECTOR_DEV_GUIDE.md`
- `docs/AGENT_INTEGRATION_GUIDE.md`
- `docs/PRIVACY_AND_EXPORTS.md`
- `docs/ENTERPRISE_HANDOFF.md`
- `docs/REAL_WORLD_SCENARIOS.md`
- `docs/ROADMAP.md`
- `docs/OBSERVABILITY_STACK.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/billing/*`
- active design docs under `docs/design/`

## Docs Updated

- `README.md`
- `CONTRIBUTING.md`
- `docs/RUN_GUIDE.md`
- `docs/API_REFERENCE.md`
- `docs/DEPLOYMENT_FLOW.md`
- `docs/OBSERVABILITY_STACK.md`
- `docs/AUTH_SETUP.md`
- `docs/AGENT_INTEGRATION_GUIDE.md`

## Docs Added

- `docs/README.md`
- `docs/ARCHIVE/README.md`
- `docs/DOCUMENTATION_AUDIT_REPORT.md`

## Docs Merged

- `docs/SDK_GUIDE.md` into `docs/AGENT_INTEGRATION_GUIDE.md` and `packages/sdk/README.md`
- `docs/OBSERVABILITY_VENDORS.md` into `docs/OBSERVABILITY_STACK.md`
- `docs/ENVIRONMENT_STRATEGY.md` into `docs/RUN_GUIDE.md` and existing production docs
- `docs/DOCKER.md` into `docs/RUN_GUIDE.md` and `docs/OPERATIONS.md`
- `docs/backend/API_OVERVIEW.md` into `docs/API_REFERENCE.md`

## Docs Archived

- historical reports under `docs/ARCHIVE/reports/`
- backend pass docs under `docs/ARCHIVE/backend/`
- `docs/handoffs/BACKEND_TO_GEMINI.md` under `docs/ARCHIVE/handoffs/`
- `docs/design/STATUS.md` under `docs/ARCHIVE/design/`

## Docs Deleted

- `docs/SDK_GUIDE.md`
- `docs/OBSERVABILITY_VENDORS.md`
- `docs/ENVIRONMENT_STRATEGY.md`
- `docs/DOCKER.md`
- `docs/backend/API_OVERVIEW.md`

## Misleading Or Stale Docs Found

- older backend docs described outdated auth and connector truth
- historical integration reports looked active because they lived beside canonical docs
- setup docs referenced `apps/web/.env.development.example`, but the tracked file is `apps/web/.env.example`
- deploy docs overstated remote deploy readiness and did not reflect staging skip semantics

## Where Docs Were Out Of Sync With Code

- connector runtime truth: `mock`, `http`, and `github` are registered
- `/app` uses session auth and does not fall back to provisional data
- member management, invites, workspace switching, export, and API key lifecycle are implemented
- CI is green on the latest push and covers typecheck, lint, unit, integration, coverage, build, and E2E
- staging deploy may pass by intentionally skipping remote deployment when staging secrets are not configured
- billing includes overage, coupons, tax profile controls, proration preview, and invoice records
- generic OIDC exists, but SAML-specific enterprise federation still does not

## What Still Needs Attention

- production docs still depend on real SSH, DNS, provider credentials, and remote env files
- archived docs should stay unlinked from active guidance unless cited as history
- design docs should be revisited if the web shell changes significantly again
- deploy workflows still emit Node 20 deprecation warnings from marketplace actions

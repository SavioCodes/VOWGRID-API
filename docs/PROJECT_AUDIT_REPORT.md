# Project Audit Report

## What Was Inspected

- Root workspace structure and scripts
- `apps/api`
- `apps/web`
- `packages/contracts`
- `packages/ui`
- Prisma schema, migrations, and seed flow
- Docker compose, release Dockerfiles, and local infra usage
- GitHub Actions workflows and Terraform scaffold
- Main documentation and historical reports

## What Was Fake Or Misleading

- The protected dashboard previously depended on a static API key in the web env instead of real user auth.
- `/app` could silently fall back to provisional data when live integration failed.
- The shell previously implied workspace switching without a real membership model behind it.
- The Slack connector was still surfaced in runtime and preview data even though it had no real execute path.
- Several docs still described future-only auth, billing, and deploy features after code had already moved forward.

## What Was Removed Or Isolated

- Slack connector runtime registration was removed.
- Slack seed data was removed.
- Slack was removed from provisional connector surfaces.
- Automatic provisional fallback inside `/app` was removed.
- Preview data was isolated behind explicit `/preview` access.
- The modal workspace switcher was replaced with a real membership-backed workspace switcher.

## What Was Broken

- There was no real login/signup/logout flow.
- The web dashboard used `VOWGRID_API_KEY` as a pseudo-login model.
- Actor attribution in workflow transitions leaned on API-key or `system` semantics even for dashboard actions.
- Monorepo typecheck drift appeared when contracts changed but downstream packages still read stale `dist` exports.
- The Prisma schema modeled `AuditEvent` as if every audited entity were an `Intent`, which caused foreign-key failures for workspace and API-key audit events.
- Prisma CLI commands were brittle locally because `prisma.config.ts` did not load `apps/api/.env`.
- The design-system `Button` defaulted to `type="button"`, which silently broke several form submissions in the web app.

## What Was Fixed

- Added backend dashboard auth with signup, login, logout, and current-session endpoints.
- Added persisted session storage in Prisma.
- Added password hashing, session token hashing, password reset tokens, email verification tokens, OAuth account linking, and OAuth signup tokens.
- Updated the Fastify auth plugin to support both API key auth and bearer session auth.
- Protected `/app` with real session checks.
- Rewired the web repository to use the dashboard session instead of a static API key.
- Added `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/accept-invite`, and OAuth callback routes in the web app.
- Added explicit `/preview` behavior for provisional data.
- Added a seeded local dashboard user and password.
- Fixed actor attribution so session-authenticated actions are recorded as user-driven.
- Updated typecheck scripts so downstream packages rebuild contracts before consuming new exports.
- Added dashboard-backed workspace API key create, list, rotate, and revoke flows.
- Added workspace member create, update, disable, re-enable, invite, accept, and workspace-switch flows.
- Added a dedicated rollback worker and queue-backed rollback receipt generation.
- Added automatic overage invoicing, invoice records, and proration preview foundations for billing.
- Added release Dockerfiles, deploy workflows, Terraform scaffolding, and a Prometheus-compatible metrics endpoint.
- Fixed `prisma.config.ts` so local Prisma commands load `apps/api/.env`.
- Removed the polymorphic-audit foreign-key bug by making `AuditEvent` store polymorphic entity references without pretending they are always intents.
- Added dedicated integration and Playwright paths and aligned them with current UI copy.
- Fixed form submit regressions caused by non-submit buttons inside server-action forms.

## Auth Added Or Completed

- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `POST /v1/auth/logout`
- `POST /v1/auth/password-reset/request`
- `POST /v1/auth/password-reset/confirm`
- `POST /v1/auth/email-verification/request`
- `POST /v1/auth/email-verification/verify`
- `POST /v1/auth/oauth/complete`
- `POST /v1/auth/oauth/signup/complete`
- `POST /v1/auth/invites/accept`
- `POST /v1/auth/switch-workspace`
- Next.js login, signup, recovery, verification, invite, and OAuth callback pages
- Logout action in the app shell
- Protected `/app` route group

## Commands Run

- `pnpm docker:up`
- `pnpm --filter @vowgrid/contracts build`
- `pnpm migrate`
- `pnpm seed`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:coverage`
- `pnpm test:e2e:install`
- `pnpm test:e2e`
- `pnpm build`
- `pnpm format`
- `pnpm format:check`

Manual verification:

- `POST /v1/auth/login` via real login request
- `GET /v1/auth/me`
- `POST /v1/auth/logout`
- password reset request and confirmation
- email verification request and confirmation
- unauthenticated `/app` redirect behavior
- authenticated `/app` access with session cookie
- authenticated `/login` redirect back to `/app`
- invite acceptance and workspace switching
- workflow verification through create, propose, simulate, approval, execute, receipt, audit, and rollback completion
- workspace API key lifecycle verification through create, list, rotate, revoke, and auth checks
- workspace member lifecycle verification through create, update, disable, enable, and login/session checks

## What Passed

- Root `typecheck`
- Root `lint`
- Root `test`
- Root `test:integration`
- Root `test:coverage`
- Root `test:e2e`
- Root `build`
- Root `format:check`
- Prisma migration and seed
- Session-authenticated web access
- Session-authenticated API access
- API-key-driven workflow access

## What Failed

- `pnpm format:check` initially failed before the Prettier pass; it passed after formatting.
- No standing command failed after the fixes above.

## What Still Remains

- Enterprise SSO beyond GitHub/Google OAuth
- Enterprise contact path with a real inbox or form
- Advanced tax handling and invoice compliance
- Deeper E2E coverage beyond auth, invite, and recovery paths
- Centralized observability sinks, dashboards, and alerting
- Production-hardening of deploy workflows and Terraform values

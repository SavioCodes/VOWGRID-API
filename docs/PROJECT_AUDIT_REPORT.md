# Project Audit Report

## What Was Inspected

- Root workspace structure and scripts
- `apps/api`
- `apps/web`
- `packages/contracts`
- `packages/ui`
- Prisma schema, migrations, and seed flow
- Docker compose and local infra usage
- Main documentation and historical reports

## What Was Fake Or Misleading

- The protected dashboard previously depended on a static API key in the web env instead of real user auth.
- `/app` could silently fall back to provisional data when live integration failed.
- The shell showed a modal workspace switcher even though multi-workspace switching was not real.
- The Slack connector was still surfaced in runtime and preview data even though it had no real execute path.
- Several docs still described “future JWT auth” as if dashboard auth did not exist.

## What Was Removed Or Isolated

- Slack connector runtime registration was removed.
- Slack seed data was removed.
- Slack was removed from provisional connector surfaces.
- Automatic provisional fallback inside `/app` was removed.
- Preview data was isolated behind explicit `/preview` access.
- The modal workspace switcher was replaced with a static workspace identity surface.

## What Was Broken

- There was no real login/signup/logout flow.
- The web dashboard used `VOWGRID_API_KEY` as a pseudo-login model.
- Actor attribution in workflow transitions leaned on API-key or `system` semantics even for future dashboard actions.
- Monorepo typecheck drift appeared when contracts changed but downstream packages still read stale `dist` exports.
- The Prisma schema modeled `AuditEvent` as if every audited entity were an `Intent`, which caused foreign-key failures for workspace and API-key audit events.
- Prisma CLI commands were brittle locally because `prisma.config.ts` did not load `apps/api/.env`.
- Integration and E2E commands existed only partially and needed dedicated configuration to run cleanly.

## What Was Fixed

- Added backend dashboard auth with signup, login, logout, and current-session endpoints.
- Added persisted session storage in Prisma.
- Added password hashing and session token hashing.
- Updated the Fastify auth plugin to support both API key auth and bearer session auth.
- Protected `/app` with real session checks.
- Rewired the web repository to use the dashboard session instead of a static API key.
- Added `/login` and `/signup` pages with real server actions.
- Added explicit `/preview` behavior for provisional data.
- Added a seeded local dashboard user and password.
- Fixed actor attribution so session-authenticated actions are recorded as user-driven.
- Updated typecheck scripts so downstream packages rebuild contracts before consuming new exports.
- Added dashboard-backed workspace API key create, list, rotate, and revoke flows.
- Added a dedicated rollback worker and queue-backed rollback receipt generation.
- Fixed `prisma.config.ts` so local Prisma commands load `apps/api/.env`.
- Removed the polymorphic-audit foreign-key bug by making `AuditEvent` store polymorphic entity references without pretending they are always intents.
- Added dedicated integration and Playwright smoke test paths and aligned them with current UI copy.

## Auth Added Or Completed

- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `GET /v1/auth/me`
- `POST /v1/auth/logout`
- Next.js login page
- Next.js signup page
- Logout action in the app shell
- Protected `/app` route group

## Commands Run

- `pnpm docker:up`
- `pnpm --filter @vowgrid/contracts build`
- `pnpm --filter @vowgrid/contracts typecheck`
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

Manual verification:

- `POST /v1/auth/login` via real login request
- `GET /v1/auth/me`
- `POST /v1/auth/logout`
- unauthenticated `/app` redirect behavior
- authenticated `/app` access with session cookie
- authenticated `/login` redirect back to `/app`
- workflow verification through create, propose, simulate, approval, execute, receipt, audit, and rollback completion
- workspace API key lifecycle verification through create, list, rotate, revoke, and auth checks

## What Passed

- Root `typecheck`
- Root `lint`
- Root `test`
- Root `test:integration`
- Root `test:coverage`
- Root `test:e2e`
- Root `build`
- Prisma migration and seed
- Session-authenticated web access
- Session-authenticated API access
- API-key-driven workflow access

## What Failed

- No standing command failed after the fixes above.

One verification nuance:

- PowerShell `Invoke-RestMethod` can send an awkward content type on body-less POSTs. During manual API verification, sending `{}` as JSON made those requests explicit and stable.

## What Still Remains

- Password reset
- Email verification
- Invites and membership management
- SSO
- Enterprise contact path with a real inbox or form
- Deeper E2E coverage beyond the smoke path
- Automated staging/production deployment and Infrastructure as Code

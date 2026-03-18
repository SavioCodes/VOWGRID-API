# Billing Architecture

## Scope

This release adds the first monetization layer for VowGrid with these goals:

- keep billing truth inside the VowGrid backend
- use Mercado Pago as the provider
- support a backend-managed 14-day free trial
- surface clear entitlements and usage in the product
- block critical write actions when hard limits are reached
- support automatic overage billing on paid plans
- keep the architecture ready for richer metering and compliance later

## Source Of Truth

Billing truth is internal. The product does not treat raw Mercado Pago payloads as the subscription source of truth.

Canonical internal state:

- current plan
- billing cycle
- subscription status
- trial status
- entitlements
- usage counters
- cancel-at-period-end state
- provider readiness

## Main Building Blocks

### Shared catalog and contracts

File:

- `packages/contracts/src/billing.ts`

This package defines:

- the launch plan catalog
- request and response schemas
- subscription statuses
- usage metric keys
- trial duration
- warning ratio

The web app and API both use this package so pricing and status labels stay aligned.

### Database model

Files:

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/20260315172640_add_billing/migration.sql`

Billing models:

- `BillingCustomer`
- `WorkspaceSubscription`
- `BillingEvent`
- `UsageCounter`
- `TrialState`
- `BillingInvoice`
- `BillingInvoiceLineItem`

### Backend module

Files:

- `apps/api/src/modules/billing/catalog.ts`
- `apps/api/src/modules/billing/usage.ts`
- `apps/api/src/modules/billing/invoices.ts`
- `apps/api/src/modules/billing/mercado-pago.ts`
- `apps/api/src/modules/billing/entitlements.ts`
- `apps/api/src/modules/billing/service.ts`
- `apps/api/src/modules/billing/routes.ts`

Responsibilities:

- expose plan and account endpoints
- resolve current entitlements
- manage checkout initiation
- process Mercado Pago webhooks idempotently
- translate provider state into internal subscription state
- create invoice and proration records
- expose provider readiness to the dashboard

### Frontend surfaces

Files:

- `apps/web/src/app/pricing/page.tsx`
- `apps/web/src/app/(app)/app/billing/page.tsx`
- `apps/web/src/lib/vowgrid/repository.ts`
- `apps/web/src/lib/vowgrid/billing.ts`

Responsibilities:

- public pricing presentation
- workspace billing overview
- trial countdown
- usage meters
- invoice visibility
- upgrade and cancel entry points
- provider-readiness messaging

## Entitlement Resolution

The entitlement resolver works in this order:

1. active subscription
2. non-active subscription
3. active trial
4. expired trial or no billing state

Current launch choice:

- active trial uses the `pro` entitlement profile

That makes it possible for teams to evaluate advanced policies and approvals during the trial without inventing a separate hidden trial-only plan.

## Usage Tracking

Tracked metrics:

- `intents`
- `executed_actions`
- `active_connectors`
- `internal_users`
- `workspaces`

Current enforcement:

- intents: hard enforced on trial and inactive billing states, overage-billed on active paid subscriptions
- executed actions: hard enforced on trial and inactive billing states, overage-billed on active paid subscriptions
- active connectors: hard enforced
- advanced policies: hard enforced
- advanced approvals: hard enforced

Current visibility-only metrics:

- internal users
- workspaces

Those limits are modeled now, but the product does not yet expose self-serve user or workspace provisioning flows that require additional enforcement logic.

## Checkout Flow

1. The dashboard sends `POST /v1/billing/checkout`.
2. The API validates the requested plan and cycle against the internal catalog.
3. The API creates a Mercado Pago preapproval checkout.
4. The API stores an internal `WorkspaceSubscription` record immediately.
5. The dashboard redirects the user to the returned checkout URL.

Supported self-serve plans:

- Launch
- Pro
- Business

Enterprise remains sales-assisted.

## Webhook Flow

1. Mercado Pago sends an event to `/v1/billing/webhooks/mercado-pago`.
2. The API validates the signature when a webhook secret is configured.
3. The API writes an idempotent `BillingEvent`.
4. The API fetches the latest provider subscription snapshot.
5. The API syncs the internal subscription record.
6. The API converts an active trial to `converted` when a paid subscription becomes active.

## Non-Goals In This Release

- advanced tax engine
- full invoice compliance system
- marketplace billing
- multiple billing providers
- enterprise self-serve checkout

## Honest Gaps

- A real enterprise sales inbox or form is still needed before launch.
- Mercado Pago account setup, webhook URL, and webhook secret still require manual production configuration.
- Enterprise SSO is still outside the billing release scope.

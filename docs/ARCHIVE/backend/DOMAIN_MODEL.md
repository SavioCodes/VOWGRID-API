# Domain Model

## Entity Relationship Overview

```text
Workspace
|- Users
|- Agents
|- ApiKeys
|- Policies
|- Connectors
|- Intents
|- AuditEvents
|- BillingCustomer
|- WorkspaceSubscription
|- BillingEvents
|- UsageCounters
`- TrialState

Intent
|- SimulationResult
|- ApprovalRequest
|  `- ApprovalDecisions
|- ExecutionJob
|- Receipts
`- RollbackAttempts

Policy
`- PolicyDecisions
```

## Core Entities

### Workspace

Multi-tenant root entity. All operational and billing data is scoped to a workspace.

### User, WorkspaceMembership, And UserSession

Users represent human dashboard operators that can now hold memberships in more than one workspace.

Current behavior:

- auth is email/password plus session token
- `disabledAt` is used to suspend access without deleting history
- disabling a user revokes active sessions
- owner role is reserved to the initial signup flow
- `WorkspaceMembership` is the active membership boundary for role, disable state, and switching
- `WorkspaceInvite` lets an existing or future user join another workspace

### Intent

Represents an action an AI agent wants to perform. It moves through the trust workflow:

`draft -> proposed -> simulated -> pending_approval -> approved -> queued -> executing -> succeeded`

Rejection, failure, and rollback states branch off that core path.

### SimulationResult

Persisted simulation output for an intent. It holds summary, estimated impact, risk level, reversibility, affected resources, and diff preview.

### Policy

Rule definition used during approval submission. Current policy types include:

- `amount_threshold`
- `action_restriction`
- `connector_restriction`
- `environment_restriction`
- `role_constraint`

### ApprovalRequest And ApprovalDecision

Approval workflow state and individual reviewer decisions.

### ExecutionJob

Execution queue record. Tracks queue status, attempts, results, and execution errors.

### Connector

Pluggable action executor. Each connector declares rollback posture as `supported`, `partial`, or `unsupported`.

### Receipt

Immutable proof surface for completed execution work.

### AuditEvent

Queryable activity log emitted throughout the product lifecycle, including billing events that affect workspace state.

## Billing Entities

### BillingCustomer

Workspace billing identity. Stores the billing contact email, legal name, and the mapped Mercado Pago customer identifier when available.

### WorkspaceSubscription

Internal subscription record. This is the canonical subscription state used by the product, even when Mercado Pago is the external billing provider.

It stores:

- internal plan key
- billing cycle
- internal subscription status
- provider subscription identifier
- current period information
- cancel-at-period-end flag
- last provider sync metadata

### BillingEvent

Idempotent record of provider-originated events. Used for webhook processing, debugging, and safe replay protection.

### UsageCounter

Monthly counters for usage metrics such as `intents` and `executed_actions`.

Paid workspaces can now cross the included `intents` and `executed_actions` caps through automatic overage billing instead of being blocked immediately. Trials and inactive billing states remain hard-limited.

### BillingInvoice And BillingInvoiceLineItem

Internal invoice records used for automatic overage charging visibility and plan-change proration adjustments.

### TrialState

Application-managed 14-day free trial state. Trial behavior is owned by the VowGrid backend, not Mercado Pago.

Current launch behavior:

- trial starts automatically for new workspaces
- active trial currently maps to the `pro` entitlement profile
- trial becomes `converted` when a paid subscription becomes active
- expired trial puts the workspace into read-only billing mode

## Entitlement Model

Entitlements are resolved from internal state in this order:

1. active paid subscription
2. non-active subscription
3. active trial
4. expired trial or no billing state

The resolved entitlement snapshot drives:

- usage meters
- warning states
- hard commercial blocks for critical write actions
- plan and support presentation in the dashboard

## Enforcement Boundaries

The current implementation actively enforces:

- internal user limits for active workspace members
- connector limits for enabled connectors
- monthly intent limits
- monthly executed action limits
- advanced policy availability
- advanced approval availability
- read-only mode after trial expiry or inactive subscription state

Workspace count limits remain modeled, but there is still no broader organization-level self-serve provisioning flow that would actively enforce them at scale.

> Archived on 2026-03-19 during documentation cleanup.
> This domain model snapshot is historical and has been superseded by current code plus `docs/DATABASE_SCHEMA.md`.

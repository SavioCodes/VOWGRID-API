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

- connector limits for enabled connectors
- monthly intent limits
- monthly executed action limits
- advanced policy availability
- advanced approval availability
- read-only mode after trial expiry or inactive subscription state

Internal user and workspace limits are modeled and surfaced in billing, but there are no self-serve provisioning paths yet that require dedicated hard enforcement on those surfaces.

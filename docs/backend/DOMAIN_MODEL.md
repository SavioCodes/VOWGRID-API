# Domain Model

## Entity Relationship Overview

```
Workspace ──┬── Users
            ├── Agents ──── Intents
            ├── ApiKeys
            ├── Policies
            ├── Connectors
            └── AuditEvents

Intent ──┬── SimulationResult (1:1)
         ├── ApprovalRequest (1:1) ── ApprovalDecisions (1:N)
         ├── ExecutionJob (1:1)
         ├── Receipts (1:N)
         └── RollbackAttempts (1:N)

Policy ──── PolicyDecisions (1:N)
```

## Core Entities

### Workspace
Multi-tenant root entity. All data is workspace-scoped.

### Intent (Central Entity)
Represents an action an AI agent wants to perform. Carries the full lifecycle through 13 states.

**State Machine:**
```
draft → proposed → simulated → pending_approval → approved → queued → executing → succeeded
                        ↓              ↓              ↓                              ↓
                    rejected       rejected       rejected                    rollback_pending
                                                                                ↓         ↓
                                                                          rolled_back  rollback_failed
                                                                                          ↓
                                                            failed → queued (retry)  rollback_pending (retry)
```

### SimulationResult
Persisted output of connector simulation. Includes: summary, estimated impact, risk level, reversibility, affected resources, diff preview.

### Policy
Rule definitions that gate intent progression. Types: `amount_threshold`, `action_restriction`, `connector_restriction`, `environment_restriction`, `role_constraint`.

### ApprovalRequest + ApprovalDecision
Multi-step approval support. Each decision records: actor, timestamp, rationale.

### ExecutionJob
BullMQ job record. Tracks: status, attempts, results, errors.

### Connector
Pluggable action executor. Each connector declares: type, rollback support (`supported`/`partial`/`unsupported`).

### Receipt
Immutable proof of execution. Contains full metadata of what happened.

### AuditEvent
Every important action emits an audit event. Indexed for fast querying by entity, actor, and timestamp.

### RollbackAttempt
Tracks rollback attempts with status and results. Supports retry.

## Key Design Choices

- **cuid** IDs — sortable, collision-resistant, URL-safe
- **snake_case** column names in PostgreSQL via `@@map`
- **JSON columns** for parameters, config, metadata — appropriate for schema-flexible data
- **Relational design** for structured data (states, relationships, approvals)
- **Cascading deletes** from Workspace — clean teardown
- **Indexed columns** — status, workspaceId, timestamps for fast queries

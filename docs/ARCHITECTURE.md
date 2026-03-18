# Architecture

## Layer diagram

```mermaid
flowchart LR
  Browser[Browser / Operator] --> Web[apps/web - Next.js]
  Web --> Contracts[packages/contracts]
  Web --> API[apps/api - Fastify]
  API --> Contracts
  API --> Prisma[Prisma ORM]
  Prisma --> Postgres[(PostgreSQL)]
  API --> Redis[(Redis)]
  API --> BullMQ[BullMQ queues]
  BullMQ --> ExecWorker[Execution worker]
  BullMQ --> RollbackWorker[Rollback worker]
  API --> MercadoPago[Mercado Pago]
  Web --> UI[packages/ui]
```

## Request flow

1. Human operators use `apps/web`.
2. The web app uses shared contracts to call `apps/api`.
3. The API persists workflow state in Postgres through Prisma.
4. Execution and rollback are delegated to BullMQ-backed workers.
5. Billing truth stays internal; Mercado Pago is only the provider adapter.

## Workflow and queue flow

```mermaid
sequenceDiagram
  participant User as Operator or agent
  participant API as apps/api
  participant DB as PostgreSQL
  participant Q as BullMQ / Redis
  participant W as Workers

  User->>API: Create or update intent
  API->>DB: Persist intent and policy state
  User->>API: Execute or rollback request
  API->>DB: Create execution or rollback record
  API->>Q: Enqueue background job
  Q->>W: Deliver job
  W->>DB: Update status, write receipts, write audit events
  API->>DB: Read state for dashboard queries
```

## Event-driven boundaries

- HTTP requests remain the entry point for user and machine actions.
- Execution and rollback become background jobs as soon as the product crosses into asynchronous side effects.
- Audit events and receipts are persisted as product truth, not as transient logs.
- Mercado Pago webhook events are normalized into internal billing state before the dashboard reads them.

## Boundaries

- `apps/api`: business rules, auth, billing, queue orchestration, audit truth
- `apps/web`: product UI, dashboard auth UX, pricing, settings, live session-backed integration
- `packages/contracts`: shared request/response types and schemas
- `packages/ui`: reusable primitives only
- `infra`: local Postgres and Redis used by dev, CI, and integration testing

# Architecture

VowGrid is a monorepo that separates operator experience, machine access, workflow orchestration, billing, and infrastructure concerns without pretending those concerns are different products.

At a high level:

- humans use the Next.js dashboard in `apps/web`
- machine clients use the Fastify API in `apps/api`
- shared contracts live in `packages/contracts`
- shared UI primitives live in `packages/ui`
- workflow truth, auth state, billing state, receipts, and audit events live in Postgres
- asynchronous execution and rollback run through BullMQ on Redis

## System Map

```mermaid
flowchart LR
  subgraph Clients
    Browser[Operator browser]
    Agent[Agent or integration client]
  end

  subgraph Web["apps/web - Next.js"]
    Marketing[Public pages]
    Dashboard[Protected /app shell]
    Session[HttpOnly session cookie]
  end

  subgraph Shared
    Contracts[packages/contracts]
    UI[packages/ui]
  end

  subgraph API["apps/api - Fastify"]
    ApiRuntime[API runtime]
    Routes[HTTP routes]
    Auth[Auth and workspace access]
    Workflow[Workflow, approvals, receipts, audit]
    Billing[Billing and provider normalization]
    Connectors[Connector runtime]
    Workers[Execution and rollback workers]
  end

  subgraph State
    Prisma[Prisma]
    Postgres[(PostgreSQL)]
    Redis[(Redis)]
  end

  subgraph Providers
    MP[Mercado Pago]
    HTTP[External HTTP targets]
    GitHub[GitHub API]
    OIDC[OAuth / OIDC providers]
  end

  Browser --> Marketing
  Browser --> Dashboard
  Dashboard --> Session
  Marketing --> UI
  Dashboard --> UI
  Marketing --> Contracts
  Dashboard --> Contracts
  Agent --> ApiRuntime
  Dashboard --> ApiRuntime
  ApiRuntime --> Contracts
  ApiRuntime --> Routes
  Routes --> Auth
  Routes --> Workflow
  Routes --> Billing
  Routes --> Connectors
  Auth --> Prisma
  Workflow --> Prisma
  Billing --> Prisma
  Connectors --> Prisma
  Workers --> Redis
  Workers --> Prisma
  Prisma --> Postgres
  Routes --> Redis
  Billing --> MP
  Connectors --> HTTP
  Connectors --> GitHub
  Auth --> OIDC
```

## Monorepo Responsibilities

| Area                 | Responsibility                  | Notes                                                                               |
| -------------------- | ------------------------------- | ----------------------------------------------------------------------------------- |
| `apps/web`           | operator-facing product surface | marketing pages, login/signup, billing UI, workspace settings, protected `/app`     |
| `apps/api`           | product truth and orchestration | auth, intents, approvals, execution, rollback, billing, connectors, audit, receipts |
| `packages/contracts` | shared schemas and API types    | used by API and web to reduce drift                                                 |
| `packages/ui`        | shared UI primitives            | reused by the Next.js app only                                                      |
| `packages/sdk`       | typed TypeScript client         | machine-client helper, still credential-gated like the raw API                      |
| `infra`              | local and release topology      | Compose files, observability stack, deploy scripts, Terraform scaffold              |

## Access Model

VowGrid has two primary entry paths.

### Human operator path

```mermaid
sequenceDiagram
  participant User as Operator
  participant Web as Web app
  participant API as API
  participant DB as Postgres

  User->>Web: Visit login, signup, billing, or /app
  Web->>API: Call auth and product routes
  API->>DB: Validate user, membership, workspace state
  API-->>Web: Return session-backed response
  Web-->>User: Render dashboard state
```

- dashboard auth is session-backed
- the web layer stores an opaque session token in an `HttpOnly` cookie
- `/app` requires a valid session and does not silently fall back to provisional data
- `/preview` is the explicit provisional surface when enabled

### Machine client path

```mermaid
sequenceDiagram
  participant Client as Agent client
  participant API as API
  participant DB as Postgres

  Client->>API: Request with X-Api-Key
  API->>DB: Resolve workspace API key and workspace state
  API-->>Client: Return JSON envelope
```

- machine access uses workspace API keys
- API keys are workspace-scoped, hashed at rest, and managed from the dashboard
- the same workflow engine serves both humans and machine clients

## Workflow Lifecycle

This is the core product path:

`Propose -> Simulate -> Evaluate Policy -> Approve -> Execute -> Generate Receipt -> Rollback visibility`

```mermaid
sequenceDiagram
  participant User as Operator or machine client
  participant Api as API
  participant Db as Postgres
  participant Jobs as Job queue
  participant Exec as Worker
  participant Target as Connector

  User->>Api: Create or update intent
  Api->>Db: Persist draft and workflow state
  User->>Api: Propose, simulate, or submit for approval
  Api->>Db: Persist simulation and approval state
  User->>Api: Execute or rollback
  Api->>Db: Create execution or rollback record
  Api->>Jobs: Enqueue async job
  Jobs->>Exec: Deliver job
  Exec->>Target: Perform side effect
  Exec->>Db: Persist receipt, audit event, and final state
  User->>Api: Query intent, receipt, audit, or rollback history
```

Important boundaries:

- HTTP stays synchronous until a request crosses into real external side effects
- execution and rollback become background jobs once queued
- receipts and audit events are persisted product records, not just logs
- worker processing is queue-backed, but workers are currently started by the API runtime rather than deployed as a separate worker fleet

## Connector Runtime

The current runtime registers:

- `mock`
- `http`
- `github`

Current truth:

- `mock` is the reference path for local development and verified flow testing
- `http` is the generic outbound webhook-style connector
- `github` supports a narrow operational action set
- Slack is intentionally not registered in the runtime today

See [Connector implementations](CONNECTOR_IMPLEMENTATIONS.md) for the support matrix and rollback expectations.

## Billing Architecture Slice

```mermaid
flowchart LR
  Dashboard[Dashboard billing UI] --> API[Billing routes]
  Agent[Machine client] --> API
  API --> InternalState[Internal billing state]
  API --> Usage[Usage and entitlements]
  API --> Invoices[Invoices and proration records]
  API --> MP[Mercado Pago adapter]
  MP --> Webhooks[Webhook events]
  Webhooks --> API
  InternalState --> Postgres[(PostgreSQL)]
  Usage --> Postgres
  Invoices --> Postgres
```

Billing principles:

- billing truth is internal to VowGrid
- provider payloads are normalized before the dashboard reads them
- plans, trials, entitlements, overage, coupons, tax profile controls, proration previews, and invoice records already exist
- Mercado Pago remains a provider adapter, not the billing source of truth

## Data And State Boundaries

| Store          | Role                                   | Examples                                                                                    |
| -------------- | -------------------------------------- | ------------------------------------------------------------------------------------------- |
| PostgreSQL     | durable product truth                  | users, sessions, workspace state, intents, approvals, receipts, audit events, billing state |
| Redis          | ephemeral queue and coordination state | BullMQ jobs, worker coordination, async job delivery                                        |
| Browser cookie | web session carrier                    | opaque dashboard session token                                                              |

## Trust Boundaries

- browser to web: public internet and operator-controlled device
- web to API: first-party application boundary
- API to database and Redis: trusted runtime boundary
- API or worker to provider: external side-effect boundary
- provider webhook back to API: untrusted external callback boundary normalized into internal state

## Design Principles

- one source of truth for workflow and billing state
- shared contracts instead of duplicated request shapes
- clear separation between human auth and machine auth
- queue-backed side effects instead of pretending external actions are synchronous
- documentation should describe the current launch-stage architecture, not a hypothetical platform

## What This Architecture Is Not

- not a multi-node platform
- not a dedicated worker cluster
- not a multi-region deployment
- not a managed-secrets architecture yet
- not a full enterprise federation platform yet

For runtime and deploy topology, see [Production blueprint](PRODUCTION_BLUEPRINT.md).

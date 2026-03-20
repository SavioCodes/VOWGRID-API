# Backend Architecture

## Overview

VowGrid API is a modular monolith built with **Fastify 5** on **Node.js 22**. All modules share a single process and database but maintain clean boundaries through layered architecture.

## Module Structure

```
apps/api/src/
├── config/          # Environment config (Zod-validated)
├── lib/             # Singletons: Prisma, Redis, BullMQ, Logger
├── common/          # Shared errors, response helpers
├── plugins/         # Fastify plugins (auth, rate limiting)
├── modules/
│   ├── health/      # Health check endpoint
│   ├── intents/     # Intent lifecycle + state machine
│   ├── simulations/ # Simulation orchestration
│   ├── policies/    # Policy engine + CRUD
│   ├── approvals/   # Approval workflow
│   ├── executions/  # Execution queueing + rollback
│   ├── connectors/  # Connector framework + implementations
│   ├── receipts/    # Execution proof
│   └── audits/      # Audit trail
└── jobs/            # BullMQ workers
```

## Layering Pattern

Each module follows this structure:

```
module/
├── routes.ts      # HTTP routes (controller)
├── service.ts     # Business logic (application layer)
├── schemas.ts     # Zod validation schemas
├── engine.ts      # Domain logic (policies only)
├── state-machine.ts  # State transitions (intents only)
└── __tests__/     # Unit tests
```

- **Routes** validate input, call services, format responses
- **Services** orchestrate business logic, call Prisma, emit audits
- **Schemas** define Zod validation for input/output
- **Domain logic** is pure functions with no DB dependency (testable in isolation)

## Request Lifecycle

```
Request → Rate Limit → Auth (API Key) → Route Handler → Zod Validation
  → Service Layer → Prisma/Redis → Audit Event → Response
```

## Data Flow: Intent Lifecycle

```
Agent creates Intent (draft)
  → Proposes (proposed)
  → Connector simulates (simulated)
  → Policy engine evaluates
  → Approval workflow (pending_approval → approved/rejected)
  → BullMQ queues execution (queued → executing)
  → Connector executes (succeeded/failed)
  → Receipt generated
  → Rollback available if connector supports it
```

## Key Design Decisions

1. **Modular monolith** over microservices — simpler ops, faster iteration
2. **API key auth** over OAuth2 — appropriate for agent-to-API communication
3. **BullMQ** for execution — reliable, retryable, observable job processing
4. **Pure domain functions** (state machine, policy engine) — testable without mocks
5. **Non-blocking audit** — audit failures don't break main flows
   > Archived on 2026-03-19 during documentation cleanup.
   > This backend architecture snapshot is historical and contains outdated assumptions.
   > Use `docs/ARCHITECTURE.md`, `docs/API_REFERENCE.md`, and `docs/IMPLEMENTATION_STATUS.md` for current truth.

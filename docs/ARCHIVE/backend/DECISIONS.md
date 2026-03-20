# Architecture Decisions

## ADR-001: Modular Monolith over Microservices

**Decision:** Build as a modular monolith with clean module boundaries.

**Rationale:** At this stage, the complexity overhead of microservices (network calls, distributed transactions, deployment orchestration) is not justified. Module boundaries are clean enough to extract into services later if needed.

---

## ADR-002: Split Machine Auth and Dashboard Auth

**Decision:** Use API key authentication for agents/programmatic clients and session-backed auth for the human dashboard.

**Rationale:** VowGrid's primary consumers are AI agents and programmatic clients, so API keys remain the cleanest machine credential. Human operators need session-backed login, workspace access control, and auditable member lifecycle management. The product therefore separates machine auth from dashboard auth instead of forcing one credential model across both surfaces.

---

## ADR-003: BullMQ for Execution and Rollback Jobs

**Decision:** Use BullMQ (Redis-backed) for execution and rollback job processing.

**Rationale:** Execution is the most consequential step, and rollback has the same operational requirements. BullMQ provides retries, backoff, and job visibility. Redis is already required for rate limiting, so no additional infrastructure.

---

## ADR-004: Pure Domain Functions

**Decision:** State machine and policy engine are pure functions with zero DB dependencies.

**Rationale:** Critical domain logic must be testable in isolation, without mocks or fixtures. This enables fast, reliable unit tests and makes the logic auditable independent of infrastructure.

---

## ADR-005: Non-Blocking Audit Events

**Decision:** Audit event emission swallows errors and never blocks the main flow.

**Rationale:** Audit is critical for compliance but should never cause a business operation to fail. If the audit write fails, it is logged for investigation while the business transaction proceeds.

---

## ADR-006: Connector Framework with Explicit Rollback Declaration

**Decision:** Each connector explicitly declares its rollback support: `supported`, `partial`, or `unsupported`.

**Rationale:** Not every real-world action is reversible. Instead of pretending otherwise, connectors must honestly declare their rollback capability. The system uses this to inform approval decisions, UI state, and rollback handling.

---

## ADR-007: Idempotency Keys on Critical Writes

**Decision:** Support idempotency keys on intent creation.

**Rationale:** Agent-to-API communication can involve retries and network failures. Idempotency keys prevent duplicate intent creation without requiring the caller to check for existing intents first.

---

## ADR-008: Zod for Runtime Validation

**Decision:** Use Zod for all input validation instead of Fastify's built-in AJV validation.

**Rationale:** Zod provides better TypeScript integration, more expressive validation, and schemas that can be shared through the contracts package. The tradeoff is slightly less Swagger integration, but the validation quality is worth it.

> Archived on 2026-03-19 during documentation cleanup.
> This backend decision log is preserved for history only.
> Current architectural truth lives in `docs/ARCHITECTURE.md` and `docs/PRODUCTION_BLUEPRINT.md`.

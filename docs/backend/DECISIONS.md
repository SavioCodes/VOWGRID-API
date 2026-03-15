# Architecture Decisions

## ADR-001: Modular Monolith over Microservices

**Decision:** Build as a modular monolith with clean module boundaries.

**Rationale:** At this stage, the complexity overhead of microservices (network calls, distributed transactions, deployment orchestration) is not justified. Module boundaries are clean enough to extract into services later if needed.

---

## ADR-002: API Key Authentication

**Decision:** Use API key authentication as the primary auth mechanism.

**Rationale:** VowGrid's primary consumers are AI agents and programmatic clients. API keys are simpler to provision, rotate, and use than OAuth2 flows. JWT foundation is in place for future user-facing auth.

---

## ADR-003: BullMQ for Job Processing

**Decision:** Use BullMQ (Redis-backed) for execution job queuing.

**Rationale:** Execution is the most consequential step — it needs reliability, retries, and observability. BullMQ provides exponential backoff, dead-letter handling, and job visibility. Redis is already required for rate limiting, so no additional infrastructure.

---

## ADR-004: Pure Domain Functions

**Decision:** State machine and policy engine are pure functions with zero DB dependencies.

**Rationale:** Critical domain logic must be testable in isolation, without mocks or fixtures. This enables fast, reliable unit tests (65 tests run in <20ms) and makes the logic auditable/reviewable independent of infrastructure.

---

## ADR-005: Non-Blocking Audit Events

**Decision:** Audit event emission swallows errors and never blocks the main flow.

**Rationale:** Audit is critical for compliance but should never cause a business operation to fail. If the audit write fails, it's logged for investigation but the business transaction proceeds.

---

## ADR-006: Connector Framework with Explicit Rollback Declaration

**Decision:** Each connector explicitly declares its rollback support: `supported`, `partial`, or `unsupported`.

**Rationale:** Not every real-world action is reversible. Instead of pretending otherwise, connectors must honestly declare their rollback capability. The system uses this to inform approval decisions and UI state.

---

## ADR-007: Idempotency Keys on Critical Writes

**Decision:** Support idempotency keys on intent creation.

**Rationale:** Agent-to-API communication can involve retries and network failures. Idempotency keys prevent duplicate intent creation without requiring the caller to check for existing intents first.

---

## ADR-008: Zod for Runtime Validation

**Decision:** Use Zod for all input validation instead of Fastify's built-in AJV validation.

**Rationale:** Zod provides better TypeScript integration, more expressive validation, and the schemas can be shared via the contracts package. The tradeoff is slightly less Swagger integration, but the validation quality is worth it.

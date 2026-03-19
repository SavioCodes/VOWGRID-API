# Technical Choices

This document explains not only what VowGrid uses, but why those choices were made and what trade-offs they carry.

## Fastify

Chosen because:

- high performance with low abstraction overhead
- strong plugin model
- good fit for typed infrastructure APIs

Trade-off:

- less out-of-the-box structure than opinionated full frameworks

## Prisma + PostgreSQL

Chosen because:

- workflow, billing, auth, and audit data are relational
- Prisma gives a workable schema and migration story for a monorepo
- PostgreSQL is strong for transactional correctness and operational familiarity

Trade-off:

- some advanced polymorphism and cross-entity patterns require care

## Redis + BullMQ

Chosen because:

- execution and rollback need explicit asynchronous jobs
- Redis is already useful for queues and coordination
- BullMQ keeps job behavior inspectable

Trade-off:

- operators must own Redis health and queue reliability

## Next.js + React

Chosen because:

- one stack can serve marketing, auth, and dashboard surfaces
- server components fit the session-backed dashboard well
- strong ecosystem for polished B2B product UI

Trade-off:

- build output and runtime behavior are more complex than a static-only site

## Shared Contracts Package

Chosen because:

- prevents frontend/backend drift
- keeps request/response truth close to the code
- helps the SDK and tests stay aligned

Trade-off:

- package build order matters and must stay disciplined

## Mercado Pago

Chosen because:

- it fits the launch geography and go-to-market better than Stripe for this project
- provider code is kept isolated from internal billing truth

Trade-off:

- production readiness still depends on real account setup and webhook validation

## Self-hosted Observability First

Chosen because:

- keeps launch cost lower
- works locally and in release-like environments
- avoids forcing a vendor before product-market validation

Trade-off:

- external alert routing and hosted incident tooling still need extra setup

## Single-VPS Production Blueprint

Chosen because:

- fastest path to launch
- easy to reason about
- low operational overhead for an early-stage product

Trade-off:

- no native multi-node failover or autoscaling

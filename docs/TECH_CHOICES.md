# Technical Choices

## Why these tools

### Fastify

- High performance without hiding HTTP details
- Good plugin model for auth, docs, and middleware
- Clear fit for a typed infrastructure API

### Prisma + PostgreSQL

- Strong fit for relational workflow state
- Good migration story for a monorepo
- PostgreSQL handles audit, billing, auth, and workflow data in one consistent source of truth

### Redis + BullMQ

- Redis is already useful for rate limiting and queue coordination
- BullMQ provides retryable background jobs for execution and rollback flows
- Keeps asynchronous work explicit and inspectable

### Next.js + React

- Good balance between marketing site, auth pages, and protected control plane
- Server components fit session-backed dashboard loading well
- Strong ecosystem for premium B2B SaaS UX

### Shared contracts package

- Prevents frontend/backend drift
- Gives one place to evolve request and response shapes
- Improves DX and reviewability

### Mercado Pago

- Chosen provider for launch billing
- Provider logic stays isolated so internal billing truth does not depend on raw provider payloads

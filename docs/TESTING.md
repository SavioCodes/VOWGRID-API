# Testing Strategy

This document explains how VowGrid is tested today and where the gaps still are.

## Test Layers

## Unit tests

Current unit coverage focuses on deterministic, domain-heavy logic:

- intent state machine
- policy engine
- connector runtime behavior
- auth security primitives
- billing catalog logic

Run with:

```bash
pnpm test
```

## Integration tests

Integration coverage exercises the Fastify API, Prisma, queue-backed flows, and workspace auth model.

Current integration coverage includes:

- account recovery
- OAuth completion
- connector registration and encrypted config behavior
- workspace API key management
- workspace export and anonymization
- rollback worker
- billing overage behavior
- workspace members and internal-user limits
- multi-step approvals

Run with:

```bash
pnpm test:integration
```

## Coverage run

```bash
pnpm test:coverage
```

Use this to detect obvious untested growth areas, not as the sole release gate.

## End-to-end tests

Playwright covers the highest-signal operator flows:

- signup and protected app access
- invite acceptance and workspace switching
- password reset acknowledgement
- seeded workflow creation through execution, receipt, rollback, billing, and metrics visibility

Run with:

```bash
pnpm test:e2e:install
pnpm test:e2e
```

## Recommended Validation Before Merge

Minimum:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`

For workflow, auth, connector, billing, or deployment changes:

1. `pnpm test:integration`
2. `pnpm build`
3. `pnpm test:e2e`

## Test Data Model

The repo uses three common patterns:

- pure unit fixtures inside source test files
- integration tests that create isolated workspaces and users
- seeded E2E data via `pnpm seed`

## Honest Coverage Gaps

Current gaps still worth expanding:

- larger regression coverage across all connector actions
- broader billing lifecycle coverage with real provider callbacks
- more failure-mode E2E scenarios
- more deploy-path verification in CI against real hosts

## Troubleshooting Failed Tests

### Integration tests fail early

- confirm Docker Desktop is running
- run `pnpm docker:up`
- run `pnpm migrate`
- run `pnpm seed`

### E2E cannot boot

- confirm `apps/api/.env` exists
- confirm `apps/web/.env.local` exists
- run `pnpm test:e2e:install`

### Prisma-related failures

- regenerate client with `pnpm generate`
- confirm migrations are applied
- verify Postgres is healthy

## Release Confidence Model

VowGrid does not rely on a single type of test:

- unit tests protect core logic
- integration tests protect contract truth
- E2E tests protect real product flow

That combination matters more than raw line coverage.

# SDK Guide

VowGrid ships with a repository-local TypeScript SDK in `packages/sdk`.

This guide focuses on packaging, local usage, and publication readiness. For workflow examples, also read:

- `docs/AGENT_INTEGRATION_GUIDE.md`
- `packages/sdk/README.md`

## Package Status

- package name: `@vowgrid/sdk`
- source: `packages/sdk/src/index.ts`
- publication metadata: `packages/sdk/package.json`
- local artifact check: `pnpm sdk:pack`

The package is publish-ready in structure, but it is not published to npm yet.

## Covered Operations

The SDK currently includes typed helpers for:

- health and metrics
- billing plans, billing account, and checkout
- intents lifecycle
- approvals
- execution and rollback
- policies
- connectors
- receipts
- audit events

## Example

```ts
import { VowGridClient } from '@vowgrid/sdk';

const client = new VowGridClient({
  baseUrl: 'http://localhost:4000',
  apiKey: process.env.VOWGRID_API_KEY!,
});

const created = await client.createIntent({
  title: 'Rotate support token',
  action: 'rotate_secret',
  agentId: 'cmg0000000000000000000002',
  connectorId: 'cmg0000000000000000000004',
  environment: 'production',
});

const submitted = await client.submitForApproval(created.id, {
  stages: [
    {
      label: 'Ops review',
      requiredCount: 1,
      reviewerRoles: ['admin'],
    },
  ],
});

console.log(submitted.approvalRequest.status);
```

## Local Publication Check

```bash
pnpm sdk:pack
```

Expected output:

- tarball under `test-results/sdk-pack/`

## What Still Does Not Exist

- published npm release pipeline
- Python or Go SDK
- OpenAPI codegen pipeline
- versioned public SDK release process

# SDK Guide

## Status

VowGrid now includes a repository-local TypeScript SDK in `packages/sdk`.

It is intended for:

- internal apps in this monorepo
- external teams vendoring the package source
- integrators who want typed access without writing raw `fetch` wrappers

It is not published to npm yet.

## Package

- package name: `@vowgrid/sdk`
- entrypoint: `packages/sdk/src/index.ts`

## Current Coverage

The SDK includes typed helpers for:

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

const health = await client.health();
const intents = await client.listIntents({ pageSize: 10 });

console.log(health.status, intents.length);
```

## Current Limitations

- not published as an npm package
- no generated Python client
- no generated OpenAPI-based SDK pipeline

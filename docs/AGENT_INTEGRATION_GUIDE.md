# Agent Integration Guide

## Purpose

VowGrid exposes a machine-facing API for trusted automation. The intended pattern is:

1. create or rotate a workspace API key from `/app/settings`
2. keep that key on the agent side
3. create intents instead of calling external systems directly
4. let VowGrid handle simulation, policy, approval, execution, receipt, and rollback visibility

This guide closes the gap between "the API exists" and "an engineering team can wire a real agent into it".

## Base URL

Local:

- `http://localhost:4000/v1`

Production launch path:

- `https://<your-primary-domain>/v1`

## Authentication

Machine clients use:

- `X-Api-Key: <workspace-api-key>`

Dashboard sessions are for humans and are not the recommended auth surface for agents.

## Recommended Agent Flow

### 1. Create the draft intent

```bash
curl -X POST http://localhost:4000/v1/intents \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: vowgrid_local_dev_key" \
  -d "{\"title\":\"Rotate support secret\",\"action\":\"rotate_secret\",\"agentId\":\"cmg0000000000000000000002\",\"connectorId\":\"cmg0000000000000000000004\",\"environment\":\"production\"}"
```

### 2. Propose it

```bash
curl -X POST http://localhost:4000/v1/intents/<intentId>/propose \
  -H "X-Api-Key: vowgrid_local_dev_key"
```

### 3. Simulate it

```bash
curl -X POST http://localhost:4000/v1/intents/<intentId>/simulate \
  -H "X-Api-Key: vowgrid_local_dev_key"
```

### 4. Submit for approval

```bash
curl -X POST http://localhost:4000/v1/intents/<intentId>/submit-for-approval \
  -H "X-Api-Key: vowgrid_local_dev_key"
```

### 5. Wait for approval, then execute

```bash
curl -X POST http://localhost:4000/v1/intents/<intentId>/execute \
  -H "X-Api-Key: vowgrid_local_dev_key"
```

### 6. Fetch the receipt

```bash
curl http://localhost:4000/v1/receipts/<receiptId> \
  -H "X-Api-Key: vowgrid_local_dev_key"
```

### 7. Inspect audit history when needed

```bash
curl "http://localhost:4000/v1/audit-events?pageSize=20" \
  -H "X-Api-Key: vowgrid_local_dev_key"
```

## Minimal TypeScript Example

```ts
const baseUrl = process.env.VOWGRID_BASE_URL ?? 'http://localhost:4000/v1';
const apiKey = process.env.VOWGRID_API_KEY;

if (!apiKey) {
  throw new Error('Missing VOWGRID_API_KEY');
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      ...(init?.headers ?? {}),
    },
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.error?.message ?? `Request failed for ${path}`);
  }

  return json.data as T;
}

type Intent = { id: string };
type Simulation = { outcome: string };

async function runFlow() {
  const intent = await api<Intent>('/intents', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Rotate support secret',
      action: 'rotate_secret',
      agentId: 'cmg0000000000000000000002',
      connectorId: 'cmg0000000000000000000004',
      environment: 'production',
    }),
  });

  await api(`/intents/${intent.id}/propose`, { method: 'POST' });
  const simulation = await api<Simulation>(`/intents/${intent.id}/simulate`, { method: 'POST' });
  await api(`/intents/${intent.id}/submit-for-approval`, { method: 'POST' });

  console.log('Simulation result:', simulation.outcome);
  console.log('Wait for approval before executing.');
}

runFlow().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

## Operational Notes

- Treat `402 Payment Required` as a commercial or entitlement block.
- Treat `409 Conflict` as a lifecycle-state issue, not a transport failure.
- Treat `403` and `401` as auth issues or revoked API keys.
- Poll intent status or audit history instead of guessing whether execution finished.
- Use receipts and audit events as the proof surfaces for downstream systems.

## What VowGrid Does Not Yet Ship As A Package

There is not yet a dedicated published SDK package.

For this release, the expected integration surface is:

- raw HTTP
- shared API contracts inside the monorepo
- examples in this guide and `docs/backend/API_OVERVIEW.md`

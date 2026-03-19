# Connector Development Guide

This guide explains how to add a new runtime connector to VowGrid without breaking the trust workflow.

## Goals Of A Connector

A connector translates an approved VowGrid intent into a real-world action. Every connector must support the same trust model:

- validate configuration
- validate action payloads
- simulate impact
- execute work
- rollback honestly when possible

Connectors must never pretend to support rollback or validation that they do not actually implement.

## Current Runtime Connectors

The runtime registry currently includes:

- `mock`
- `http`
- `github`

Registration happens during `buildServer()` in `apps/api/src/server.ts`.

## Interface Contract

New connectors implement `IConnector` in:

- `apps/api/src/modules/connectors/framework/connector.interface.ts`

Core methods:

- `validateConfig(config)`
- `validate(action, parameters, context)`
- `simulate(action, parameters, context)`
- `execute(action, parameters, context)`
- `rollback(action, parameters, executionData, context)`

## Recommended Development Steps

1. Create a connector file under `apps/api/src/modules/connectors/framework/`.
2. Implement `type` and `rollbackSupport`.
3. Add config validation first.
4. Implement simulation before execution so the product can surface impact early.
5. Implement execution.
6. Implement rollback only if it is real and testable.
7. Register the connector in `buildServer()`.
8. Add unit tests and at least one integration path.
9. Update `docs/CONNECTOR_IMPLEMENTATIONS.md`.

## Rollback Support Semantics

Use these values honestly:

| Value         | Meaning                                                                  |
| ------------- | ------------------------------------------------------------------------ |
| `supported`   | rollback is implemented and expected to work for the intended action set |
| `partial`     | rollback exists for some actions or some states only                     |
| `unsupported` | rollback does not exist and should be blocked                            |

Do not label a connector `supported` just because the target platform theoretically supports reversal.

## Configuration Handling

Connector configuration is stored in `Connector.config`.

Current rules:

- configs are encrypted at rest before persistence
- connector list routes never expose raw config back to the client
- runtime code receives decrypted config through the connector runtime context

Relevant files:

- `apps/api/src/lib/connector-secrets.ts`
- `apps/api/src/modules/connectors/framework/runtime-context.ts`
- `apps/api/src/modules/connectors/routes.ts`

## Simulation Expectations

A good simulation should include:

- a human-readable summary
- estimated impact
- risk level
- reversibility
- affected resources
- optional diff preview
- warnings when rollback is partial or absent

This is what allows operators to approve with confidence.

## Testing Expectations

At minimum, add:

- unit tests for execution and rollback behavior
- config validation coverage
- integration coverage if the connector is reachable through API routes

Current examples:

- `apps/api/src/modules/connectors/framework/__tests__/runtime-connectors.test.ts`
- `tests/api/connectors.integration.test.ts`

## Example Skeleton

```ts
export class ExampleConnector implements IConnector {
  readonly type = 'example';
  readonly rollbackSupport: RollbackSupport = 'partial';

  async validateConfig(config) {
    return { valid: true };
  }

  async validate(action, parameters, context) {
    return { valid: true };
  }

  async simulate(action, parameters, context) {
    return {
      summary: `Example connector will run ${action}.`,
      estimatedImpact: 'low',
      riskLevel: 'low',
      reversibility: 'partial',
      affectedResources: [],
      warnings: [],
    };
  }

  async execute(action, parameters, context) {
    return { success: true, data: {} };
  }

  async rollback(action, parameters, executionData, context) {
    return { success: true, data: {} };
  }
}
```

## Production Reality Checklist

Before calling a connector production-ready, confirm:

- credentials are provisioned securely
- config validation catches bad setup
- simulation output is understandable to operators
- rollback behavior is documented honestly
- audit metadata is useful for troubleshooting
- integration examples exist in docs

## What Still Does Not Exist

- connector marketplace
- custom connector SDK beyond the runtime interface
- hosted connector secrets manager
- per-connector rate limiting and quota controls

# Rollback Processing

## What is implemented

Rollback is now a real asynchronous workflow backed by BullMQ.

Current behavior:

1. `POST /v1/intents/:intentId/rollback` creates a `RollbackAttempt`
2. the API enqueues a dedicated rollback job
3. the rollback worker marks the attempt `in_progress`
4. the worker resolves the connector and calls `rollback()` when available
5. VowGrid writes a rollback receipt and audit event on success
6. the intent moves to `rolled_back` on success or `rollback_failed` on terminal failure

## Queue model

- execution and rollback use separate job paths
- rollback retries happen at the BullMQ job level only
- there is no broader product-wide retry orchestration framework in this phase

## Connector behavior

- `supported`: rollback is attempted normally
- `partial`: rollback is attempted, but failure remains explicit if the connector cannot finish
- `unsupported`: the API blocks rollback before enqueuing
- missing `rollback()` implementation: the worker fails honestly and writes failure state

## Persisted proof

Rollback success writes:

- updated rollback attempt state
- updated intent lifecycle state
- rollback receipt
- audit event

Rollback failure writes:

- `rollback_failed` intent state
- failure data on the rollback attempt
- audit event with failure metadata

## Manual retry posture

There is no separate retry product surface yet.

The current model is:

- BullMQ may retry the job within the configured attempt budget
- after terminal failure, the product stays honest with `rollback_failed`
- the existing manual rollback request path remains the operator recovery path

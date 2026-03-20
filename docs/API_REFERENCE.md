# API Reference

This is the human-readable API map for VowGrid. The canonical machine-readable reference remains the live Swagger UI:

- local: `http://localhost:4000/v1/docs`
- release: `https://<domain>/v1/docs`

## Base Path

All first-party API routes are mounted under `/v1`.

## Authentication Modes

### Session auth

Used by the operator dashboard.

- header: `Authorization: Bearer <session-token>`
- created through `/v1/auth/signup` or `/v1/auth/login`

### API key auth

Used by agents and programmatic clients.

- header: `X-Api-Key: <workspace-api-key>`

### Public routes

Some routes are intentionally public:

- `/v1/health`
- `/v1/docs`
- `/v1/billing/plans`
- selected auth routes
- Mercado Pago webhook route

## Response Envelope

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-03-19T20:00:00.000Z"
  }
}
```

## Route Groups

### Health And Observability

| Method | Path          | Auth                  | Purpose                      |
| ------ | ------------- | --------------------- | ---------------------------- |
| `GET`  | `/v1/health`  | none                  | basic liveness and readiness |
| `GET`  | `/v1/metrics` | optional bearer token | Prometheus metrics           |
| `GET`  | `/v1/docs`    | none                  | Swagger UI                   |

### Auth

| Method | Path                                  | Auth    | Purpose                            |
| ------ | ------------------------------------- | ------- | ---------------------------------- |
| `POST` | `/v1/auth/signup`                     | none    | create workspace + owner + session |
| `POST` | `/v1/auth/login`                      | none    | create session                     |
| `GET`  | `/v1/auth/me`                         | session | current user, workspace, session   |
| `POST` | `/v1/auth/logout`                     | session | revoke current session             |
| `POST` | `/v1/auth/password-reset/request`     | none    | issue reset token                  |
| `POST` | `/v1/auth/password-reset/confirm`     | none    | write new password                 |
| `POST` | `/v1/auth/email-verification/request` | session | request new verification email     |
| `POST` | `/v1/auth/email-verification/verify`  | none    | verify email token                 |
| `POST` | `/v1/auth/oauth/complete`             | none    | complete provider login            |
| `POST` | `/v1/auth/oauth/signup/complete`      | none    | complete provider-first signup     |
| `POST` | `/v1/auth/invites/accept`             | none    | accept workspace invite            |
| `POST` | `/v1/auth/switch-workspace`           | session | switch active workspace membership |

### Intents

| Method | Path                                        | Auth               | Purpose                                   |
| ------ | ------------------------------------------- | ------------------ | ----------------------------------------- |
| `GET`  | `/v1/intents`                               | session or API key | list intents                              |
| `POST` | `/v1/intents`                               | session or API key | create draft intent                       |
| `GET`  | `/v1/intents/:intentId`                     | session or API key | intent detail, including policy state     |
| `POST` | `/v1/intents/:intentId/propose`             | session or API key | draft -> proposed                         |
| `POST` | `/v1/intents/:intentId/simulate`            | session or API key | create simulation result                  |
| `POST` | `/v1/intents/:intentId/submit-for-approval` | session or API key | evaluate policy + create approval request |

### Approvals

| Method | Path                                         | Auth               | Purpose                                                 |
| ------ | -------------------------------------------- | ------------------ | ------------------------------------------------------- |
| `POST` | `/v1/approvals/:approvalRequestId/approve`   | session or API key | force approved decision                                 |
| `POST` | `/v1/approvals/:approvalRequestId/reject`    | session or API key | force rejected decision                                 |
| `POST` | `/v1/approvals/:approvalRequestId/decisions` | session or API key | record approved/rejected decision against current stage |

### Execution And Rollback

| Method | Path                             | Auth               | Purpose         |
| ------ | -------------------------------- | ------------------ | --------------- |
| `POST` | `/v1/intents/:intentId/execute`  | session or API key | queue execution |
| `POST` | `/v1/intents/:intentId/rollback` | session or API key | queue rollback  |

### Policies

| Method | Path           | Auth               | Purpose       |
| ------ | -------------- | ------------------ | ------------- |
| `GET`  | `/v1/policies` | session or API key | list policies |
| `POST` | `/v1/policies` | session or API key | create policy |

### Connectors

| Method | Path             | Auth    | Purpose                                      |
| ------ | ---------------- | ------- | -------------------------------------------- |
| `GET`  | `/v1/connectors` | session | list connectors and registered runtime types |
| `POST` | `/v1/connectors` | session | create connector                             |

### Receipts And Audit

| Method | Path                      | Auth               | Purpose          |
| ------ | ------------------------- | ------------------ | ---------------- |
| `GET`  | `/v1/receipts/:receiptId` | session or API key | receipt detail   |
| `GET`  | `/v1/audit-events`        | session or API key | audit event list |

### Billing

| Method   | Path                                | Auth               | Purpose                                      |
| -------- | ----------------------------------- | ------------------ | -------------------------------------------- |
| `GET`    | `/v1/billing/plans`                 | none               | plan catalog                                 |
| `GET`    | `/v1/billing/account`               | session or API key | current billing account, usage, entitlements |
| `POST`   | `/v1/billing/checkout`              | session or API key | start Mercado Pago checkout                  |
| `POST`   | `/v1/billing/subscription/cancel`   | session or API key | cancel subscription                          |
| `PATCH`  | `/v1/billing/customer`              | session            | update tax/customer profile                  |
| `POST`   | `/v1/billing/coupon`                | session            | apply coupon                                 |
| `DELETE` | `/v1/billing/coupon`                | session            | clear coupon                                 |
| `POST`   | `/v1/billing/webhooks/mercado-pago` | none               | provider webhook                             |

### Workspace Administration

| Method  | Path                                      | Auth    | Purpose                   |
| ------- | ----------------------------------------- | ------- | ------------------------- |
| `GET`   | `/v1/workspace/members`                   | session | list members              |
| `POST`  | `/v1/workspace/members`                   | session | create member             |
| `PATCH` | `/v1/workspace/members/:userId`           | session | update member             |
| `POST`  | `/v1/workspace/members/:userId/disable`   | session | disable member            |
| `POST`  | `/v1/workspace/members/:userId/enable`    | session | re-enable member          |
| `POST`  | `/v1/workspace/members/:userId/anonymize` | session | anonymize disabled member |
| `GET`   | `/v1/workspace/export`                    | session | workspace JSON export     |
| `GET`   | `/v1/workspace/api-keys`                  | session | list API key metadata     |
| `POST`  | `/v1/workspace/api-keys`                  | session | create API key            |
| `POST`  | `/v1/workspace/api-keys/:apiKeyId/rotate` | session | rotate API key            |
| `POST`  | `/v1/workspace/api-keys/:apiKeyId/revoke` | session | revoke API key            |
| `GET`   | `/v1/workspace/invites`                   | session | list invites              |
| `POST`  | `/v1/workspace/invites`                   | session | create invite             |
| `POST`  | `/v1/workspace/invites/:inviteId/revoke`  | session | revoke invite             |

## Status Patterns

Important lifecycle values already used in the API:

- intent status: `draft`, `proposed`, `simulated`, `pending_approval`, `approved`, `rejected`, `queued`, `executing`, `succeeded`, `failed`, `rollback_pending`, `rolled_back`, `rollback_failed`
- approval request status: `pending`, `approved`, `rejected`, `expired`
- subscription status: `trialing`, `active`, `past_due`, `paused`, `canceled`, `expired`, `incomplete`

## Important Notes

- Billing truth is internal to VowGrid. Frontend and agents should depend on `/v1/billing/account`, not raw provider payloads.
- `POST /v1/billing/checkout` returns a provider configuration error until Mercado Pago envs are configured.
- Billing enforcement can return `402 Payment Required` when a workspace is in read-only mode or has hit a hard commercial limit.
- Paid subscriptions can enter overage for `intents` and `executed_actions` instead of being blocked immediately.
- Disabled members cannot log in and lose active dashboard sessions immediately.
- Accepted invites can attach an additional workspace membership to an existing user.
- `POST /v1/intents` creates `draft`.
- `POST /v1/intents/:intentId/propose` is the supported way to enter the simulation path.
- Rollback is processed asynchronously through a dedicated BullMQ worker.

## Error Model

The API returns a standard success envelope and a standard error envelope through `@vowgrid/contracts`.

Typical error codes include:

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `NOT_FOUND`
- `CONFLICT`
- `RATE_LIMITED`
- billing-specific policy and entitlement codes

## Practical Reference Strategy

Use these in order:

1. `docs/API_REFERENCE.md` for the grouped map
2. `docs/AGENT_INTEGRATION_GUIDE.md` for real examples
3. `packages/contracts` for request/response shapes
4. `/v1/docs` for live Swagger-backed inspection

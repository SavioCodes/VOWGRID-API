# API Overview

## Base URL

```text
http://localhost:4000/v1
```

## Authentication

Workflow endpoints accept:

- `X-Api-Key` for trusted machine clients
- `Authorization: Bearer <session>` for dashboard sessions when the route is session-backed

```bash
curl -H "X-Api-Key: vowgrid_local_dev_key" http://localhost:4000/v1/intents
```

## Endpoints

| Method  | Path                                        | Auth          | Description                                                                             |
| ------- | ------------------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| `GET`   | `/v1/health`                                | No            | System health check                                                                     |
| `POST`  | `/v1/auth/signup`                           | No            | Create the first workspace owner and dashboard session                                  |
| `POST`  | `/v1/auth/login`                            | No            | Create a dashboard session                                                              |
| `GET`   | `/v1/auth/me`                               | Session       | Return the current dashboard user and workspace                                         |
| `POST`  | `/v1/auth/logout`                           | Session       | Revoke the current dashboard session                                                    |
| `POST`  | `/v1/auth/password-reset/request`           | No            | Create a password reset request                                                         |
| `POST`  | `/v1/auth/password-reset/confirm`           | No            | Confirm a password reset with a valid token                                             |
| `POST`  | `/v1/auth/email-verification/request`       | Session       | Send a fresh email verification link                                                    |
| `POST`  | `/v1/auth/email-verification/verify`        | No            | Confirm an email verification token                                                     |
| `POST`  | `/v1/auth/oauth/complete`                   | No            | Complete OAuth login or return an OAuth signup candidate                                |
| `POST`  | `/v1/auth/oauth/signup/complete`            | No            | Finish OAuth signup and create the first workspace                                      |
| `POST`  | `/v1/auth/invites/accept`                   | No            | Accept a workspace invite                                                               |
| `POST`  | `/v1/auth/switch-workspace`                 | Session       | Move the current dashboard session to another active workspace                          |
| `GET`   | `/v1/billing/plans`                         | No            | List the internal launch plan catalog                                                   |
| `GET`   | `/v1/billing/account`                       | Yes           | Return billing, trial, usage, entitlement, and provider state for the current workspace |
| `POST`  | `/v1/billing/checkout`                      | Yes           | Start a Mercado Pago subscription checkout for Launch, Pro, or Business                 |
| `POST`  | `/v1/billing/subscription/cancel`           | Yes           | Cancel immediately or mark the subscription to end at period boundary                   |
| `POST`  | `/v1/billing/webhooks/mercado-pago`         | No            | Receive Mercado Pago subscription events                                                |
| `POST`  | `/v1/intents`                               | Yes           | Create a draft intent                                                                   |
| `POST`  | `/v1/intents/:intentId/propose`             | Yes           | Promote a draft intent to `proposed`                                                    |
| `GET`   | `/v1/intents`                               | Yes           | List intents                                                                            |
| `GET`   | `/v1/intents/:intentId`                     | Yes           | Get intent details, including policy evaluations                                        |
| `POST`  | `/v1/intents/:intentId/simulate`            | Yes           | Run connector simulation                                                                |
| `POST`  | `/v1/intents/:intentId/submit-for-approval` | Yes           | Evaluate policies and create an approval request                                        |
| `POST`  | `/v1/approvals/:approvalRequestId/approve`  | Yes           | Approve an approval request                                                             |
| `POST`  | `/v1/approvals/:approvalRequestId/reject`   | Yes           | Reject an approval request                                                              |
| `POST`  | `/v1/intents/:intentId/execute`             | Yes           | Queue intent for execution                                                              |
| `POST`  | `/v1/intents/:intentId/rollback`            | Yes           | Create a rollback attempt                                                               |
| `GET`   | `/v1/receipts/:receiptId`                   | Yes           | Get receipt detail                                                                      |
| `GET`   | `/v1/audit-events`                          | Yes           | Query audit events                                                                      |
| `GET`   | `/v1/policies`                              | Yes           | List policies                                                                           |
| `POST`  | `/v1/policies`                              | Yes           | Create a policy                                                                         |
| `GET`   | `/v1/connectors`                            | Yes           | List connectors                                                                         |
| `POST`  | `/v1/connectors`                            | Yes           | Register a connector                                                                    |
| `GET`   | `/v1/workspace/members`                     | Session admin | List active and disabled workspace members                                              |
| `POST`  | `/v1/workspace/members`                     | Session admin | Create a workspace member directly from the admin surface                               |
| `PATCH` | `/v1/workspace/members/:userId`             | Session admin | Update a workspace member name or role                                                  |
| `POST`  | `/v1/workspace/members/:userId/disable`     | Session admin | Disable a member and revoke active sessions                                             |
| `POST`  | `/v1/workspace/members/:userId/enable`      | Session admin | Re-enable a previously disabled member                                                  |
| `GET`   | `/v1/workspace/invites`                     | Session admin | List active, accepted, revoked, and expired workspace invites                           |
| `POST`  | `/v1/workspace/invites`                     | Session admin | Create an emailed workspace invite                                                      |
| `POST`  | `/v1/workspace/invites/:inviteId/revoke`    | Session admin | Revoke a workspace invite                                                               |
| `GET`   | `/v1/workspace/api-keys`                    | Session admin | List workspace API keys without exposing secrets                                        |
| `POST`  | `/v1/workspace/api-keys`                    | Session admin | Create a workspace API key and reveal the secret once                                   |
| `POST`  | `/v1/workspace/api-keys/:apiKeyId/rotate`   | Session admin | Revoke and replace an API key                                                           |
| `POST`  | `/v1/workspace/api-keys/:apiKeyId/revoke`   | Session admin | Revoke a workspace API key                                                              |
| `GET`   | `/v1/metrics`                               | No or Bearer  | Expose Prometheus-compatible application metrics                                        |

## Response Envelope

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-03-15T15:00:00.000Z"
  }
}
```

## Important Notes

- Billing truth is internal to VowGrid. Frontend logic should depend on `/v1/billing/account`, not on raw provider payloads.
- `POST /v1/billing/checkout` returns a provider configuration error until Mercado Pago envs are configured.
- Billing enforcement can return `402 Payment Required` when a workspace is in read-only mode or has hit a hard commercial limit.
- Paid subscriptions can enter overage for `intents` and `executed_actions` instead of being blocked immediately.
- Disabled members cannot log in and lose active dashboard sessions immediately.
- Accepted invites can attach an additional workspace membership to an existing user.
- `POST /v1/intents` creates `draft`.
- `POST /v1/intents/:intentId/propose` is the supported way to enter the simulation path.
- Intent detail includes `policyEvaluations`.
- Rollback is now processed asynchronously through a dedicated BullMQ worker.

## Swagger

`http://localhost:4000/v1/docs`

# API Overview

## Base URL

```text
http://localhost:4000/v1
```

## Authentication

All endpoints except `/health` require `X-Api-Key`.

```bash
curl -H "X-Api-Key: vowgrid_local_dev_key" http://localhost:4000/v1/intents
```

## Endpoints

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/v1/health` | No | System health check |
| `POST` | `/v1/intents` | Yes | Create a draft intent |
| `POST` | `/v1/intents/:intentId/propose` | Yes | Promote a draft intent to `proposed` |
| `GET` | `/v1/intents` | Yes | List intents |
| `GET` | `/v1/intents/:intentId` | Yes | Get intent details, including policy evaluations |
| `POST` | `/v1/intents/:intentId/simulate` | Yes | Run connector simulation |
| `POST` | `/v1/intents/:intentId/submit-for-approval` | Yes | Evaluate policies and create an approval request |
| `POST` | `/v1/approvals/:approvalRequestId/approve` | Yes | Approve an approval request |
| `POST` | `/v1/approvals/:approvalRequestId/reject` | Yes | Reject an approval request |
| `POST` | `/v1/intents/:intentId/execute` | Yes | Queue intent for execution |
| `POST` | `/v1/intents/:intentId/rollback` | Yes | Create a rollback attempt |
| `GET` | `/v1/receipts/:receiptId` | Yes | Get receipt detail |
| `GET` | `/v1/audit-events` | Yes | Query audit events |
| `GET` | `/v1/policies` | Yes | List policies |
| `POST` | `/v1/policies` | Yes | Create a policy |
| `GET` | `/v1/connectors` | Yes | List connectors |
| `POST` | `/v1/connectors` | Yes | Register a connector |

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

- `POST /v1/intents` creates `draft`.
- `POST /v1/intents/:intentId/propose` is the supported way to enter the simulation path.
- Intent detail now includes `policyEvaluations`.
- Rollback currently stops at visibility and pending attempts; there is no rollback worker yet.

## Swagger

`http://localhost:4000/v1/docs`

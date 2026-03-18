# Backend → Frontend Handoff

> **Author:** Backend team  
> **Date:** 2026-03-15  
> **For:** Design/frontend pass (Gemini or equivalent)
>
> Historical note:
> use `README.md`, `docs/RUNBOOK.md`, and `docs/FINAL_INTEGRATION_REPORT.md` as the current source of truth for local setup, ports, and verified integration status.

---

## 1. What Exists

The backend API is built and ready at `apps/api/`. It provides:

- 16 API endpoints under `/v1/`
- Swagger UI at `/v1/docs`
- Shared contracts at `packages/contracts/`
- Full intent lifecycle (13 states)
- Simulation, policy evaluation, approval workflow, execution, receipts, audits

## 2. API Endpoints (Stable)

| Method | Path                                        | Description              |
| ------ | ------------------------------------------- | ------------------------ |
| `GET`  | `/v1/health`                                | Health check             |
| `POST` | `/v1/intents`                               | Create intent            |
| `GET`  | `/v1/intents`                               | List intents (paginated) |
| `GET`  | `/v1/intents/:intentId`                     | Get intent detail        |
| `POST` | `/v1/intents/:intentId/simulate`            | Simulate                 |
| `POST` | `/v1/intents/:intentId/submit-for-approval` | Submit for approval      |
| `POST` | `/v1/approvals/:approvalRequestId/approve`  | Approve                  |
| `POST` | `/v1/approvals/:approvalRequestId/reject`   | Reject                   |
| `POST` | `/v1/intents/:intentId/execute`             | Execute                  |
| `POST` | `/v1/intents/:intentId/rollback`            | Rollback                 |
| `GET`  | `/v1/receipts/:receiptId`                   | Get receipt              |
| `GET`  | `/v1/audit-events`                          | Query audit events       |
| `GET`  | `/v1/policies`                              | List policies            |
| `POST` | `/v1/policies`                              | Create policy            |
| `GET`  | `/v1/connectors`                            | List connectors          |
| `POST` | `/v1/connectors`                            | Register connector       |

**All routes are considered stable.** Path structure will not change without versioning.

## 3. Canonical Intent States

These are the official states. Use these values exactly in the UI:

```
draft → proposed → simulated → pending_approval → approved → queued → executing → succeeded
                                                                                    ↓
                                                                            rollback_pending
                                                                             ↓           ↓
                                                                       rolled_back  rollback_failed
```

Also: `rejected`, `failed`

**UI state mapping suggestions:**

| State              | UI Treatment                                                     |
| ------------------ | ---------------------------------------------------------------- |
| `draft`            | Gray badge, editable fields                                      |
| `proposed`         | Blue badge, "Simulate" CTA                                       |
| `simulated`        | Purple badge, show simulation results, "Submit for Approval" CTA |
| `pending_approval` | Orange badge, show approval progress bar                         |
| `approved`         | Green badge, "Execute" CTA                                       |
| `rejected`         | Red badge, show rejection reason                                 |
| `queued`           | Yellow badge, loading spinner                                    |
| `executing`        | Yellow badge, progress animation                                 |
| `succeeded`        | Green badge, show receipt link, "Rollback" CTA if supported      |
| `failed`           | Red badge, show error, "Retry" option                            |
| `rollback_pending` | Orange badge, loading spinner                                    |
| `rolled_back`      | Gray badge, "Rolled back" message                                |
| `rollback_failed`  | Red badge, show error, "Retry Rollback" option                   |

## 4. Response Envelope

All responses follow this shape:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: {
    timestamp: string;
    pagination?: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}
```

## 5. Contracts Package

Shared types live at `packages/contracts/src/`. Import like:

```typescript
import type {
  IntentResponse,
  SimulationResultResponse,
  PolicyResponse,
  ApprovalRequestResponse,
  ReceiptResponse,
  AuditEventResponse,
  HealthResponse,
  IntentState,
} from '@vowgrid/contracts';
```

**These types are the source of truth.** Do not invent response shapes in the frontend.

## 6. Authentication

Requests need `X-Api-Key` header. In the frontend dashboard, this should be managed via a settings page where users create/revoke API keys. The dashboard itself will eventually use JWT (not yet implemented).

## 7. What You Should NOT Invent

- ❌ Don't invent API routes — only use what's listed above
- ❌ Don't invent intent states — only use the canonical 13 states
- ❌ Don't invent error codes — they come from the API
- ❌ Don't invent response shapes — use `@vowgrid/contracts` types
- ❌ Don't mock connector types not in the system (currently: `mock`, `slack`)

## 8. What You CAN Invent

- ✅ Dashboard layout, navigation, visual design
- ✅ Data visualization (charts for audit events, intent status distribution)
- ✅ UX flows (e.g., wizard for creating intents)
- ✅ Loading states, empty states, error states
- ✅ Client-side filtering/sorting
- ✅ Notification/toast design

## 9. Demo/Mock Data

For development without a running backend, you can safely create mock data using these shapes:

```typescript
const mockIntent = {
  id: 'cm1abc123',
  title: 'Send onboarding message',
  action: 'send_message',
  status: 'simulated',
  environment: 'production',
  agentId: 'cm1agent001',
  workspaceId: 'cm1ws001',
  createdAt: '2026-03-15T00:00:00.000Z',
  updatedAt: '2026-03-15T00:00:00.000Z',
};

const mockSimulation = {
  id: 'cm1sim001',
  intentId: 'cm1abc123',
  summary: 'Will send a message to #general channel',
  estimatedImpact: 'low',
  riskLevel: 'low',
  reversibility: 'partial',
  affectedResources: [{ type: 'slack_channel', id: 'C123', name: '#general' }],
  warnings: [],
};
```

## 10. Where Things Are

| Artifact         | Location                        |
| ---------------- | ------------------------------- |
| API source       | `apps/api/src/`                 |
| Prisma schema    | `apps/api/prisma/schema.prisma` |
| Shared contracts | `packages/contracts/src/`       |
| API docs         | `docs/backend/API_OVERVIEW.md`  |
| Domain model     | `docs/backend/DOMAIN_MODEL.md`  |
| Swagger UI       | `http://localhost:3000/v1/docs` |
| Docker Compose   | `infra/docker-compose.yml`      |

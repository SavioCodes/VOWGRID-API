# Real-World Scenarios

## Scenario 1: Controlled production action

1. An operator or agent creates an intent.
2. The intent is proposed.
3. Simulation estimates impact and reversibility.
4. Policies decide whether approval is required.
5. A reviewer approves.
6. The execution worker performs the action.
7. A receipt proves what happened.
8. Audit history keeps the actor and timeline visible.

## Scenario 2: Programmatic machine access

Use a workspace API key from `/app/settings` for trusted automation:

```bash
curl -X GET \
  http://localhost:4000/v1/intents?pageSize=5 \
  -H "X-Api-Key: <workspace-api-key>"
```

## Scenario 3: Full local workflow

```bash
curl -X POST http://localhost:4000/v1/intents \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: vowgrid_local_dev_key" \
  -d "{\"title\":\"Rotate support token\",\"action\":\"rotate_secret\",\"agentId\":\"cmg0000000000000000000002\",\"connectorId\":\"cmg0000000000000000000004\",\"environment\":\"production\"}"
```

Then continue with:

- `POST /v1/intents/:intentId/propose`
- `POST /v1/intents/:intentId/simulate`
- `POST /v1/intents/:intentId/submit-for-approval`
- `POST /v1/approvals/:approvalRequestId/approve`
- `POST /v1/intents/:intentId/execute`
- `POST /v1/intents/:intentId/rollback`

## Scenario 4: Enterprise commercial path

Enterprise remains sales-assisted:

- no self-serve checkout
- custom limits and support posture
- explicit commercial handoff
- environment-configured contact path in the site and dashboard

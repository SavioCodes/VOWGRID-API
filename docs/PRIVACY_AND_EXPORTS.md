# Privacy And Exports

## Workspace Export

The dashboard now exposes a workspace export flow through `/app/settings`.

The backing API route is:

- `GET /v1/workspace/export`

The export includes:

- workspace identity
- billing summary
- members
- invites
- API keys metadata
- agents
- connectors
- policies
- intents
- receipts
- audit events

## Member Anonymization

Owners can anonymize disabled members.

The backing API route is:

- `POST /v1/workspace/members/:userId/anonymize`

Current behavior:

- revokes active sessions
- invalidates recovery and verification flows
- removes linked OAuth identities
- replaces personal email with a redacted address
- replaces personal name with an anonymized placeholder
- keeps operational history intact

## What This Does Not Yet Cover

- workspace-wide hard delete
- global soft delete semantics for every domain entity
- automated GDPR workflow orchestration
- data retention automation by jurisdiction

# Privacy And Exports

This document explains what privacy-related controls already exist in VowGrid and where the current limits still are.

## Current Capabilities

## Workspace JSON export

Route:

- `GET /v1/workspace/export`

Who can use it:

- `owner`
- `admin`

Current export includes:

- workspace identity
- billing summary
- members
- invites
- API key metadata
- agents
- connectors
- policies
- intents
- receipts
- audit events

## Audit CSV export

Dashboard path:

- `/app/settings/export/audit`

Purpose:

- quick audit extraction for reviewers, compliance, or incident timelines

## Member anonymization

Route:

- `POST /v1/workspace/members/:userId/anonymize`

Rules:

- only workspace owners can trigger it
- the member must already be disabled
- historical operational records are preserved

Current anonymization behavior:

- revokes sessions
- invalidates recovery and verification tokens
- removes linked OAuth identities
- replaces email with a redacted placeholder
- replaces display name with an anonymized placeholder

## Privacy Posture Today

Already true:

- practical export paths exist
- anonymization exists for disabled members
- audit and workflow history remain inspectable

Not yet true:

- full self-serve user data deletion
- automated retention enforcement by jurisdiction
- full GDPR workflow orchestration
- repository-wide soft delete semantics

## GDPR And Compliance Roadmap

Near-term improvements:

1. retention policies by entity family
2. stronger export filtering and scoped export options
3. workspace export history and access logging
4. broader anonymization across non-user entities when legally required

Longer-term:

1. deletion request workflow
2. regulatory-region data handling rules
3. automated retention expiration jobs
4. compliance reporting surfaces

## Operational Guidance

Use export when:

- onboarding a new operator
- supporting compliance reviews
- preparing for workspace migration
- capturing an incident snapshot

Use anonymization when:

- a user should no longer be identifiable
- history must remain intact for trust and audit reasons

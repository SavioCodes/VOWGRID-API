# Pricing Strategy

## Positioning

VowGrid is trust infrastructure for AI agents. Pricing is aligned to governed action value, not raw API-call volume.

Commercial priority:

1. executed actions per month
2. intents per month as a secondary limit

Launch strategy:

- lower-friction entry pricing for validation
- serious B2B positioning
- no fake "unlimited" packaging
- no hidden automatic overage surprises

## Launch Plan Catalog

| Plan       | Monthly        | Yearly         | Workspaces | Internal users | Active connectors | Intents / month | Executed actions / month | Audit retention | Support        | Advanced policies | Approvals |
| ---------- | -------------- | -------------- | ---------- | -------------- | ----------------- | --------------- | ------------------------ | --------------- | -------------- | ----------------- | --------- |
| Launch     | `R$ 79`        | `R$ 790`       | `1`        | `2`            | `2`               | `2,000`         | `300`                    | `15 days`       | Email          | No                | Basic     |
| Pro        | `R$ 249`       | `R$ 2,490`     | `3`        | `10`           | `8`               | `15,000`        | `3,000`                  | `90 days`       | Priority email | Yes               | Advanced  |
| Business   | `R$ 799`       | `R$ 7,990`     | `10`       | `50`           | `25`              | `100,000`       | `20,000`                 | `365 days`      | Priority       | Yes               | Advanced  |
| Enterprise | `Sob consulta` | `Sob consulta` | Custom     | Custom         | Custom            | Custom          | Custom                   | Custom          | Enterprise     | Custom            | Custom    |

Enterprise note:

- suggested starting ticket: `R$ 1,990`
- self-serve checkout: disabled

## Trial Strategy

- duration: `14` days
- ownership: managed by the VowGrid backend
- provider dependency: none
- current trial entitlement profile: `Pro`

Rationale:

- early teams get to evaluate advanced policy and approval value before converting
- the product avoids a second hidden trial-only plan
- conversion state stays internal and predictable

## Metering Strategy

Included in this release:

- internal usage tracking
- dashboard usage meters
- warning thresholds near limits
- automatic overage billing for paid subscriptions on `intents` and `executed_actions`
- invoice visibility for overage and proration adjustments
- hard blocking for critical write actions after hard limits on trials or inactive billing states
- preserved read access to history, audit, and receipt surfaces

## Messaging Principles

Use:

- trust infrastructure
- governance and control layer
- secure action orchestration
- approvals, receipts, rollback visibility

Avoid:

- cheap commodity API positioning
- vague AI hype language
- misleading unlimited claims
- pricing framed around raw request counts

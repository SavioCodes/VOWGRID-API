# Entitlements And Limits

## Resolution Rules

The workspace entitlement snapshot is derived from internal VowGrid state, not directly from Mercado Pago payloads.

Resolution order:

1. active paid subscription
2. non-active paid subscription
3. active trial
4. expired trial or no billing state

## Trial Behavior

- Trial duration: `14` days
- Trial owner: VowGrid backend
- Trial plan profile: `Pro`
- Trial expiry result: workspace enters read-only billing mode

Read-only mode preserves:

- receipts
- audit history
- billing visibility
- plan and usage context

Read-only mode blocks new critical write actions.

## Usage Metrics

Tracked metrics:

- `workspaces`
- `internal_users`
- `active_connectors`
- `intents`
- `executed_actions`

Warning threshold:

- `80%` of the plan limit

## Enforcement Matrix

| Capability               | Launch  | Pro      | Business  | Enterprise | Current enforcement                                                                                      |
| ------------------------ | ------- | -------- | --------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| Workspaces               | `1`     | `3`      | `10`      | Custom     | Visible in billing, not actively enforced yet because there is no self-serve workspace provisioning flow |
| Internal users           | `2`     | `10`     | `50`      | Custom     | Visible in billing, not actively enforced yet because there is no self-serve user provisioning flow      |
| Active connectors        | `2`     | `8`      | `25`      | Custom     | Hard-blocks enabling new connectors after the limit                                                      |
| Intents / month          | `2,000` | `15,000` | `100,000` | Custom     | Hard-blocks new intent creation after the limit                                                          |
| Executed actions / month | `300`   | `3,000`  | `20,000`  | Custom     | Hard-blocks new critical executions after the limit                                                      |
| Advanced policies        | No      | Yes      | Yes       | Custom     | Hard-blocks advanced policy types on unsupported plans                                                   |
| Advanced approvals       | Basic   | Advanced | Advanced  | Custom     | Hard-blocks multi-step approval requirements on unsupported plans                                        |

## Warning And Blocking Behavior

Near limit:

- usage meter status becomes `warning`
- dashboard surfaces warning copy
- workspace can continue operating

At hard limit:

- usage meter status becomes `blocked`
- the API returns `402 Payment Required` for the protected action
- the dashboard continues to show history and upgrade options

## Protected Write Paths

Current hard-blocked paths:

- create intent
- queue critical execution
- enable connector when connector limit is exceeded
- create advanced policy types on unsupported plans
- require more than one approver on unsupported plans

## Future Release Notes

Not implemented in this release:

- automatic overage charging
- metered billing invoices
- proration engine
- tax logic

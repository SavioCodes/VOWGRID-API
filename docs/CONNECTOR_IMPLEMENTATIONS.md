# Connector Implementations

This document describes what connector types are actually available in the current runtime and what each one can honestly do.

## Runtime Truth

During `buildServer()` the API registers:

- `mock`
- `http`
- `github`

This is wired in `apps/api/src/server.ts` and verified by integration tests.

## Support Matrix

| Connector | Registered in runtime | Config validation | Execute | Rollback | Notes                                            |
| --------- | --------------------- | ----------------- | ------- | -------- | ------------------------------------------------ |
| `mock`    | yes                   | minimal           | yes     | yes      | dev/test reference path                          |
| `http`    | yes                   | yes               | yes     | partial  | depends on endpoint and optional rollback target |
| `github`  | yes                   | yes               | yes     | partial  | limited to a narrow action set                   |
| `slack`   | no                    | no                | no      | no       | intentionally not registered                     |
| `custom`  | no                    | no                | no      | no       | no hosted custom connector runtime yet           |

## `mock`

Purpose:

- local development
- seeded workflow verification
- rollback and receipt reference behavior

## `http`

Purpose:

- webhook-style outbound actions to arbitrary HTTP targets

Expected config:

- `url`
- optional `method`
- optional `headers`
- optional `auth`
- optional `timeoutMs`
- optional `rollbackUrl`
- optional `rollbackMethod`

Execution behavior:

- sends a request to the configured target
- supports `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`
- records response metadata for receipts and rollback context

Rollback behavior:

- only available when `rollbackUrl` is configured
- treated as `partial`
- can still fail if the remote system rejects the reversal request

## `github`

Purpose:

- lightweight operational GitHub actions without another service layer

Supported actions:

- `create_issue`
- `add_issue_comment`
- `close_issue`

Expected config:

- `owner`
- `repo`
- `token`
- optional `apiBaseUrl`
- optional `defaultLabels`

Rollback behavior:

- `create_issue` rollback closes the created issue
- `add_issue_comment` rollback deletes the created comment
- `close_issue` does not have automatic rollback

## Security Notes

- connector config is encrypted before persistence
- list routes expose `hasConfig` and `configEncrypted`, not raw secrets
- connector creation validates config before persistence

## Production Reality

Even though `http` and `github` are registered and tested, they still require:

- real credentials
- operator-supplied target configuration
- endpoint or provider reliability
- environment-appropriate timeout and rollback expectations

## What Is Not Available Yet

- Slack runtime connector
- generic custom connector marketplace
- published connector SDK beyond the internal runtime interface
- hosted credential brokering per connector

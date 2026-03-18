# Connector Implementations

## Runtime Registry

The API runtime now registers these connector types:

- `mock`
- `http`
- `github`

Registration happens during `buildServer()` so the same runtime list is available in app startup,
tests, and background workers.

## `mock`

Purpose:

- local development
- verified execution and rollback flow
- deterministic queue-backed tests

Rollback support:

- `supported`

## `http`

Purpose:

- invoke external webhook-style HTTP targets

Expected config:

- `url`
- optional `rollbackUrl`
- optional `method`
- optional `headers`
- optional `auth`

Rollback support:

- `partial`

Notes:

- config is validated during connector creation
- rollback only succeeds when a rollback target is configured and reachable

## `github`

Purpose:

- simple GitHub operational actions without introducing a separate connector service

Current supported actions:

- `create_issue`
- `add_issue_comment`
- `close_issue`

Rollback support:

- `partial`

Notes:

- issue creation can be rolled back by closing the created issue
- issue comment creation can be rolled back by deleting the created comment
- credentials and repository targeting are supplied through connector config

## Current Limits

- Slack is intentionally not registered
- there is no custom connector SDK yet
- connectors still depend on operator-supplied credentials and endpoint configuration

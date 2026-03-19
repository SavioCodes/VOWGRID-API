# Backup And Recovery

## What Exists Now

VowGrid now ships repository-managed operational scripts for Postgres backup and restore:

- `pnpm db:backup`
- `pnpm db:restore -- --input <path-to-backup.sql.gz>`

These scripts target the Dockerized Postgres container and are intended for:

- local disaster-recovery drills
- staging snapshots before risky migrations
- production operators on the chosen single-host launch topology

## Default Behavior

Backup defaults:

- container: `vowgrid-postgres`
- user: `vowgrid`
- database: `vowgrid`
- output directory: `backups/postgres/`

Example:

```bash
pnpm db:backup
```

Example output:

- `backups/postgres/vowgrid-2026-03-18T23-40-00-000Z.sql.gz`

## Restore Flow

```bash
pnpm db:restore -- --input backups/postgres/vowgrid-2026-03-18T23-40-00-000Z.sql.gz
```

This restore path streams the dump back into the running Postgres container and is designed for controlled operator use, not for automatic rollback during deploys.

## Production Guidance

For the current single-host launch path:

1. run a fresh backup before applying production migrations
2. store compressed dumps outside the live release directory
3. replicate backups to an off-host location
4. test restore in staging before treating the policy as production-ready

## Still Outside The Repo

The repository now includes the backup/restore mechanics, but these still require operator setup outside the repo:

- off-host backup retention
- scheduled backup automation
- encrypted backup storage policy
- periodic restore drills against staging or a disposable environment

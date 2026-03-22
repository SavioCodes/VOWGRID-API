# Roadmap

## Now

- Replace temporary public exposure with a permanent production-grade API host
- Provision deploy secrets, remote env files, DNS, and a stable release target
- Configure real provider credentials for SMTP, Mercado Pago, and optional OAuth or OIDC
- Expand browser coverage deeper into execution, billing, and rollback journeys
- Wire centralized observability sinks and alert routing on top of `/v1/metrics`

## Next

- Enterprise sales/contact workflow and provisioning handoff
- Advanced tax and invoice handling
- Harder production posture around secrets, backups, and rollback strategy
- Publish `@vowgrid/sdk` to npm once release cadence is stable

## Later

- SSO / enterprise identity
- Deeper organization and tenant models beyond the current workspace abstraction
- Managed-cloud infrastructure modules beyond the current VPS-style Terraform scaffold

## Backlog Policy

- use GitHub issues for work that should be tracked to completion
- use `CHANGELOG.md` for work that has already landed in a tagged baseline
- keep this document future-facing instead of repeating the current implementation status

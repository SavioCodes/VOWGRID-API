# Go-Live Checklist

This checklist is the final bridge between "repository complete" and "production actually ready".

## 1. Infrastructure

- Provision the AWS VPS from `infra/terraform/aws-vps` or an equivalent hardened host.
- Point DNS for the primary domain to the host.
- Confirm only `80`, `443`, and restricted `22` are reachable publicly.
- Prepare persistent backups for Postgres volumes before customer traffic.
- Run `infra/scripts/bootstrap-host.sh` if you want the repository-standard Docker host posture.

## 2. Remote Runtime Files

Create these files on the host under `infra/`:

- `infra/.env`
- `infra/api.env`
- `infra/web.env`

Start from:

- `infra/.env.production.example`
- `infra/api.env.example`
- `infra/web.env.example`

Replace every placeholder secret before the first deploy.

## 3. Billing

- Configure the Mercado Pago application/account.
- Set `MERCADO_PAGO_ACCESS_TOKEN`.
- Set `MERCADO_PAGO_WEBHOOK_SECRET`.
- Set a real `MERCADO_PAGO_WEBHOOK_URL`.
- Set a real `MERCADO_PAGO_RETURN_URL`.
- Run at least one real checkout and one webhook sync test in the target environment.

## 4. Email And Auth

- Configure SMTP for password reset, email verification, and invite flows.
- If using GitHub login, set the GitHub OAuth client id and secret.
- If using Google login, set the Google OAuth client id and secret.
- Confirm redirects and callback URLs match the production primary domain.

## 5. Enterprise Handling

- Configure `NEXT_PUBLIC_VOWGRID_ENTERPRISE_CONTACT_URL` or `NEXT_PUBLIC_VOWGRID_ENTERPRISE_CONTACT_EMAIL`.
- Confirm the sales/inbox path is monitored by a real person or team.
- Decide how the team will provision enterprise workspaces after commercial approval.

## 6. Observability

- Decide whether the bundled self-hosted stack is enough for launch.
- If using Grafana/Prometheus only, change default Grafana credentials.
- If using external tools, wire Datadog, Sentry, New Relic, Slack, email, or PagerDuty separately.
- If you only need lightweight Slack delivery, set `SLACK_ALERT_WEBHOOK_URL` in the API environment.
- Validate alerts for API down, elevated 5xx, slow latency, execution failures, and rollback failures.

## 7. Deploy Automation

- Configure GitHub Actions secrets for staging and production.
- Confirm GHCR image push works.
- Confirm SSH deploy works.
- Run at least one successful staging deploy and one successful production deploy.

## 8. Final Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm test:integration`
- `pnpm test:coverage`
- `pnpm test:e2e`
- `pnpm build`
- `pnpm docker:release:config`

## 9. Honest Remaining Limits

These items are still outside the current release scope even after go-live:

- enterprise SSO / SAML
- advanced jurisdiction-aware tax compliance
- full invoice compliance engine
- managed multi-node production platform
- hosted observability vendors preconfigured out of the box

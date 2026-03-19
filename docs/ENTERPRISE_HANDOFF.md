# Enterprise Handoff

Enterprise remains sales-assisted in the current release. This document describes the expected handoff shape instead of pretending there is already a fully automated enterprise sales system.

## Entry Path

The product uses one of these web envs for Enterprise CTA routing:

- `NEXT_PUBLIC_VOWGRID_ENTERPRISE_CONTACT_URL`
- fallback: `NEXT_PUBLIC_VOWGRID_ENTERPRISE_CONTACT_EMAIL`

If neither is configured, the UI shows `Enterprise contact not configured`.

## What Sales Or Success Should Collect

- company name
- business owner
- technical owner
- expected executed actions per month
- expected intent volume
- required connector types
- expected approval complexity
- required audit retention
- support expectations
- procurement or security review requirements
- identity-provider requirements

## Manual Qualification Checklist

1. confirm whether generic OIDC is enough or SAML is explicitly required
2. confirm whether custom connectors are needed
3. confirm billing model and contract term
4. confirm audit/export expectations
5. confirm known product gaps are understood

## Current Provisioning Reality

1. lead arrives through the configured CTA
2. commercial and technical scope are reviewed manually
3. pricing and limits are negotiated manually
4. workspace is provisioned manually
5. auth, billing, and support expectations are aligned manually
6. onboarding guidance is handed over

## SLA Template For Early Enterprise Deals

| Area                    | Suggested launch posture                                     |
| ----------------------- | ------------------------------------------------------------ |
| Support hours           | business-hours response unless otherwise negotiated          |
| Initial response target | same day for critical incidents                              |
| Identity                | OIDC if provider-compatible; SAML is not first-class yet     |
| Billing                 | sales-assisted, manual provisioning                          |
| Deployment              | single-region, single-host topology unless separately scoped |
| Audit export            | JSON and CSV export supported                                |

## What Can Be Negotiated Today

- custom limits
- support tier
- audit retention expectations
- connector onboarding priority
- billing terms

## What Cannot Yet Be Promised As Native Product Features

- SAML-specific federation
- self-serve enterprise checkout
- automated CRM to provisioning workflow
- deep enterprise org hierarchy model

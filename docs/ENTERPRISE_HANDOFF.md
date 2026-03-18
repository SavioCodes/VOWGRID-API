# Enterprise Handoff

## Current commercial path

Enterprise remains **sales-assisted** in this release.

There is no self-serve checkout for Enterprise.

The product uses one of these web envs for the CTA path:

- `NEXT_PUBLIC_VOWGRID_ENTERPRISE_CONTACT_URL`
- fallback: `NEXT_PUBLIC_VOWGRID_ENTERPRISE_CONTACT_EMAIL`

If neither is configured, the site and dashboard show `Enterprise contact not configured` instead of pretending the CTA works.

## What sales should collect

- company name
- primary technical contact
- primary business contact
- expected monthly executed action volume
- expected monthly intent volume
- connector count and connector types
- required audit retention
- approval and governance needs
- security or procurement requirements
- expected support posture

## What is negotiated manually today

- commercial price and term
- support tier
- custom limits
- advanced governance expectations
- provisioning timing
- any non-standard procurement or security review steps

## Provisioning reality

Today, Enterprise provisioning is still manual.

Typical path:

1. commercial contact is captured through the configured CTA
2. the team confirms scope and commercial terms
3. the workspace is provisioned by the VowGrid team
4. billing/provider state is aligned manually as needed
5. the customer receives the admin login path and operating guidance

## Honest limitations

- no CRM integration
- no automated sales pipeline
- no enterprise self-serve checkout
- no custom provisioning console
- no automated contract-to-workspace handoff yet

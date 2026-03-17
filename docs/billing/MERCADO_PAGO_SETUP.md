# Mercado Pago Setup

## What Is Already Implemented In Code

The repository already includes:

- Mercado Pago provider adapter
- self-serve checkout creation for Launch, Pro, and Business
- webhook endpoint at `/v1/billing/webhooks/mercado-pago`
- webhook idempotency through `BillingEvent.eventKey`
- internal subscription sync after provider event receipt
- dashboard provider-readiness surface

## Required Environment Variables

Set these in `apps/api/.env`:

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_API_BASE_URL`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_WEBHOOK_URL`
- `MERCADO_PAGO_RETURN_URL`

Defaults already included in `apps/api/.env.example`:

- `MERCADO_PAGO_API_BASE_URL=https://api.mercadopago.com`
- `MERCADO_PAGO_RETURN_URL=http://localhost:3000/app/billing`

## Manual Account Setup Still Required

1. Create or select the Mercado Pago application that will own subscriptions.
2. Obtain the access token for the environment you want to use.
3. Configure the return URL to point back to the VowGrid billing surface.
4. Expose the webhook endpoint through a public URL for local testing, for example with a tunnel.
5. Configure Mercado Pago to send subscription-related events to the public webhook URL.
6. Set the webhook secret that matches your Mercado Pago webhook signature configuration.

## Implemented Integration Shape

Checkout:

- VowGrid creates a Mercado Pago `preapproval`
- VowGrid stores the internal subscription record immediately
- the dashboard redirects to the returned checkout URL

Webhook sync:

- VowGrid receives the event
- validates the signature when a secret is configured
- fetches the latest provider subscription snapshot
- maps provider status into internal status
- updates the internal workspace subscription

## Signature Validation Notes

The implementation supports signature validation based on:

- `x-signature`
- `x-request-id`
- the provider subscription resource id

Production expectation:

- configure `MERCADO_PAGO_WEBHOOK_SECRET`
- require signed events

Local development behavior:

- if no webhook secret is configured and `NODE_ENV` is not `production`, the handler accepts events for local iteration

## Recommended Local Testing Flow

1. Start VowGrid locally.
2. Configure the Mercado Pago envs in `apps/api/.env`.
3. Expose `http://localhost:4000/v1/billing/webhooks/mercado-pago` through a public tunnel.
4. Set `MERCADO_PAGO_WEBHOOK_URL` to the tunneled URL.
5. Trigger `POST /v1/billing/checkout` from the dashboard or API.
6. Complete the subscription flow in the provider sandbox or test environment.
7. Confirm `GET /v1/billing/account` reflects the updated subscription state.

## Safety Notes

- Do not commit Mercado Pago tokens or secrets.
- Do not log raw sensitive payment data.
- Do not rely on raw provider payloads as the billing source of truth.

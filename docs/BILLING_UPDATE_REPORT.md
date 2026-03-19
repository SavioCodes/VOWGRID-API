# Billing Update Report

> Historical billing-phase report kept for traceability.
> Current billing truth lives in `README.md`, `docs/IMPLEMENTATION_STATUS.md`, and `docs/billing/*`.

## Pricing Snapshot

| Plan       | Monthly  | Yearly     | Executed actions | Intents   | Notes              |
| ---------- | -------- | ---------- | ---------------- | --------- | ------------------ |
| Launch     | `R$ 79`  | `R$ 790`   | `300`            | `2,000`   | entry plan         |
| Pro        | `R$ 249` | `R$ 2,490` | `3,000`          | `15,000`  | advanced approvals |
| Business   | `R$ 799` | `R$ 7,990` | `20,000`         | `100,000` | higher scale       |
| Enterprise | custom   | custom     | custom           | custom    | sales-assisted     |

## What Was Added

- plan catalog
- trial state
- entitlements
- usage tracking
- overage support
- invoices
- proration preview
- coupon support
- tax profile controls
- Mercado Pago provider layer

## Overage Example

Illustrative invoice pattern:

| Line item               | Quantity | Unit amount             | Subtotal       |
| ----------------------- | -------- | ----------------------- | -------------- |
| included subscription   | 1        | plan price              | plan subtotal  |
| executed action overage | N        | configured overage unit | usage subtotal |
| intents overage         | N        | configured overage unit | usage subtotal |

Total invoice:

- subtotal
- tax amount from current customer tax profile
- final total in BRL cents

## What Is Real Versus External

Implemented in code:

- internal billing truth
- invoice records
- provider webhook handling
- checkout foundation

Still external:

- Mercado Pago account credentials
- public webhook delivery
- live transaction validation

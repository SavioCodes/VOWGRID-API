# UI Decisions

## Why dark-first

The product is a control plane centered on review, risk, and proof. A dark-first palette gives dense technical surfaces contrast without feeling noisy or toy-like.

## Why provisional mode is visible

The repository now has a seeded local backend flow, but live environments can still be missing or unreachable. Instead of hiding that gap, the UI shows whether it is using the live adapter or the provisional adapter.

## Why policy review is split from intent detail

Policy reasoning is important enough to deserve its own surface. Keeping it separate lets operators scan the workflow first, then inspect policy detail without overloading the primary intent view.

## Why the workspace switcher exists even though multi-workspace routing is incomplete

The shell needs the right long-term affordance, but the switcher still communicates that real workspace routing depends on backend support that is not finished yet.

## Why there is no fake JWT login

The backend truth today is API-key auth. Creating a fake sign-in experience would misrepresent the integration state, so the settings screen explains the current auth posture instead.

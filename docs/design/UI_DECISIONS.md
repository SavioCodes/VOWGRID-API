# UI Decisions

## Why dark-first

The product is a control plane centered on review, risk, and proof. A dark-first palette gives dense technical surfaces contrast without feeling noisy or toy-like.

## Why provisional mode is visible

The repository now has a seeded local backend flow, but live environments can still be missing or unreachable. Instead of hiding that gap, the UI shows whether it is using the live adapter or the provisional adapter.

## Why policy review is split from intent detail

Policy reasoning is important enough to deserve its own surface. Keeping it separate lets operators scan the workflow first, then inspect policy detail without overloading the primary intent view.

## Why the workspace switcher exists

The switcher is now backed by real workspace memberships and invite acceptance. It stays intentionally lightweight in the shell so operators can move between active workspaces without turning the sidebar into an organization-management UI.

## Why there is no fake JWT login

The backend truth now is session auth for humans and API keys for machines. The UI keeps those surfaces explicit instead of pretending that machine credentials and operator sign-in are the same thing.

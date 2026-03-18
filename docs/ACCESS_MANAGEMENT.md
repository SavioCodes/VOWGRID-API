# Access Management

## Scope

VowGrid now supports real access administration inside and across workspaces, while keeping the current membership model straightforward.

Implemented:

- direct member creation by owner or admin
- member profile updates for `name` and `role`
- member disable and re-enable
- invite-by-email creation and revoke
- invite acceptance for new or existing users
- multi-workspace membership through accepted invites or direct admin provisioning
- workspace switching across active memberships
- workspace API key create, list, rotate, and revoke
- immediate session revocation when a member is disabled

Out of scope in this phase:

- enterprise SSO / SAML / generic OIDC
- MFA
- SCIM / directory sync
- organization-wide admin across many workspaces

## Member roles

- `owner`: reserved to the initial signup flow
- `admin`: can manage members and API keys
- `member`: can use the product but cannot access workspace admin routes
- `viewer`: read-oriented product access without workspace admin routes

## Member lifecycle

### Create

- owners and admins can create `admin`, `member`, or `viewer`
- new members receive a direct initial password set by the admin
- user creation is blocked when the active-member billing limit is already reached

### Update

- owners and admins can update member `name`
- owners and admins can change roles between `admin`, `member`, and `viewer`
- owner role is not assignable through the admin surface

### Disable

- disabling a member sets `disabledAt`
- active dashboard sessions for that member are revoked immediately
- disabled members cannot log in again until re-enabled
- owner accounts cannot be disabled from this admin surface

### Enable

- re-enabling a member clears `disabledAt`
- re-enable is blocked if the active-member billing limit is already reached

## Billing interaction

The `internal_users` limit counts only **active** workspace users.

That means:

- disabled users stop consuming active-member capacity
- re-enable and create are both blocked at the hard limit
- warning and blocked states surface through the billing account endpoint and the dashboard

## API keys

Workspace API keys remain the machine-to-machine access path.

Rules:

- secrets are revealed only once at create and rotate time
- list responses only return metadata
- revoked keys stop authenticating immediately
- rotated keys revoke the old credential transactionally
- all dashboard-created keys are full-scope workspace keys in this release

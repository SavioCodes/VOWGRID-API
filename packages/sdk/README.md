# `@vowgrid/sdk`

Typed TypeScript client for the VowGrid API.

## Install from this repository

```bash
pnpm add @vowgrid/sdk@workspace:*
```

## Example

```ts
import { VowGridClient } from '@vowgrid/sdk';

const client = new VowGridClient({
  baseUrl: process.env.VOWGRID_BASE_URL ?? 'http://localhost:4000',
  apiKey: process.env.VOWGRID_API_KEY,
});

const plans = await client.listBillingPlans();
const intents = await client.listIntents({ pageSize: 5 });

console.log(plans.length, intents.length);
```

## Publishing readiness

This package is now structured to be publish-ready:

- built output lives in `dist/`
- package exports are explicit
- repository metadata points back to this monorepo
- `publishConfig.access` is set to `public`

The actual npm publication step still requires registry credentials outside this repository.

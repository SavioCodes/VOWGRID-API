# Local Development

## Prerequisites

- Node.js 22+
- pnpm 9+
- Docker Desktop running locally

## Setup

1. Install dependencies.
   `pnpm install`
2. Copy `apps/api/.env.example` to `apps/api/.env` if needed.
3. Start Postgres and Redis.
   `pnpm docker:up`
4. Apply Prisma migrations.
   `pnpm migrate`
5. Seed the local workspace, users, connectors, policies, and API key.
   `pnpm seed`
6. Start the API.
   `pnpm dev:api`

## Local URLs

- API health: `http://localhost:4000/v1/health`
- Swagger UI: `http://localhost:4000/v1/docs`
- Web app: `http://localhost:3000`

## Common Commands

| Command            | Description                        |
| ------------------ | ---------------------------------- |
| `pnpm dev:api`     | Start the API with hot reload      |
| `pnpm build`       | Build contracts, API, and web      |
| `pnpm lint`        | Run the root lint gate             |
| `pnpm typecheck`   | Run workspace type checks          |
| `pnpm test`        | Run API tests                      |
| `pnpm migrate`     | Apply Prisma migrations            |
| `pnpm seed`        | Seed a local workspace and API key |
| `pnpm db:studio`   | Open Prisma Studio                 |
| `pnpm docker:up`   | Start Postgres and Redis           |
| `pnpm docker:down` | Stop Postgres and Redis            |

## Seeded Local Credentials

After `pnpm seed`, the repo contains:

- Workspace ID: `cmg0000000000000000000001`
- Agent ID: `cmg0000000000000000000002`
- Reviewer ID: `cmg0000000000000000000003`
- Mock connector ID: `cmg0000000000000000000004`
- API key: `vowgrid_local_dev_key`

## Troubleshooting

- If `pnpm docker:up` fails, start Docker Desktop first.
- The API now defaults to port `4000` to avoid colliding with the Next.js web app on `3000`.
- For body-less `POST` routes, omit `Content-Type` or send `{}` as the request body if your client insists on JSON.

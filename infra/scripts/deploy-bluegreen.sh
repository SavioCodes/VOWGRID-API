#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${TARGET_SLOT:-}" ]]; then
  echo "TARGET_SLOT is required" >&2
  exit 1
fi

if [[ -z "${VOWGRID_API_IMAGE:-}" || -z "${VOWGRID_WEB_IMAGE:-}" ]]; then
  echo "VOWGRID_API_IMAGE and VOWGRID_WEB_IMAGE are required" >&2
  exit 1
fi

compose_args=(--env-file infra/.env.bluegreen -f infra/docker-compose.bluegreen.yml)

docker compose "${compose_args[@]}" pull
docker compose "${compose_args[@]}" up -d postgres redis "api-${TARGET_SLOT}" "web-${TARGET_SLOT}"
docker compose "${compose_args[@]}" run --rm "api-${TARGET_SLOT}" pnpm migrate
docker compose "${compose_args[@]}" exec -T "api-${TARGET_SLOT}" wget -qO- http://127.0.0.1:4000/v1/health >/dev/null
docker compose "${compose_args[@]}" exec -T "web-${TARGET_SLOT}" wget -qO- http://127.0.0.1:3000 >/dev/null

if grep -q '^VOWGRID_ACTIVE_SLOT=' infra/.env.bluegreen; then
  sed -i "s/^VOWGRID_ACTIVE_SLOT=.*/VOWGRID_ACTIVE_SLOT=${TARGET_SLOT}/" infra/.env.bluegreen
else
  printf '\nVOWGRID_ACTIVE_SLOT=%s\n' "${TARGET_SLOT}" >> infra/.env.bluegreen
fi

docker compose "${compose_args[@]}" up -d caddy

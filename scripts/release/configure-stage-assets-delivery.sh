#!/usr/bin/env bash
set -euo pipefail

DATA_ROOT=${DATA_ROOT:-/opt/coc-platform-data}
ENV_FILE=${ENV_FILE:-$DATA_ROOT/env/server.env}
ASSET_ROOT=${STAGE_ASSET_ROOT:-$DATA_ROOT/stage-assets}
DELIVERY_URL=${STAGE_ASSET_DELIVERY_BASE_URL:-https://stage-assets.coc.city/delivery}

install -d -m 750 "$ASSET_ROOT" "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

set_env() {
  local key="$1" value="$2" tmp
  tmp=$(mktemp)
  grep -v "^${key}=" "$ENV_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$value" >> "$tmp"
  install -m 600 "$tmp" "$ENV_FILE"
  rm -f "$tmp"
}

if ! grep -q '^STAGE_ASSET_DELIVERY_SECRET=' "$ENV_FILE"; then
  secret=$(openssl rand -hex 32)
  set_env STAGE_ASSET_DELIVERY_SECRET "$secret"
  unset secret
fi
set_env STAGE_ASSET_ROOT "$ASSET_ROOT"
set_env STAGE_ASSET_DELIVERY_BASE_URL "$DELIVERY_URL"
echo "stage asset delivery environment prepared (secret value not displayed)"

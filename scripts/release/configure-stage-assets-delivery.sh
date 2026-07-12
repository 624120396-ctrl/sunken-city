#!/usr/bin/env bash
set -euo pipefail

DATA_ROOT=${DATA_ROOT:-/opt/coc-platform-data}
ENV_FILE=${ENV_FILE:-$DATA_ROOT/env/server.env}
ASSET_ROOT=${STAGE_ASSET_ROOT:-$DATA_ROOT/stage-assets}
DELIVERY_URL=${STAGE_ASSET_DELIVERY_BASE_URL:-https://stage-assets.coc.city/delivery}
ENV_DIR=$(dirname "$ENV_FILE")
timestamp=$(date -u '+%Y%m%dT%H%M%SZ')
backup_file="$ENV_FILE.stage-assets-delivery.$timestamp.$$.bak"
tmp_file=""

cleanup() {
  [ -z "$tmp_file" ] || rm -f "$tmp_file"
}
trap cleanup EXIT

install -d -m 750 "$ASSET_ROOT" "$ENV_DIR"
if [ -f "$ENV_FILE" ]; then
  cp -p "$ENV_FILE" "$backup_file"
else
  : > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  cp -p "$ENV_FILE" "$backup_file"
fi
chmod 600 "$ENV_FILE" "$backup_file"

existing_secret=$(sed -n 's/^STAGE_ASSET_DELIVERY_SECRET=//p' "$ENV_FILE" | tail -n 1)
if [ -z "$existing_secret" ]; then
  existing_secret=$(openssl rand -hex 32)
fi
if [ -z "$existing_secret" ]; then
  echo "ERROR: STAGE_ASSET_DELIVERY_SECRET generation failed; original env remains at $ENV_FILE" >&2
  exit 1
fi

tmp_file=$(mktemp "$ENV_DIR/.server.env.stage-assets.XXXXXX")
chmod 600 "$tmp_file"
{
  grep -Ev '^(STAGE_ASSET_DELIVERY_SECRET|STAGE_ASSET_ROOT|STAGE_ASSET_DELIVERY_BASE_URL|STAGE_ASSET_ALLOWED_ORIGIN)=' "$ENV_FILE" || true
  printf 'STAGE_ASSET_DELIVERY_SECRET=%s\n' "$existing_secret"
  printf 'STAGE_ASSET_ROOT=%s\n' "$ASSET_ROOT"
  printf 'STAGE_ASSET_DELIVERY_BASE_URL=%s\n' "$DELIVERY_URL"
  printf 'STAGE_ASSET_ALLOWED_ORIGIN=%s\n' "${STAGE_ASSET_ALLOWED_ORIGIN:-https://coc.city}"
} > "$tmp_file"
sync -f "$tmp_file" 2>/dev/null || true
mv -f "$tmp_file" "$ENV_FILE"
tmp_file=""
chmod 600 "$ENV_FILE"

echo "stage asset delivery environment prepared (secret value not displayed; rollback: cp -p '$backup_file' '$ENV_FILE')"

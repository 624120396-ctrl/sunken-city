#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
SCRIPT="$ROOT/scripts/release/configure-stage-assets-delivery.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
env_dir="$tmp/env"
env_file="$env_dir/server.env"
mkdir -p "$env_dir"
printf 'KEEP=yes\nSTAGE_ASSET_DELIVERY_SECRET=stable-secret\nSTAGE_ASSET_DELIVERY_SECRET=stale-secret\nSTAGE_ASSET_ROOT=old\n' > "$env_file"
chmod 600 "$env_file"

output=$(DATA_ROOT="$tmp/data" ENV_FILE="$env_file" STAGE_ASSET_DELIVERY_BASE_URL='https://stage-assets.coc.city/delivery' bash "$SCRIPT")
test "$(stat -c '%a' "$env_file")" = 600
test "$(grep -c '^STAGE_ASSET_DELIVERY_SECRET=' "$env_file")" = 1
test "$(grep -c '^STAGE_ASSET_ROOT=' "$env_file")" = 1
test "$(grep -c '^STAGE_ASSET_DELIVERY_BASE_URL=' "$env_file")" = 1
test "$(grep -c '^STAGE_ASSET_ALLOWED_ORIGIN=' "$env_file")" = 1
test "$(grep -c '^KEEP=yes$' "$env_file")" = 1
test "$(printf '%s' "$output" | grep -c 'stable-secret')" = 0
backup=$(find "$env_dir" -name 'server.env.stage-assets-delivery.*.bak' | head -n 1)
test -n "$backup"
test "$(stat -c '%a' "$backup")" = 600

DATA_ROOT="$tmp/data" ENV_FILE="$env_file" STAGE_ASSET_DELIVERY_BASE_URL='https://stage-assets.coc.city/delivery' bash "$SCRIPT" >/dev/null
test "$(grep -c '^STAGE_ASSET_DELIVERY_SECRET=' "$env_file")" = 1

before=$(sha256sum "$env_file" | awk '{print $1}')
mkdir "$tmp/bin"
cat > "$tmp/bin/mv" <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
chmod 700 "$tmp/bin/mv"
if PATH="$tmp/bin:$PATH" DATA_ROOT="$tmp/data" ENV_FILE="$env_file" STAGE_ASSET_DELIVERY_BASE_URL='https://stage-assets.coc.city/delivery' bash "$SCRIPT" >/dev/null 2>&1; then
  echo 'expected atomic replace failure' >&2
  exit 1
fi
after=$(sha256sum "$env_file" | awk '{print $1}')
test "$before" = "$after"
echo 'configure-stage-assets-delivery tests passed'

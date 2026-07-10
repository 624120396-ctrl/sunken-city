#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
release_script="$repo_root/scripts/release/server-release.sh"
tmp_dir=$(mktemp -d)
trap 'rm -rf "$tmp_dir"' EXIT

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

write_fake() {
  local path="$1"
  local body="$2"
  printf '%s\n' "$body" > "$path"
  chmod +x "$path"
}

fake_bin="$tmp_dir/bin"
mkdir -p "$fake_bin"

write_fake "$fake_bin/curl" '#!/usr/bin/env bash
set -euo pipefail
count_file="$TEST_STATE_DIR/curl-count"
count=0
if [ -f "$count_file" ]; then read -r count < "$count_file"; fi
count=$((count + 1))
printf "%s\n" "$count" > "$count_file"
if [ "$count" -lt "${TEST_CURL_SUCCEEDS_ON:-2}" ]; then exit 7; fi
printf "{\"status\":\"ok\"}"'

write_fake "$fake_bin/pm2" '#!/usr/bin/env bash
exit 0'

write_fake "$fake_bin/id" '#!/usr/bin/env bash
printf "0\n"'

write_fake "$fake_bin/npx" '#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *"prisma migrate deploy"* ]]; then
  if [ "${DATABASE_URL:-}" = "${EXPECTED_DATABASE_URL:-}" ]; then exit 0; fi
  echo "DATABASE_URL did not match dotenv parsing semantics" >&2
  exit 42
fi
exit 1'

if ! PATH="$fake_bin:$PATH" TEST_STATE_DIR="$tmp_dir" TEST_CURL_SUCCEEDS_ON=2 HEALTH_RETRY_DELAY_SECONDS=0 HEALTH_MAX_ATTEMPTS=2 HEALTH_READY_TIMEOUT_SECONDS=5 bash "$release_script" health >/dev/null 2>&1; then
  fail "health command did not retry a transient startup failure"
fi

rm -f "$tmp_dir/curl-count"
if PATH="$fake_bin:$PATH" TEST_STATE_DIR="$tmp_dir" TEST_CURL_SUCCEEDS_ON=99 HEALTH_RETRY_DELAY_SECONDS=0 HEALTH_MAX_ATTEMPTS=3 HEALTH_READY_TIMEOUT_SECONDS=5 bash "$release_script" health >/dev/null 2>&1; then
  fail "health command succeeded after the retry limit"
fi

attempts=$(<"$tmp_dir/curl-count")
if [ "$attempts" != 3 ]; then
  fail "health command made $attempts attempts instead of the configured limit"
fi

mkdir -p "$tmp_dir/data" "$tmp_dir/releases/abcdef1/apps/server"
touch "$tmp_dir/data/dev.db"
env_file="$tmp_dir/server.env"

run_migrate_case() {
  local name="$1"
  local line="$2"
  local expected="$3"
  printf '%s\n' "$line" > "$env_file"

  local migration_output
  if ! migration_output=$(PATH="$fake_bin:$PATH" NODE_PATH="$repo_root/apps/server/node_modules" EXPECTED_DATABASE_URL="$expected" DATA_ROOT="$tmp_dir/data" RELEASE_ROOT="$tmp_dir/releases" ENV_FILE="$env_file" bash "$release_script" migrate --commit abcdef1 2>&1); then
    fail "migrate command did not preserve dotenv semantics for $name: $migration_output"
  fi
}

run_migrate_case "unquoted value" 'DATABASE_URL=file:/opt/coc-platform-data/dev.db' 'file:/opt/coc-platform-data/dev.db'
run_migrate_case "double-quoted value" 'DATABASE_URL="file:/opt/coc-platform-data/dev.db"' 'file:/opt/coc-platform-data/dev.db'
run_migrate_case "surrounding whitespace" 'DATABASE_URL=  file:/opt/coc-platform-data/dev.db  ' 'file:/opt/coc-platform-data/dev.db'

echo "PASS: release health retry and DATABASE_URL parsing"

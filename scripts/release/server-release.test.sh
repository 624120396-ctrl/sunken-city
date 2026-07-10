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

echo "PASS: release health retry behavior"

#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
release_script=${RELEASE_SCRIPT_UNDER_TEST:-"$repo_root/scripts/release/server-release.sh"}
test_node_path=${TEST_NODE_PATH:-"$repo_root/apps/server/node_modules"}
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
if [ "${1:-}" = start ]; then
  printf "%s|%s\n" "$PWD" "$(tr -d "\r\n" < dist/index.js)" >> "$TEST_STATE_DIR/pm2-start-cwds"
fi
exit 0'

write_fake "$fake_bin/id" '#!/usr/bin/env bash
printf "0\n"'

write_fake "$fake_bin/npx" '#!/usr/bin/env bash
set -euo pipefail
if [[ "$*" == *"prisma migrate deploy"* ]]; then
  printf "%s\n" "$PWD" > "$TEST_STATE_DIR/npx-cwd"
  if [ "${DATABASE_URL:-}" = "${EXPECTED_DATABASE_URL:-}" ]; then exit 0; fi
  echo "DATABASE_URL did not match dotenv parsing semantics" >&2
  exit 42
fi
if [[ "$*" == *"prisma generate"* ]]; then
  exit 0
fi
exit 1'

write_fake "$fake_bin/npm" '#!/usr/bin/env bash
exit 0'

write_fake "$fake_bin/ps" '#!/usr/bin/env bash
if [[ "$*" == *args* ]]; then
  printf "42 livekit-server --api-secret=process-secret-must-not-appear\n43 turnserver\n"
else
  printf "42 livekit-server\n43 turnserver\n"
fi'

write_fake "$fake_bin/ss" '#!/usr/bin/env bash
printf "LISTEN 0 0 *:7880 *:*\nLISTEN 0 0 *:7881 *:*\nLISTEN 0 0 *:3478 *:*\nLISTEN 0 0 *:5349 *:*\n"'

write_fake "$fake_bin/nginx" '#!/usr/bin/env bash
if [[ "$*" == *-T* ]]; then
  printf "livekit proxy credential=nginx-secret-must-not-appear\n"
fi'

write_fake "$fake_bin/find" '#!/usr/bin/env bash
printf "livekit.example.test\n"'

if ! PATH="$fake_bin:$PATH" TEST_STATE_DIR="$tmp_dir" DATA_ROOT="$tmp_dir/data" TEST_CURL_SUCCEEDS_ON=2 HEALTH_RETRY_INTERVAL_SECONDS=0 HEALTH_MAX_ATTEMPTS=2 HEALTH_READY_TIMEOUT_SECONDS=5 bash "$release_script" health >/dev/null 2>&1; then
  fail "health command did not retry a transient startup failure"
fi

rm -f "$tmp_dir/curl-count"
if PATH="$fake_bin:$PATH" TEST_STATE_DIR="$tmp_dir" DATA_ROOT="$tmp_dir/data" TEST_CURL_SUCCEEDS_ON=99 HEALTH_RETRY_INTERVAL_SECONDS=0 HEALTH_MAX_ATTEMPTS=3 HEALTH_READY_TIMEOUT_SECONDS=5 bash "$release_script" health >/dev/null 2>&1; then
  fail "health command succeeded after the retry limit"
fi

attempts=$(<"$tmp_dir/curl-count")
if [ "$attempts" != 3 ]; then
  fail "health command made $attempts attempts instead of the configured limit"
fi

rm -f "$tmp_dir/curl-count"
if ! PATH="$fake_bin:$PATH" TEST_STATE_DIR="$tmp_dir" DATA_ROOT="$tmp_dir/data" TEST_CURL_SUCCEEDS_ON=21 HEALTH_RETRY_INTERVAL_SECONDS=0 HEALTH_READY_TIMEOUT_SECONDS=60 bash "$release_script" health >/dev/null 2>&1; then
  fail "health command did not allow a cold start that becomes ready after 20 probes"
fi

attempts=$(<"$tmp_dir/curl-count")
if [ "$attempts" != 21 ]; then
  fail "health command made $attempts attempts instead of waiting for the cold start"
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
  if ! migration_output=$(PATH="$fake_bin:$PATH" NODE_PATH="$test_node_path" TEST_STATE_DIR="$tmp_dir" EXPECTED_DATABASE_URL="$expected" DATA_ROOT="$tmp_dir/data" RELEASE_ROOT="$tmp_dir/releases" ENV_FILE="$env_file" bash "$release_script" migrate --commit abcdef1 2>&1); then
    fail "migrate command did not preserve dotenv semantics for $name: $migration_output"
  fi
}

run_migrate_case "unquoted value" 'DATABASE_URL=file:/opt/coc-platform-data/dev.db' 'file:/opt/coc-platform-data/dev.db'
run_migrate_case "double-quoted value" 'DATABASE_URL="file:/opt/coc-platform-data/dev.db"' 'file:/opt/coc-platform-data/dev.db'
run_migrate_case "surrounding whitespace" 'DATABASE_URL=  file:/opt/coc-platform-data/dev.db  ' 'file:/opt/coc-platform-data/dev.db'

prepare_commit=decafed
prepare_data="$tmp_dir/prepare-data"
prepare_env="$tmp_dir/prepare.env"
prepare_archive_root="$tmp_dir/prepare-source"
prepare_archive="$tmp_dir/prepare.tar.gz"
mkdir -p "$prepare_data/uploads" "$prepare_archive_root/apps/server/dist" "$prepare_archive_root/apps/server/public"
touch "$prepare_archive_root/apps/server/dist/index.js" "$prepare_archive_root/apps/server/public/index.html"
printf '{"commit":"%s"}\n' "$prepare_commit" > "$prepare_archive_root/release-manifest.json"
tar -czf "$prepare_archive" -C "$prepare_archive_root" .
printf '%s\n' 'DATABASE_URL=file:/opt/coc-platform-data/dev.db' > "$prepare_env"
if ! PATH="$fake_bin:$PATH" TEST_STATE_DIR="$tmp_dir" DATA_ROOT="$prepare_data" RELEASE_ROOT="$tmp_dir/releases" ENV_FILE="$prepare_env" UPLOADS_DIR="$prepare_data/uploads" LEGACY_ROOT="$tmp_dir/legacy-missing" bash "$release_script" prepare --commit "$prepare_commit" --archive "$prepare_archive" >/dev/null 2>&1; then
  fail "prepare did not create a new release directory for an unseen commit"
fi
if [ ! -f "$tmp_dir/releases/$prepare_commit/apps/server/dist/index.js" ]; then
  fail "prepare did not extract the server artifact into the new release directory"
fi

make_release() {
  local dir="$1"
  local manifest_commit="$2"
  mkdir -p "$dir/apps/server"
  printf '{"commit":"%s"}\n' "$manifest_commit" > "$dir/release-manifest.json"
}

run_migrate_resolution() {
  local name="$1"
  local commit="$2"
  local expected_dir="$3"
  local current_link="${4:-$tmp_dir/current}"
  local legacy_root="${5:-$tmp_dir/legacy-missing}"
  local migration_output

  rm -f "$tmp_dir/npx-cwd"
  printf '%s\n' 'DATABASE_URL=file:/opt/coc-platform-data/dev.db' > "$env_file"
  if ! migration_output=$(PATH="$fake_bin:$PATH" NODE_PATH="$test_node_path" TEST_STATE_DIR="$tmp_dir" EXPECTED_DATABASE_URL='file:/opt/coc-platform-data/dev.db' DATA_ROOT="$tmp_dir/data" RELEASE_ROOT="$tmp_dir/releases" CURRENT_LINK="$current_link" LEGACY_ROOT="$legacy_root" ENV_FILE="$env_file" bash "$release_script" migrate --commit "$commit" 2>&1); then
    fail "migrate resolution failed for $name: $migration_output"
  fi
  resolved_dir="$(readlink -f "$(<"$tmp_dir/npx-cwd")")"
  expected_real_dir="$(readlink -f "$expected_dir/apps/server")"
  if [ "$resolved_dir" != "$expected_real_dir" ]; then
    fail "migrate resolution selected $resolved_dir instead of $expected_real_dir for $name"
  fi
}

full_current_commit=de9dc9c5c0e49b527a31c5f178a32fce48b2d1ce
short_current_dir="$tmp_dir/releases/de9dc9c5c0e4"
make_release "$short_current_dir" "$full_current_commit"
run_migrate_resolution "full SHA resolves to short release directory" "$full_current_commit" "$short_current_dir"

run_migrate_resolution "short SHA resolves to exact directory" abcdef1 "$tmp_dir/releases/abcdef1"

manifest_only_dir="$tmp_dir/releases/release-manifest-only"
make_release "$manifest_only_dir" "$full_current_commit"
rm -rf "$short_current_dir"
run_migrate_resolution "full SHA resolves through manifest" "$full_current_commit" "$manifest_only_dir"

make_release "$tmp_dir/releases/abc1234a" abc1234aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
make_release "$tmp_dir/releases/abc1234b" abc1234bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
if PATH="$fake_bin:$PATH" TEST_STATE_DIR="$tmp_dir" DATA_ROOT="$tmp_dir/data" RELEASE_ROOT="$tmp_dir/releases" ENV_FILE="$env_file" bash "$release_script" migrate --commit abc1234 >/dev/null 2>&1; then
  fail "ambiguous release prefix unexpectedly resolved"
fi
ambiguous_output=$(PATH="$fake_bin:$PATH" TEST_STATE_DIR="$tmp_dir" DATA_ROOT="$tmp_dir/data" RELEASE_ROOT="$tmp_dir/releases" ENV_FILE="$env_file" bash "$release_script" migrate --commit abc1234 2>&1 || true)
if [[ "$ambiguous_output" != *"ambiguous release commit"* ]]; then
  fail "ambiguous release prefix did not fail closed: $ambiguous_output"
fi

no_match_output=$(PATH="$fake_bin:$PATH" TEST_STATE_DIR="$tmp_dir" DATA_ROOT="$tmp_dir/data" RELEASE_ROOT="$tmp_dir/releases" ENV_FILE="$env_file" bash "$release_script" migrate --commit fedcba9 2>&1 || true)
if [[ "$no_match_output" != *"could not resolve release commit"* ]]; then
  fail "no-match release commit did not report a safe resolution failure: $no_match_output"
fi

rm -rf "$manifest_only_dir"
current_only_dir="$tmp_dir/current-only"
make_release "$current_only_dir" "$full_current_commit"
ln -s "$current_only_dir" "$tmp_dir/current"
run_migrate_resolution "current pointer fallback" "$full_current_commit" "$tmp_dir/current" "$tmp_dir/current"

legacy_root="$tmp_dir/legacy"
mkdir -p "$legacy_root/apps/server"
git init -q "$legacy_root"
git -C "$legacy_root" config user.email test@example.invalid
git -C "$legacy_root" config user.name release-test
touch "$legacy_root/apps/server/index.js"
git -C "$legacy_root" add .
git -C "$legacy_root" commit -qm legacy
legacy_commit=$(git -C "$legacy_root" rev-parse HEAD)
run_migrate_resolution "legacy checkout fallback" "$legacy_commit" "$legacy_root" "$tmp_dir/current-missing" "$legacy_root"

voice_env="$tmp_dir/voice.env"
cat > "$voice_env" <<'EOF'
LIVEKIT_URL=wss://voice.example.test
LIVEKIT_API_KEY=key-present
LIVEKIT_API_SECRET=secret-must-not-appear
LIVEKIT_TOKEN_TTL_SECONDS=3600
ROOM_VOICE_MAX_PARTICIPANTS=8
ROOM_VOICE_OBSERVER_CAN_SPEAK=false
EOF
voice_output=$(PATH="$fake_bin:$PATH" ENV_FILE="$voice_env" bash "$release_script" voice-readiness 2>&1) || fail "voice-readiness dispatcher rejected the read-only command: $voice_output"
if [[ "$voice_output" == *"secret-must-not-appear"* || "$voice_output" == *"process-secret-must-not-appear"* || "$voice_output" == *"nginx-secret-must-not-appear"* ]]; then
  fail "voice-readiness leaked a secret value"
fi

if [ "$(uname -s)" = Linux ]; then
  activation_data="$tmp_dir/activation-data"
  activation_current="$tmp_dir/activation-current"
  activation_candidate="$tmp_dir/releases/feedbee"
  activation_link="$tmp_dir/activation-link"
  activation_env="$tmp_dir/activation.env"
  activation_nginx="$tmp_dir/activation-nginx"
  mkdir -p "$activation_data/uploads" "$activation_current/apps/server/dist" "$activation_candidate/apps/server/dist"
  touch "$activation_data/dev.db" "$activation_nginx"
  printf '%s\n' current > "$activation_current/apps/server/dist/index.js"
  printf '%s\n' candidate > "$activation_candidate/apps/server/dist/index.js"
  printf '%s\n' 'DATABASE_URL=file:/opt/coc-platform-data/dev.db' > "$activation_env"
  ln -s "$activation_current" "$activation_link"
  rm -f "$tmp_dir/pm2-start-cwds" "$tmp_dir/curl-count"
  if PATH="$fake_bin:$PATH" TEST_STATE_DIR="$tmp_dir" TEST_CURL_SUCCEEDS_ON=99 HEALTH_RETRY_INTERVAL_SECONDS=0 HEALTH_MAX_ATTEMPTS=3 HEALTH_READY_TIMEOUT_SECONDS=60 DATA_ROOT="$activation_data" RELEASE_ROOT="$tmp_dir/releases" CURRENT_LINK="$activation_link" ENV_FILE="$activation_env" UPLOADS_DIR="$activation_data/uploads" NGINX_SITE="$activation_nginx" LEGACY_ROOT="$tmp_dir/legacy-missing" bash "$release_script" activate --commit feedbee >/dev/null 2>&1; then
    fail "activation unexpectedly succeeded while health was permanently unavailable"
  fi
  if [ "$(readlink "$activation_link")" != "$activation_current" ]; then
    fail "failed activation did not restore the prior current release link"
  fi
  last_pm2_target=$(tail -n 1 "$tmp_dir/pm2-start-cwds" | cut -d '|' -f 2)
  if [ "$last_pm2_target" != current ]; then
    fail "failed activation did not restart the prior PM2 release"
  fi
else
  echo "SKIP: activation rollback symlink assertion requires Linux"
fi

echo "PASS: release health, rollback protection, migration resolution, and voice-readiness dispatch"

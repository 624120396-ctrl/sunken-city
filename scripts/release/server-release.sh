#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_ROOT=${RELEASE_ROOT:-/opt/coc-platform-releases}
CURRENT_LINK=${CURRENT_LINK:-/opt/coc-platform-current}
DATA_ROOT=${DATA_ROOT:-/opt/coc-platform-data}
LEGACY_ROOT=${LEGACY_ROOT:-/opt/coc-platform}
PM2_NAME=${PM2_NAME:-coc-server}
SERVICE_PORT=${SERVICE_PORT:-3001}
DEPLOY_LOG=${DEPLOY_LOG:-$DATA_ROOT/deploy.log}
NGINX_SITE=${NGINX_SITE:-/etc/nginx/sites-enabled/sunken-city}
ENV_FILE=${ENV_FILE:-$DATA_ROOT/env/server.env}
UPLOADS_DIR=${UPLOADS_DIR:-$DATA_ROOT/uploads}
HEALTH_MAX_ATTEMPTS=${HEALTH_MAX_ATTEMPTS:-60}
HEALTH_RETRY_INTERVAL_SECONDS=${HEALTH_RETRY_INTERVAL_SECONDS:-1}
HEALTH_READY_TIMEOUT_SECONDS=${HEALTH_READY_TIMEOUT_SECONDS:-60}
HEALTH_REQUEST_TIMEOUT_SECONDS=${HEALTH_REQUEST_TIMEOUT_SECONDS:-3}

usage() {
  cat <<'USAGE'
Usage:
  server-release.sh inspect
  server-release.sh prepare --commit <commit> --archive <archive.tar.gz>
  server-release.sh migrate --commit <commit>
  server-release.sh activate --commit <commit>
  server-release.sh rollback --commit <commit>
  server-release.sh health
  server-release.sh voice-readiness

Notes:
  prepare creates /opt/coc-platform-releases/<commit> without changing traffic.
  activate changes the current pointer, PM2 process, and Nginx static root.
  rollback is an activate operation pointed at an older prepared commit.
USAGE
}

log() {
  mkdir -p "$(dirname "$DEPLOY_LOG")"
  printf '%s | RELEASE | %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$DEPLOY_LOG"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

require_root() {
  [ "$(id -u)" = "0" ] || die "must run as root on the production host"
}

commit_arg=""
archive_arg=""

while [ $# -gt 0 ]; do
  case "$1" in
    inspect|prepare|migrate|activate|rollback|health|voice-readiness)
      command_name="$1"
      shift
      ;;
    --commit)
      commit_arg="${2:-}"
      shift 2
      ;;
    --archive)
      archive_arg="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

command_name=${command_name:-}
[ -n "$command_name" ] || { usage; exit 1; }

release_dir_for() {
  local commit="$1"
  local path name manifest manifest_commit current_dir legacy_head
  local -a matches=()
  [[ "$commit" =~ ^[0-9a-f]{7,40}$ ]] || die "invalid commit id: $commit"

  if [ -d "$RELEASE_ROOT/$commit" ]; then
    printf '%s' "$RELEASE_ROOT/$commit"
    return 0
  fi

  for path in "$RELEASE_ROOT"/*; do
    [ -d "$path" ] || continue
    name="${path##*/}"
    [[ "$name" =~ ^[0-9a-f]{7,40}$ ]] || continue
    if [[ "$name" == "$commit"* || "$commit" == "$name"* ]]; then
      matches+=("$path")
    fi
  done

  case "${#matches[@]}" in
    1)
      printf '%s' "${matches[0]}"
      return 0
      ;;
    0) ;;
    *) die "ambiguous release commit prefix: $commit" ;;
  esac

  if [ "${#commit}" -eq 40 ]; then
    for manifest in "$RELEASE_ROOT"/*/release-manifest.json; do
      [ -f "$manifest" ] || continue
      manifest_commit="$(node -e '
const fs = require("fs");
try {
  const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8").replace(/^\uFEFF/, ""));
  if (typeof manifest.commit === "string" && /^[0-9a-f]{40}$/.test(manifest.commit)) {
    process.stdout.write(manifest.commit);
  }
} catch {}
' "$manifest")"
      if [ "$manifest_commit" = "$commit" ]; then
        matches+=("$(dirname "$manifest")")
      fi
    done

    case "${#matches[@]}" in
      1)
        printf '%s' "${matches[0]}"
        return 0
        ;;
      0) ;;
      *) die "ambiguous release manifest commit: $commit" ;;
    esac
  fi

  current_dir="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
  if [ -n "$current_dir" ] && [ -f "$current_dir/release-manifest.json" ] && [ "${#commit}" -eq 40 ]; then
    manifest_commit="$(node -e '
const fs = require("fs");
try {
  const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8").replace(/^\uFEFF/, ""));
  if (typeof manifest.commit === "string" && /^[0-9a-f]{40}$/.test(manifest.commit)) {
    process.stdout.write(manifest.commit);
  }
} catch {}
' "$current_dir/release-manifest.json")"
    if [ "$manifest_commit" = "$commit" ]; then
      matches+=("$current_dir")
    fi
  fi

  legacy_head="$(git -C "$LEGACY_ROOT" rev-parse HEAD 2>/dev/null || true)"
  if [[ "$legacy_head" =~ ^[0-9a-f]{40}$ ]] && [[ "$legacy_head" == "$commit"* || "$commit" == "$legacy_head"* ]]; then
    matches+=("$LEGACY_ROOT")
  fi

  case "${#matches[@]}" in
    1) printf '%s' "${matches[0]}" ;;
    0) die "could not resolve release commit: $commit" ;;
    *) die "ambiguous release fallback commit: $commit" ;;
  esac
}

backup_file() {
  local source_path="$1"
  local label="$2"
  local stamp
  stamp="$(date -u '+%Y%m%dT%H%M%SZ')"
  if [ -e "$source_path" ]; then
    mkdir -p "$DATA_ROOT/backups/release-channel/$stamp"
    cp -a "$source_path" "$DATA_ROOT/backups/release-channel/$stamp/$label"
    log "backup $source_path -> $DATA_ROOT/backups/release-channel/$stamp/$label"
  fi
}

ensure_persistent_inputs() {
  mkdir -p "$DATA_ROOT/env" "$DATA_ROOT/backups/release-channel" "$RELEASE_ROOT"

  if [ ! -f "$ENV_FILE" ]; then
    [ -f "$LEGACY_ROOT/apps/server/.env" ] || die "missing legacy env file and $ENV_FILE"
    backup_file "$LEGACY_ROOT/apps/server/.env" "legacy-server.env"
    install -m 600 "$LEGACY_ROOT/apps/server/.env" "$ENV_FILE"
    log "created persistent env file $ENV_FILE from legacy server .env"
  fi

  grep -q '^DATABASE_URL=.*\/opt\/coc-platform-data\/dev\.db' "$ENV_FILE" \
    || die "DATABASE_URL must point to /opt/coc-platform-data/dev.db before release activation"

  if [ ! -d "$UPLOADS_DIR" ] && [ -d "$LEGACY_ROOT/apps/server/public/uploads" ]; then
    backup_file "$LEGACY_ROOT/apps/server/public/uploads" "legacy-uploads"
    mkdir -p "$UPLOADS_DIR"
    cp -a "$LEGACY_ROOT/apps/server/public/uploads/." "$UPLOADS_DIR/"
    log "copied legacy uploads into $UPLOADS_DIR"
  fi
}

inspect() {
  echo "releaseRoot=$RELEASE_ROOT"
  echo "currentLink=$CURRENT_LINK -> $(readlink -f "$CURRENT_LINK" 2>/dev/null || echo missing)"
  echo "dataRoot=$DATA_ROOT"
  echo "envFile=$ENV_FILE exists=$([ -f "$ENV_FILE" ] && echo yes || echo no)"
  echo "uploadsDir=$UPLOADS_DIR exists=$([ -d "$UPLOADS_DIR" ] && echo yes || echo no)"
  echo "legacyRoot=$LEGACY_ROOT head=$(cd "$LEGACY_ROOT" 2>/dev/null && git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  pm2 jlist 2>/dev/null | PM2_NAME="$PM2_NAME" node -e '
let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const a=JSON.parse(s);for(const p of a.filter(x=>x.name===process.env.PM2_NAME)){const e=p.pm2_env||{};console.log(JSON.stringify({name:p.name,pid:p.pid,status:e.status,cwd:e.pm_cwd,exec:e.pm_exec_path,restarts:e.restart_time},null,2));}}catch(e){process.exit(0)}})'
}

prepare() {
  require_root
  [ -n "$commit_arg" ] || die "--commit is required"
  [ -n "$archive_arg" ] || die "--archive is required"
  [ -f "$archive_arg" ] || die "archive not found: $archive_arg"

  local release_dir
  [[ "$commit_arg" =~ ^[0-9a-f]{7,40}$ ]] || die "invalid commit id: $commit_arg"
  release_dir="$RELEASE_ROOT/$commit_arg"
  [ ! -e "$release_dir" ] || die "release already exists: $release_dir"

  ensure_persistent_inputs
  mkdir -p "$release_dir"
  tar -xzf "$archive_arg" -C "$release_dir"

  [ -f "$release_dir/release-manifest.json" ] || die "release-manifest.json missing"
  [ -f "$release_dir/apps/server/dist/index.js" ] || die "server build missing"
  [ -f "$release_dir/apps/server/public/index.html" ] || die "frontend static index missing"

  ln -sfn "$ENV_FILE" "$release_dir/apps/server/.env"
  rm -rf "$release_dir/apps/server/public/uploads"
  ln -sfn "$UPLOADS_DIR" "$release_dir/apps/server/public/uploads"

  (cd "$release_dir/apps/server" && npm ci)
  (cd "$release_dir/apps/server" && npx prisma generate --schema prisma/schema.prisma)

  log "prepared release commit=$commit_arg dir=$release_dir"
}

migrate() {
  require_root
  [ -n "$commit_arg" ] || die "--commit is required"
  local release_dir
  local database_url
  release_dir="$(release_dir_for "$commit_arg")"
  [ -d "$release_dir" ] || die "release not found: $release_dir"

  backup_file "$DATA_ROOT/dev.db" "dev.db.pre-migrate"
  database_url="$(cd "$release_dir/apps/server" && ENV_FILE="$ENV_FILE" node -e '
    const fs = require("fs");
    const dotenv = require("dotenv");
    const parsed = dotenv.parse(fs.readFileSync(process.env.ENV_FILE));
    if (!parsed.DATABASE_URL) {
      console.error("DATABASE_URL is missing from the persistent env file");
      process.exit(1);
    }
    process.stdout.write(parsed.DATABASE_URL);
  ')"
  (cd "$release_dir/apps/server" && DATABASE_URL="$database_url" npx prisma migrate deploy --schema prisma/schema.prisma)
  log "migration deployed for commit=$commit_arg"
}

write_nginx_release_site() {
  local static_root="$1"
  backup_file "$NGINX_SITE" "nginx-site"
  cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    server_name coc.city www.coc.city;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name coc.city www.coc.city;
    client_max_body_size 50M;
    ssl_certificate /etc/letsencrypt/live/www.coc.city/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.coc.city/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';

    location /deploy {
        proxy_pass http://localhost:3002/deploy;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }

    location /socket.io {
        proxy_pass http://localhost:$SERVICE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Delivery URLs are bearer credentials and must only be served by the
    # dedicated stage-assets host, whose access log is disabled.
    location ^~ /api/stage-assets/delivery/ {
        access_log off;
        return 404;
    }

    location /api {
        proxy_pass http://localhost:$SERVICE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:$SERVICE_PORT/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-Host \$host;
    }

    location /uploads {
        alias $UPLOADS_DIR;
        expires 30d;
        add_header Cache-Control public;
    }

    location / {
        root $static_root;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
  nginx -t
}

activate_commit() {
  require_root
  [ -n "$commit_arg" ] || die "--commit is required"
  local release_dir
  release_dir="$(release_dir_for "$commit_arg")"
  [ -d "$release_dir" ] || die "release not found: $release_dir"

  local previous_current=""
  local previous_current_is_link=no
  local activation_backup_dir
  activation_backup_dir="$DATA_ROOT/backups/release-channel/$(date -u '+%Y%m%dT%H%M%SZ')"

  if [ -L "$CURRENT_LINK" ]; then
    previous_current="$(readlink -f "$CURRENT_LINK")"
    [ -d "$previous_current" ] || die "current release pointer is broken: $CURRENT_LINK"
    previous_current_is_link=yes
  elif [ -e "$CURRENT_LINK" ]; then
    die "current release pointer exists but is not a symlink: $CURRENT_LINK"
  fi

  ensure_persistent_inputs
  mkdir -p "$activation_backup_dir"
  if [ -f /root/.pm2/dump.pm2 ]; then
    cp -a /root/.pm2/dump.pm2 "$activation_backup_dir/pm2-dump.pm2"
    log "backup /root/.pm2/dump.pm2 -> $activation_backup_dir/pm2-dump.pm2"
  fi
  if [ -e "$NGINX_SITE" ]; then
    cp -a "$NGINX_SITE" "$activation_backup_dir/nginx-site"
    log "backup $NGINX_SITE -> $activation_backup_dir/nginx-site"
  fi

  ln -sfn "$release_dir" "$CURRENT_LINK"
  write_nginx_release_site "$CURRENT_LINK/apps/server/public"
  nginx -s reload

  pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
  (cd "$CURRENT_LINK/apps/server" && pm2 start dist/index.js --name "$PM2_NAME" --update-env)
  pm2 save
  if ! health; then
    rollback_failed_activation "$previous_current" "$previous_current_is_link" "$activation_backup_dir"
    die "activation health check failed; rollback attempted from $activation_backup_dir"
  fi
  log "activated release commit=$commit_arg dir=$release_dir"
}

rollback_failed_activation() {
  local previous_current="$1"
  local previous_current_is_link="$2"
  local activation_backup_dir="$3"
  local restore_dir="$LEGACY_ROOT"

  log "activation health failed; restoring prior application release"
  pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true

  if [ "$previous_current_is_link" = yes ]; then
    ln -sfn "$previous_current" "$CURRENT_LINK"
    restore_dir="$previous_current"
  else
    rm -f "$CURRENT_LINK"
  fi

  if [ -f "$activation_backup_dir/nginx-site" ]; then
    cp -a "$activation_backup_dir/nginx-site" "$NGINX_SITE"
    nginx -s reload || log "rollback warning: nginx reload failed"
  else
    log "rollback warning: nginx backup missing"
  fi

  if [ -f "$restore_dir/apps/server/dist/index.js" ]; then
    (cd "$restore_dir/apps/server" && pm2 start dist/index.js --name "$PM2_NAME" --update-env) || \
      log "rollback warning: failed to restart $restore_dir"
  else
    log "rollback warning: server entry missing in $restore_dir"
  fi
  pm2 save || log "rollback warning: pm2 save failed"

  if health; then
    log "rollback health check passed"
  else
    log "rollback health check failed"
  fi
}

health() {
  local deadline=$((SECONDS + HEALTH_READY_TIMEOUT_SECONDS))
  local attempt remaining request_timeout sleep_seconds

  for ((attempt = 1; attempt <= HEALTH_MAX_ATTEMPTS; attempt += 1)); do
    remaining=$((deadline - SECONDS))
    [ "$remaining" -gt 0 ] || break
    request_timeout=$HEALTH_REQUEST_TIMEOUT_SECONDS
    [ "$request_timeout" -le "$remaining" ] || request_timeout=$remaining
    log "health attempt=$attempt/$HEALTH_MAX_ATTEMPTS remaining=${remaining}s requestTimeout=${request_timeout}s"

    if curl -fsS --max-time "$request_timeout" "http://127.0.0.1:$SERVICE_PORT/health"; then
      echo
      pm2 describe "$PM2_NAME" >/dev/null
      log "health ready attempt=$attempt/$HEALTH_MAX_ATTEMPTS"
      return 0
    fi

    log "health pending attempt=$attempt/$HEALTH_MAX_ATTEMPTS"

    [ "$attempt" -lt "$HEALTH_MAX_ATTEMPTS" ] || break
    remaining=$((deadline - SECONDS))
    [ "$remaining" -gt 0 ] || break
    sleep_seconds=$HEALTH_RETRY_INTERVAL_SECONDS
    [ "$sleep_seconds" -le "$remaining" ] || sleep_seconds=$remaining
    [ "$sleep_seconds" -gt 0 ] && sleep "$sleep_seconds"
  done

  echo "ERROR: backend health did not become ready after $HEALTH_MAX_ATTEMPTS attempts or ${HEALTH_READY_TIMEOUT_SECONDS}s" >&2
  return 1
}

voice_readiness() {
  local ok=0
  local voice_env_keys="LIVEKIT_URL LIVEKIT_API_KEY LIVEKIT_API_SECRET LIVEKIT_TOKEN_TTL_SECONDS ROOM_VOICE_MAX_PARTICIPANTS ROOM_VOICE_OBSERVER_CAN_SPEAK"

  echo "## voice env keys"
  if [ -f "$ENV_FILE" ]; then
    for key in $voice_env_keys; do
      if grep -q "^$key=" "$ENV_FILE"; then
        echo "$key=present"
      else
        echo "$key=missing"
        case "$key" in
          LIVEKIT_URL|LIVEKIT_API_KEY|LIVEKIT_API_SECRET) ok=1 ;;
        esac
      fi
    done
  else
    echo "envFile=missing:$ENV_FILE"
    ok=1
  fi

  echo "## voice service processes"
  ps -eo pid=,comm= | grep -Ei 'livekit|coturn|turnserver' || {
    echo "voiceProcesses=missing"
    ok=1
  }

  echo "## voice listening ports"
  ss -ltnup 2>/dev/null | grep -E ':(7880|7881|3478|5349)\b' || {
    echo "voicePorts=missing:7880,7881,3478,5349"
    ok=1
  }

  echo "## voice nginx and tls hints"
  if nginx -T 2>/dev/null | grep -qiE 'livekit|turn|voice|7880|7881|3478|5349'; then
    echo "voiceNginxHints=present"
  else
    echo "voiceNginxHints=missing"
  fi
  if find /etc/letsencrypt/live -maxdepth 1 -mindepth 1 -type d -printf '%f\n' 2>/dev/null | sort | grep -qiE 'livekit|turn|voice'; then
    echo "voiceTlsCert=present"
  else
    echo "voiceTlsCert=missing"
    ok=1
  fi

  return "$ok"
}

case "$command_name" in
  inspect) inspect ;;
  prepare) prepare ;;
  migrate) migrate ;;
  activate) activate_commit ;;
  rollback) activate_commit ;;
  health) health ;;
  voice-readiness) voice_readiness ;;
  *) usage; exit 1 ;;
esac

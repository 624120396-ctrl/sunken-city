#!/usr/bin/env bash
set -euo pipefail

# ================================================
# ⚠️  IMPORTANT SAFETY WARNING
# 服务器数据库已迁移到 /opt/coc-platform-data/dev.db
# 本脚本绝不再同步 prisma/ 目录，也不直接操作 dev.db
# 只同步编译产物 dist/
# ================================================

HOST="root@43.254.167.183"
REMOTE_DIR="/opt/coc-platform"
PASS="jPTL4QKVLtOEnrM"
SSH_OPTS="-o StrictHostKeyChecking=no -o LogLevel=ERROR"

echo "=== 构建后端 ==="
cd apps/server
npm run build
cd ../..

echo "=== 构建前端 ==="
cd apps/web
npm run build
cd ../..

echo "=== 同步后端 dist/ ==="
sshpass -p "$PASS" rsync -avz --delete -e "ssh $SSH_OPTS" \
  apps/server/dist/ "$HOST:$REMOTE_DIR/apps/server/dist/"

echo "=== 同步前端 dist/ ==="
sshpass -p "$PASS" rsync -avz --delete -e "ssh $SSH_OPTS" \
  apps/web/dist/ "$HOST:$REMOTE_DIR/apps/web/dist/"

echo "=== 服务器端 schema push + 重启 ==="
sshpass -p "$PASS" ssh $SSH_OPTS "$HOST" \
  "cd $REMOTE_DIR/apps/server && npx prisma db push --accept-data-loss && npx prisma generate && pm2 restart coc-server && pm2 status coc-server"

echo "=== 部署完成 ==="

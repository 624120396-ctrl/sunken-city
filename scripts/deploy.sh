#!/usr/bin/env bash
set -e

HOST="root@43.254.167.183"
REMOTE_DIR="/opt/coc-platform"
PASS="jPTL4QKVLtOEnrM"
SSH_OPTS="-o StrictHostKeyChecking=no"

echo "=== 构建后端 ==="
cd apps/server
npm run build
cd ../..

echo "=== 构建前端 ==="
cd apps/web
npm run build
cd ../..

echo "=== 同步后端代码（排除 dev.db）==="
sshpass -p "$PASS" rsync -avz --delete --exclude='dev.db' --exclude='.env' -e "ssh $SSH_OPTS" \
  apps/server/dist/ "$HOST:$REMOTE_DIR/apps/server/dist/"

echo "=== 同步 Prisma schema 和迁移（排除 dev.db）==="
sshpass -p "$PASS" rsync -avz --delete --exclude='dev.db' --exclude='.env' -e "ssh $SSH_OPTS" \
  apps/server/prisma/ "$HOST:$REMOTE_DIR/apps/server/prisma/"

echo "=== 同步前端构建产物 ==="
sshpass -p "$PASS" rsync -avz --delete -e "ssh $SSH_OPTS" \
  apps/web/dist/ "$HOST:$REMOTE_DIR/apps/web/dist/"

echo "=== 服务器端重启 ==="
sshpass -p "$PASS" ssh $SSH_OPTS "$HOST" "cd $REMOTE_DIR/apps/server && pm2 restart coc-server && pm2 status coc-server"

echo "=== 部署完成 ==="

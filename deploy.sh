#!/bin/bash
set -euo pipefail

# ============================================================
# coc-platform 一键部署脚本
# 解决 prisma/schema.prisma 与 dev.db 漏同步导致的线上事故
# ============================================================

HOST="root@64.90.30.232"
PASS="4dHaDDDwe1UkcXMx"
REMOTE_BASE="/opt/coc-platform"
LOCAL_BASE="/root/.openclaw/workspace/coc-platform"
PASS="4dHaDDDwe1UkcXMx"

echo "[1/6] 构建前端..."
cd "$LOCAL_BASE/apps/web"
npm run build

echo "[2/6] 构建后端..."
cd "$LOCAL_BASE/apps/server"
npm run build

echo "[3/6] 同步前端 dist..."
sshpass -p "$PASS" rsync -avz --delete \
  "$LOCAL_BASE/apps/web/dist/" \
  "$HOST:$REMOTE_BASE/apps/web/dist/"

echo "[4/6] 同步后端产物与关键 schema/db..."
sshpass -p "$PASS" rsync -avz --delete \
  "$LOCAL_BASE/apps/server/dist/" \
  "$HOST:$REMOTE_BASE/apps/server/dist/"

# ⚠️ 关键：schema 和 db 必须同时同步，缺一不可
sshpass -p "$PASS" rsync -avz \
  "$LOCAL_BASE/apps/server/prisma/schema.prisma" \
  "$HOST:$REMOTE_BASE/apps/server/prisma/schema.prisma"

sshpass -p "$PASS" rsync -avz \
  "$LOCAL_BASE/apps/server/prisma/dev.db" \
  "$HOST:$REMOTE_BASE/apps/server/prisma/dev.db"

echo "[5/6] 服务端同步数据库结构、重新生成 Prisma Client 并重启..."
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no "$HOST" bash -lc "
  set -e
  cd $REMOTE_BASE/apps/server
  echo '    -> 推送 Schema 变更到数据库'
  npx prisma db push --accept-data-loss
  echo '    -> 生成 Prisma Client'
  npx prisma generate
  echo '    -> 重启 coc-server'
  pm2 restart coc-server --update-env
  echo '    -> 验证状态'
  sleep 1
  pm2 status coc-server
"

echo "[6/6] 部署完成"

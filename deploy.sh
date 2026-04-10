#!/bin/bash
set -euo pipefail

# ============================================================
# coc-platform 一键部署脚本
# 解决 prisma/schema.prisma 与 dev.db 漏同步导致的线上事故
# ============================================================

HOST="root@43.254.167.183"
REMOTE_BASE="/opt/coc-platform"
LOCAL_BASE="/root/.openclaw/workspace/coc-platform"
PASS="jPTL4QKVLtOEnrM"

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

echo "[4/6] 同步后端产物..."
sshpass -p "$PASS" rsync -avz --delete \
  "$LOCAL_BASE/apps/server/dist/" \
  "$HOST:$REMOTE_BASE/apps/server/dist/"

# ⚠️ 关键：schema 必须同步，但 db 绝不能从开发环境覆盖到生产环境
# 多重保护：1) rsync --exclude  2) .rsync-filter merge  3) 只同步目录，不单独传文件
sshpass -p "$PASS" rsync -avz --delete \
  --exclude='dev.db' --exclude='*.db' --exclude='.env' \
  --filter="merge $LOCAL_BASE/apps/server/prisma/.rsync-filter" \
  "$LOCAL_BASE/apps/server/prisma/" \
  "$HOST:$REMOTE_BASE/apps/server/prisma/"

# 注意：数据库结构变更后，在 remote 上执行 `npx prisma db push` 或 `migrate deploy`，
# 而不是从本地同步 dev.db。
# 如果必须迁移数据，请先导出 SQL/CSV 在生产环境导入。

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

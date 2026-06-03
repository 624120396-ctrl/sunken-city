#!/bin/bash
set -euo pipefail

# ============================================================
# coc-platform 服务器本地部署脚本
# 由本地 workspace 的 deploy.sh 通过 SSH 调用
# 负责：dist → public 复制、数据库同步、服务重启
# ============================================================

REMOTE_BASE="/opt/coc-platform"

echo "[1/3] 同步前端 dist 到 public/..."
rsync -avz --delete "$REMOTE_BASE/apps/web/dist/" "$REMOTE_BASE/apps/server/public/"

echo "[2/3] 推送数据库结构变更..."
cd "$REMOTE_BASE/apps/server"
npx prisma db push --accept-data-loss 2>/dev/null || true

echo "[3/3] 重启服务..."
pm2 restart coc-server --update-env
pm2 save

echo "[OK] 部署完成"

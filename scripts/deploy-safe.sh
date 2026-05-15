#!/bin/bash
set -euo pipefail

# ================================================
# 沉没之城安全部署脚本 (Sunken City Safe Deploy)
# 核心原则：只同步编译产物 dist/，绝不触碰数据
# ================================================

REMOTE_HOST="root@43.254.167.183"
REMOTE_PASS="jPTL4QKVLtOEnrM"
SSH_CMD="sshpass -p \$REMOTE_PASS ssh -o StrictHostKeyChecking=no -o LogLevel=ERROR \$REMOTE_HOST"

WORKSPACE="/root/.openclaw/workspace/coc-platform"
REMOTE_BASE="/opt/coc-platform"

TS=$(date +%Y%m%d_%H%M%S)

BACKUP_DIR="/opt/coc-platform-data/backups"

# 确保备份目录存在
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no -o LogLevel=ERROR "$REMOTE_HOST" \
  "mkdir -p \"$BACKUP_DIR\""

# 1. 部署前自动冷备 dev.db
echo "[1/4] 备份服务器 dev.db ..."
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no -o LogLevel=ERROR "$REMOTE_HOST" \
  "cp \"/opt/coc-platform-data/dev.db\" \"$BACKUP_DIR/dev.db.predeploy.$TS\""

echo "[2/4] 同步前端 dist/ ..."
sshpass -p "$REMOTE_PASS" rsync -avz --delete \
  "$WORKSPACE/apps/web/dist/" \
  "$REMOTE_HOST:$REMOTE_BASE/apps/web/dist/"

echo "[3/4] 同步后端 dist/ ..."
sshpass -p "$REMOTE_PASS" rsync -avz --delete \
  "$WORKSPACE/apps/server/dist/" \
  "$REMOTE_HOST:$REMOTE_BASE/apps/server/dist/"

echo "[4/4] 重启服务 ..."
sshpass -p "$REMOTE_PASS" ssh -o StrictHostKeyChecking=no -o LogLevel=ERROR "$REMOTE_HOST" \
  "cd $REMOTE_BASE/apps/server && pm2 restart coc-server"

echo ""
echo "=========================================="
echo "部署完成"
echo "备份: $BACKUP_DIR/dev.db.predeploy.$TS"
echo "=========================================="

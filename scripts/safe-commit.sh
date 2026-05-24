#!/bin/bash
# safe-commit.sh - 服务器后端变更自动提交（硬化版）
# 路径: /opt/coc-platform/scripts/safe-commit.sh
# 频率: cron 每分钟检查
# 铁律: 分支分叉时禁止自动提交

SERVER_DIR=/opt/coc-platform
LOG=/var/log/coc-safe-commit.log

# 只检查后端的 schema 和路由变更
BACKEND_FILES="apps/server/prisma/schema.prisma apps/server/src/modules/"

cd $SERVER_DIR

# ===== 铁律: 先检查是否与 origin/develop 分叉 =====
git fetch origin develop 2>/dev/null || {
    echo "[$(date)] fetch 失败，跳过本次检查" >> $LOG
    exit 0
}

LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
REMOTE_HASH=$(git rev-parse origin/develop 2>/dev/null || echo "unknown")

if [ "$LOCAL_HASH" != "$REMOTE_HASH" ] && [ "$REMOTE_HASH" != "unknown" ]; then
    echo "[$(date)] [SKIP] 服务器与 origin/develop 分叉，禁止自动提交" >> $LOG
    echo "  本地: $LOCAL_HASH | 远程: $REMOTE_HASH" >> $LOG
    exit 0
fi

# ===== 检查是否有未提交的变更 =====
if git diff --quiet -- $BACKEND_FILES 2>/dev/null && git diff --cached --quiet -- $BACKEND_FILES 2>/dev/null; then
    exit 0
fi

# ===== 分叉检测通过，执行自动提交 =====
DATE=$(date +%Y%m%d_%H%M%S)
HASH=$(git rev-parse --short HEAD)

echo "[$(date)] 检测到后端变更，自动提交..." >> $LOG
git add -- $BACKEND_FILES 2>>$LOG

# 提交并 push
git commit -m "auto: 服务器后端变更 $DATE (基于 $HASH)" 2>>$LOG || {
    echo "[$(date)] commit 失败，跳过" >> $LOG
    exit 0
}

git push origin develop 2>>$LOG || {
    echo "[$(date)] Push 失败，可能分叉了" >> $LOG
    exit 0
}

echo "[$(date)] 自动提交完成" >> $LOG

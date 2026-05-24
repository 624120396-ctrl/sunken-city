#!/bin/bash
set -e

COC_ROOT=/opt/coc-platform
SERVER_DIR=$COC_ROOT/apps/server
WEB_DIR=$COC_ROOT/apps/web
UPLOADS_DIR=$SERVER_DIR/public/uploads
BACKUP_DIR=/opt/coc-platform-data/backups/uploads
DB_BACKUP_DIR=/opt/coc-platform-data/backups/auto
DATE=$(date +%Y%m%d_%H%M%S)

echo "=== 沉没之城部署脚本 ==="
echo "时间: $(date)"

# ===== Pre-deploy: 备份数据库 =====
if [ -f "/opt/coc-platform-data/dev.db" ]; then
  mkdir -p $DB_BACKUP_DIR
  cp /opt/coc-platform-data/dev.db $DB_BACKUP_DIR/dev.db.predeploy.${DATE}
  echo "[*] 备份数据库 → $DB_BACKUP_DIR/dev.db.predeploy.${DATE}"
fi

# ===== 1. 检查代码分叉（铁律） =====
cd $COC_ROOT
git fetch origin develop 2>/dev/null || true

LOCAL_HASH=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
REMOTE_HASH=$(git rev-parse origin/develop 2>/dev/null || echo "unknown")

if [ "$LOCAL_HASH" != "$REMOTE_HASH" ] && [ "$REMOTE_HASH" != "unknown" ]; then
  echo "[WARNING] 服务器代码与 origin/develop 分叉！"
  echo "  本地: $LOCAL_HASH"
  echo "  远程: $REMOTE_HASH"
  
  # 检查是否有本地未提交的后端变更
  DIFF_COUNT=$(git diff --name-only origin/develop -- apps/server/ 2>/dev/null | wc -l)
  
  if [ "$DIFF_COUNT" -gt 0 ]; then
    echo "[ERROR] 检测到 $DIFF_COUNT 个后端文件差异："
    git diff --name-only origin/develop -- apps/server/ | sed 's/^/    /'
    echo ""
    echo "[ABORT] 必须先手动合并本地变更到 develop 分支！"
    echo "操作步骤："
    echo "  1. cd /opt/coc-platform"
    echo "  2. git stash"
    echo "  3. git pull origin develop"
    echo "  4. git stash pop"
    echo "  5. 解决冲突后 git commit && git push"
    echo "  6. 重新运行 deploy.sh"
    exit 1
  fi
  
  # 如果只有前端差异，安全 pull
  echo "[*] 后端无差异，安全 pull develop..."
  git stash
  git pull origin develop
  git stash pop 2>/dev/null || true
fi

# ===== 2. 后端构建 =====
echo "[*] Prisma generate..."
cd $SERVER_DIR
npx prisma generate 2>/dev/null || true

echo "[*] 后端 TypeScript 编译..."
npm run build 2>/dev/null || true

# ===== 3. PM2 重启 =====
echo "[*] PM2 重启服务..."
pm2 restart coc-server 2>/dev/null || pm2 start dist/index.js --name coc-server

# ===== 4. 备份 uploads =====
if [ -d "$UPLOADS_DIR" ] && [ "$(ls -A $UPLOADS_DIR 2>/dev/null)" ]; then
  mkdir -p $BACKUP_DIR
  BACKUP_PATH=$BACKUP_DIR/uploads_${DATE}.tar.gz
  echo "[*] 备份 uploads → $BACKUP_PATH"
  tar -czf $BACKUP_PATH -C $SERVER_DIR/public uploads/ 2>/dev/null || true
  ls -t $BACKUP_DIR/*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
else
  echo "[!] uploads 目录为空或不存在，跳过备份"
fi

# ===== 5. 部署前端产物 =====
echo "[*] 检查前端产物..."
if [ -f "$WEB_DIR/dist/index.html" ]; then
  echo "[*] 部署前端: index.html"
  cp $WEB_DIR/dist/index.html $WEB_DIR/dist/index.html.new
  mv $WEB_DIR/dist/index.html.new $SERVER_DIR/public/index.html
fi

if [ -d "$WEB_DIR/dist/assets" ]; then
  echo "[*] 部署前端: assets/"
  mkdir -p $SERVER_DIR/public/assets
  cp -r $WEB_DIR/dist/assets/* $SERVER_DIR/public/assets/
fi

# 部署根目录静态文件（背景图、logo、images、frames等）
echo "[*] 部署前端: 根目录静态文件"
for f in $(ls $WEB_DIR/dist/ 2>/dev/null | grep -v -E '^(assets|index\.html)$'); do
  if [ -f "$WEB_DIR/dist/$f" ]; then
    echo "    → $f"
    cp $WEB_DIR/dist/$f $SERVER_DIR/public/
  elif [ -d "$WEB_DIR/dist/$f" ]; then
    echo "    → $f/"
    mkdir -p $SERVER_DIR/public/$f
    cp -r $WEB_DIR/dist/$f/* $SERVER_DIR/public/$f/
  fi
done

# ===== 6. Post-deploy: 恢复 uploads 检查 =====
if [ ! -d "$UPLOADS_DIR" ] || [ ! "$(ls -A $UPLOADS_DIR 2>/dev/null)" ]; then
  echo "[!] uploads 目录丢失或为空，尝试恢复..."
  LATEST_BACKUP=$(ls -t $BACKUP_DIR/*.tar.gz 2>/dev/null | head -1)
  if [ -f "$LATEST_BACKUP" ]; then
    echo "[*] 从备份恢复: $LATEST_BACKUP"
    mkdir -p $SERVER_DIR/public
    tar -xzf $LATEST_BACKUP -C $SERVER_DIR/public
  else
    echo "[X] 无可用备份！uploads 目录为空"
  fi
fi

# ===== 7. 健康检查 =====
sleep 2
HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null | grep -c '"status":"ok"' || echo 0)
if [ "$HEALTH" -gt 0 ]; then
  echo "[*] 健康检查通过 ✓"
else
  echo "[WARNING] 健康检查未通过，请检查服务状态"
fi

echo "[*] 部署完成: $(date)"

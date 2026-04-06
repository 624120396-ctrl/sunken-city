#!/bin/bash

set -e

echo "🎲 COC跑团平台 - 开发启动脚本"
echo "=============================="

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ 未找到 $1，请先安装"
        exit 1
    fi
}

echo -e "${BLUE}检查环境...${NC}"
check_command node
check_command npm
node --version
npm --version

echo ""
echo -e "${BLUE}安装依赖...${NC}"

# 安装后端依赖
if [ ! -d "apps/server/node_modules" ]; then
    echo -e "${YELLOW}安装后端依赖...${NC}"
    cd apps/server
    npm install
    cd ../..
else
    echo -e "${GREEN}✓ 后端依赖已安装${NC}"
fi

# 安装前端依赖
if [ ! -d "apps/web/node_modules" ]; then
    echo -e "${YELLOW}安装前端依赖...${NC}"
    cd apps/web
    npm install
    cd ../..
else
    echo -e "${GREEN}✓ 前端依赖已安装${NC}"
fi

# 检查环境变量
if [ ! -f "apps/server/.env" ]; then
    echo ""
    echo -e "${YELLOW}创建环境变量文件...${NC}"
    cp apps/server/.env.example apps/server/.env
    echo -e "${YELLOW}⚠️ 请编辑 apps/server/.env 配置数据库连接${NC}"
fi

echo ""
echo -e "${GREEN}==============================${NC}"
echo -e "${GREEN}启动完成！${NC}"
echo ""
echo "启动命令:"
echo "  终端1: cd apps/server && npm run dev"
echo "  终端2: cd apps/web && npm run dev"
echo ""
echo "访问地址:"
echo "  前端: http://localhost:3000"
echo "  后端: http://localhost:3001"
echo "  健康检查: http://localhost:3001/health"
echo -e "${GREEN}==============================${NC}"

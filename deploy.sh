#!/bin/bash
# 幻影剧本 3.0 - 一键部署脚本
# 使用方法: ./deploy.sh [dev|prod]

set -e

ENV=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🎲 沉没之城 - 幻影剧本 3.0 部署脚本"
echo "===================================="
echo "环境: $ENV"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker 环境检查通过${NC}"
}

# 开发环境部署
deploy_dev() {
    echo -e "${YELLOW}🚀 启动开发环境...${NC}"
    
    # 安装依赖
    echo "📦 安装服务端依赖..."
    cd apps/server && npm install && cd ../..
    
    echo "📦 安装前端依赖..."
    cd apps/web && npm install && cd ../..
    
    # 启动服务
    echo "🐳 启动 Docker 服务..."
    docker-compose up -d db redis
    
    echo "⏳ 等待数据库就绪..."
    sleep 5
    
    # 数据库迁移
    echo "🗄️  执行数据库迁移..."
    cd apps/server && npx prisma migrate dev --name init && cd ../..
    
    # 种子数据
    echo "🌱 播种样板数据..."
    cd apps/server && npx ts-node src/scripts/seed-scenario.ts && cd ../..
    
    echo -e "${GREEN}✅ 开发环境部署完成！${NC}"
    echo ""
    echo "访问地址:"
    echo "  前端: http://localhost:3000"
    echo "  后端: http://localhost:3001"
    echo "  API文档: http://localhost:3001/health"
    echo ""
    echo "启动命令:"
    echo "  后端: cd apps/server && npm run dev"
    echo "  前端: cd apps/web && npm run dev"
}

# 生产环境部署
deploy_prod() {
    echo -e "${YELLOW}🚀 启动生产环境...${NC}"
    
    # 检查环境变量
    if [ ! -f .env ]; then
        echo -e "${YELLOW}⚠️  未找到 .env 文件，使用默认配置${NC}"
        echo "建议创建 .env 文件:"
        echo "  DB_USER=coc"
        echo "  DB_PASSWORD=your-secure-password"
        echo "  DB_NAME=coc_platform"
        echo "  JWT_SECRET=your-jwt-secret"
    fi
    
    # 构建并启动
    echo "🐳 构建并启动服务..."
    docker-compose -f docker-compose.prod.yml build
    docker-compose -f docker-compose.prod.yml up -d
    
    # 等待数据库
    echo "⏳ 等待数据库就绪..."
    sleep 10
    
    # 生产环境迁移
    echo "🗄️  执行数据库迁移..."
    docker-compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
    
    echo -e "${GREEN}✅ 生产环境部署完成！${NC}"
    echo ""
    echo "访问地址:"
    echo "  网站: http://localhost"
    echo "  API: http://localhost/api"
}

# 查看状态
show_status() {
    echo -e "${YELLOW}📊 服务状态${NC}"
    docker-compose ps
}

# 查看日志
show_logs() {
    echo -e "${YELLOW}📜 服务日志${NC}"
    docker-compose logs -f
}

# 停止服务
stop_services() {
    echo -e "${YELLOW}🛑 停止服务...${NC}"
    if [ "$ENV" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml down
    else
        docker-compose down
    fi
    echo -e "${GREEN}✅ 服务已停止${NC}"
}

# 主逻辑
case "${2:-deploy}" in
    deploy)
        check_docker
        if [ "$ENV" = "prod" ]; then
            deploy_prod
        else
            deploy_dev
        fi
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    stop)
        stop_services
        ;;
    *)
        echo "使用方法: ./deploy.sh [dev|prod] [deploy|status|logs|stop]"
        echo ""
        echo "示例:"
        echo "  ./deploy.sh dev          # 部署开发环境"
        echo "  ./deploy.sh prod         # 部署生产环境"
        echo "  ./deploy.sh dev status   # 查看开发环境状态"
        echo "  ./deploy.sh prod logs    # 查看生产环境日志"
        echo "  ./deploy.sh dev stop     # 停止开发环境"
        exit 1
        ;;
esac

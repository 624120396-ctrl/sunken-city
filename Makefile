.PHONY: dev build down logs install migrate

# 开发命令
dev:
	docker-compose up -d

dev-local:
	docker-compose up db redis -d

# 构建
build:
	docker-compose build

# 停止
down:
	docker-compose down

# 查看日志
logs:
	docker-compose logs -f

# 安装依赖
install:
	npm install
	cd apps/server && npm install
	cd apps/web && npm install

# 数据库迁移
migrate:
	cd apps/server && npx prisma migrate dev

# 数据库GUI
studio:
	cd apps/server && npx prisma studio

# 清理
clean:
	docker-compose down -v
	docker system prune -f

# 一键启动（本地开发）
start: dev
	@echo "等待数据库启动..."
	@sleep 5
	@echo "执行数据库迁移..."
	cd apps/server && npx prisma migrate dev || true
	@echo "服务已启动:"
	@echo "  前端: http://localhost:3000"
	@echo "  后端: http://localhost:3001"
	@echo "  数据库: localhost:5432"
	@echo "  Prisma Studio: http://localhost:5555"
# COC跑团平台 - 开发指南

## 快速开始

### 方式1：Docker（推荐）
```bash
# 启动所有服务
docker-compose up -d

# 执行数据库迁移
cd apps/server && npx prisma migrate dev

# 访问
# 前端: http://localhost:3000
# 后端: http://localhost:3001
# Prisma Studio: http://localhost:5555
```

### 方式2：本地开发（无Docker）

**前提条件：**
- Node.js 20+
- PostgreSQL 15+
- Redis 7+（可选）

**1. 安装依赖**
```bash
# 根目录
npm install

# 后端
cd apps/server && npm install

# 前端
cd apps/web && npm install
```

**2. 配置环境变量**
```bash
cp apps/server/.env.example apps/server/.env
# 编辑 .env 配置数据库连接
```

**3. 启动数据库**
```bash
# 如果你有PostgreSQL本地安装
# 创建数据库: createdb coc_platform
```

**4. 数据库迁移**
```bash
cd apps/server
npx prisma migrate dev
npx prisma generate
```

**5. 启动服务**
```bash
# 终端1: 启动后端
cd apps/server && npm run dev

# 终端2: 启动前端
cd apps/web && npm run dev
```

---

## 项目结构

```
apps/
├── server/              # Node后端
│   ├── src/
│   │   ├── modules/     # 业务模块
│   │   │   ├── auth/    # 认证 (登录/注册)
│   │   │   ├── characters/  # 角色卡
│   │   │   ├── rooms/   # 房间系统
│   │   │   └── dice/    # 投骰系统
│   │   └── config/      # 配置
│   └── prisma/
│       └── schema.prisma  # 数据库模型
│
└── web/                 # React前端
    ├── src/
    │   ├── pages/       # 页面组件
    │   ├── components/  # UI组件
    │   └── stores/      # 状态管理 (Zustand)
    └── package.json
```

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 后端 | Node 20 + Express + Prisma |
| 数据库 | PostgreSQL 15 |
| 实时通信 | Socket.io |
| 状态管理 | Zustand |

---

## 常用命令

```bash
# Docker
make dev           # 启动所有服务
make down          # 停止服务
make logs          # 查看日志

# 后端
cd apps/server
npm run dev              # 开发模式
npm run db:migrate       # 数据库迁移
npm run db:studio        # Prisma Studio

# 前端
cd apps/web
npm run dev              # 开发服务器
npm run build            # 构建
```

---

## API文档

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 角色卡
- `GET /api/characters` - 列表
- `GET /api/characters/:id` - 详情

### 房间
- `GET /api/rooms` - 列表
- `POST /api/rooms` - 创建

### 投骰
- `POST /api/dice/roll` - 投骰

---

## 数据库模型

**User** - 用户
**Character** - 角色卡（调查员）
**Room** - 跑团房间
**RoomMember** - 房间成员
**DiceRoll** - 投骰记录

详细见 `apps/server/prisma/schema.prisma`

---

## 下一步开发计划

1. **角色卡系统** - 创建/编辑调查员，属性计算
2. **房间系统** - WebSocket实时通信
3. **投骰系统** - COC7判定规则
4. **战斗系统** - 回合制管理
5. **背景故事** - 编辑器与保存
# COC跑团平台 - 基础架构设计

## 一、技术栈选择

### 前端
| 技术 | 选择 | 理由 |
|------|------|------|
| 框架 | React 18 + TypeScript | 组件化开发，类型安全，生态成熟 |
| 样式 | Tailwind CSS | 原子化CSS，避免命名混乱，设计令牌统一 |
| 状态管理 | Zustand | 轻量级，无样板代码，适合中小项目 |
| 实时通信 | Socket.io Client | 与后端保持一致 |
| 路由 | React Router v6 | 声明式路由，嵌套路由支持 |
| UI组件 | Radix UI + 自定义 | 无样式基础组件，完全可控 |
| 构建工具 | Vite | 快速HMR，现代化构建 |

### 后端
| 技术 | 选择 | 理由 |
|------|------|------|
| 运行时 | Node.js 20 + TypeScript | 类型安全，与现代前端统一语言 |
| 框架 | Express 4 | 轻量灵活，生态丰富 |
| 数据库 | PostgreSQL 15 | 关系型数据，JSON支持，比SQLite更适合生产 |
| ORM | Prisma | 类型安全的数据库访问，迁移管理完善 |
| 实时通信 | Socket.io 4 | WebSocket + 降级支持 |
| 认证 | JWT (jsonwebtoken) | 无状态认证，适合前后端分离 |
| 验证 | Zod | 运行时类型验证，前后端可共享schema |

### 基础设施
| 技术 | 选择 | 理由 |
|------|------|------|
| 容器 | Docker + Docker Compose | 开发环境一致性，部署标准化 |
| 反向代理 | Nginx | 静态资源服务，负载均衡，SSL终止 |
| 进程管理 | PM2 (生产) | Node进程管理，日志轮转 |
| 版本控制 | Git + GitHub | 分支管理，CI/CD集成 |

---

## 二、项目结构

```
coc-platform/
├── apps/
│   ├── web/                    # React前端
│   │   ├── src/
│   │   │   ├── components/     # 通用组件
│   │   │   │   ├── ui/         # 基础UI组件（Button, Input等）
│   │   │   │   └── game/       # 游戏相关组件（DiceRoller, CharacterCard等）
│   │   │   ├── pages/          # 页面组件
│   │   │   │   ├── auth/       # 登录/注册
│   │   │   │   ├── dashboard/  # 首页
│   │   │   │   ├── characters/ # 角色卡管理
│   │   │   │   ├── rooms/      # 房间/跑团
│   │   │   │   └── admin/      # 管理后台
│   │   │   ├── hooks/          # 自定义Hooks
│   │   │   ├── stores/         # Zustand状态管理
│   │   │   ├── lib/            # 工具函数
│   │   │   │   ├── api.ts      # API客户端
│   │   │   │   ├── socket.ts   # Socket.io连接
│   │   │   │   └── dice.ts     # 投骰逻辑
│   │   │   ├── types/          # TypeScript类型定义
│   │   │   └── styles/         # 全局样式
│   │   ├── public/             # 静态资源
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── server/                 # Node后端
│       ├── src/
│       │   ├── config/         # 配置文件
│       │   │   ├── database.ts # Prisma客户端
│       │   │   ├── socket.ts   # Socket.io初始化
│       │   │   └── env.ts      # 环境变量验证
│       │   │
│       │   ├── modules/        # 业务模块（按功能组织）
│       │   │   ├── auth/       # 认证模块
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.routes.ts
│       │   │   │   └── auth.schema.ts    # Zod验证schema
│       │   │   │
│       │   │   ├── characters/ # 角色卡模块
│       │   │   │   ├── character.controller.ts
│       │   │   │   ├── character.service.ts
│       │   │   │   ├── character.routes.ts
│       │   │   │   ├── character.schema.ts
│       │   │   │   └── character.types.ts
│       │   │   │
│       │   │   ├── rooms/      # 房间模块
│       │   │   │   ├── room.controller.ts
│       │   │   │   ├── room.service.ts
│       │   │   │   ├── room.routes.ts
│       │   │   │   ├── room.socket.ts      # Socket事件处理
│       │   │   │   └── room.schema.ts
│       │   │   │
│       │   │   ├── dice/       # 投骰模块
│       │   │   │   ├── dice.service.ts
│       │   │   │   ├── dice.socket.ts
│       │   │   │   └── dice.types.ts
│       │   │   │
│       │   │   └── combat/     # 战斗模块
│       │   │       ├── combat.service.ts
│       │   │       ├── combat.socket.ts
│       │   │       └── combat.types.ts
│       │   │
│       │   ├── middleware/     # Express中间件
│       │   │   ├── auth.ts     # JWT验证
│       │   │   ├── error.ts    # 错误处理
│       │   │   └── validate.ts # 请求验证
│       │   │
       │   ├── utils/            # 工具函数
       │   │   ├── logger.ts     # 日志
       │   │   └── response.ts   # 统一响应格式
       │   │
       │   └── index.ts          # 入口文件
       │
       ├── prisma/
       │   ├── schema.prisma     # 数据库模型定义
       │   ├── migrations/       # 迁移文件（自动生成）
       │   └── seed.ts           # 种子数据
       │
       ├── tests/                # 测试文件
       │   ├── unit/
       │   └── integration/
       │
       ├── Dockerfile
       ├── docker-compose.yml
       └── tsconfig.json
│
├── packages/
│   └── shared/                 # 共享代码（前后端共用）
│       ├── src/
│       │   ├── schemas/        # Zod验证schema
│       │   │   ├── character.ts
│       │   │   ├── room.ts
│       │   │   └── dice.ts
│       │   ├── types/          # TypeScript类型
│       │   │   ├── character.ts
│       │   │   ├── room.ts
│       │   │   └── dice.ts
│       │   └── constants/      # 常量
│       │       ├── skills.ts   # COC7技能列表
│       │       ├── weapons.ts  # 武器数据
│       │       └── armor.ts    # 护甲数据
│       └── package.json
│
├── docs/                       # 文档
│   ├── architecture.md         # 架构说明
│   ├── api.md                  # API文档
│   └── coc7-rules.md           # COC7规则参考
│
├── scripts/                    # 脚本
│   ├── setup.sh                # 初始化脚本
│   └── deploy.sh               # 部署脚本
│
├── docker-compose.yml          # 开发环境编排
├── docker-compose.prod.yml     # 生产环境编排
├── Makefile                    # 常用命令
└── README.md
```

---

## 三、核心设计原则

### 1. 前后端完全分离
- 前端是独立SPA，通过API与后端通信
- 后端只提供REST API和WebSocket，不渲染模板
- 前后端共享Zod schema和TypeScript类型

### 2. 模块化架构
```
每个模块包含：
- controller.ts  → 处理HTTP请求/响应
- service.ts     → 业务逻辑
- routes.ts      → 路由定义
- schema.ts      → 输入验证（Zod）
- socket.ts      → WebSocket事件（如有需要）
- types.ts       → 模块内类型定义
```

### 3. 数据库设计（Prisma Schema）

```prisma
// 核心模型示例
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  nickname  String
  password  String   // bcrypt hash
  level     Int      @default(1)
  exp       Int      @default(0)
  isAdmin   Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  characters Character[]
  roomMembers RoomMember[]
  diceRolls  DiceRoll[]
}

model Character {
  id          String   @id @default(uuid())
  userId      String
  name        String
  occupation  String
  age         Int
  // COC7属性
  str         Int
  dex         Int
  con         Int
  siz         Int
  app         Int
  int         Int
  pow         Int
  edu         Int
  luck        Int
  // 派生属性（自动计算）
  hp          Int
  mp          Int
  san         Int
  mov         Int
  build       Int
  // 技能（JSON存储）
  skills      Json
  // 武器和护甲
  weapons     Json     @default("[]")
  armor       Json?
  // 背景故事
  background  Json?
  // 资产
  assets      Json?
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
  roomMembers RoomMember[]
}

model Room {
  id          String   @id @default(uuid())
  roomId      String   @unique // 短ID，如 "ABC123"
  name        String
  description String?
  passwordHash String? // bcrypt，null表示公开房间
  creatorId   String
  status      RoomStatus @default(ACTIVE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     RoomMember[]
  combatState CombatState?
  diceRolls   DiceRoll[]
}

model RoomMember {
  id          String   @id @default(uuid())
  roomId      String
  userId      String
  characterId String?
  role        RoomRole @default(PLAYER)
  // 进入/退出房间时的状态记录
  entrySan    Int?
  entryHp     Int?
  entryMp     Int?
  exitSan     Int?
  exitHp      Int?
  exitMp      Int?
  joinedAt    DateTime @default(now())

  room        Room     @relation(fields: [roomId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
  character   Character? @relation(fields: [characterId], references: [id])

  @@unique([roomId, userId])
}

enum RoomStatus {
  ACTIVE
  PAUSED
  CLOSED
}

enum RoomRole {
  KP
  PLAYER
}

// 投骰记录
model DiceRoll {
  id          String   @id @default(uuid())
  roomId      String?
  userId      String?
  characterId String?
  rollType    String   // attribute, skill, luck, san, damage, custom
  targetName  String?  // 技能名或属性名
  targetValue Int?     // 目标值
  rollResult  Int      // 骰子结果
  successLevel String? // 大成功, 极难成功, 困难成功, 成功, 失败, 大失败
  context     Json?    // 额外上下文
  createdAt   DateTime @default(now())

  room        Room?    @relation(fields: [roomId], references: [id])
  user        User?    @relation(fields: [userId], references: [id])
}

// 战斗状态（JSON存储更灵活）
model CombatState {
  id          String   @id @default(uuid())
  roomId      String   @unique
  isActive    Boolean  @default(false)
  round       Int      @default(1)
  turnOrder   Json     // 行动顺序 [{characterId, name, dex, hp}, ...]
  currentTurn Int      @default(0)
  startedAt   DateTime @default(now())

  room        Room     @relation(fields: [roomId], references: [id])
}
```

---

## 四、开发规范

### 1. Git分支策略
```
main        → 生产分支，只接受合并
  ↓
develop     → 开发分支，功能合并到这里
  ↓
feature/*   → 功能分支，从develop切出
  ↓
hotfix/*    → 紧急修复，从main切出
```

### 2. 代码提交规范
```
feat: 新增角色卡背景故事编辑功能
fix: 修复投骰结果显示错位问题
docs: 更新API文档
refactor: 重构角色卡服务层
test: 添加战斗系统单元测试
```

### 3. API设计规范
```typescript
// 统一响应格式
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

// 路由命名
GET    /api/characters          // 列表
GET    /api/characters/:id      // 详情
POST   /api/characters          // 创建
PATCH  /api/characters/:id      // 更新（部分）
DELETE /api/characters/:id      // 删除
```

### 4. 错误处理
```typescript
// 统一错误类
class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
  }
}

// 使用示例
if (!character) {
  throw new AppError(
    'CHARACTER_NOT_FOUND',
    '调查员不存在',
    404
  );
}
```

---

## 五、开发环境启动

### Docker Compose（推荐）
```yaml
# docker-compose.yml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: coc
      POSTGRES_PASSWORD: coc
      POSTGRES_DB: coc_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  server:
    build: ./apps/server
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://coc:coc@db:5432/coc_platform
      JWT_SECRET: dev-secret
    volumes:
      - ./apps/server/src:/app/src
    command: npm run dev

  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:3001
    volumes:
      - ./apps/web/src:/app/src
    command: npm run dev

volumes:
  postgres_data:
```

启动命令：
```bash
docker-compose up -d
```

### 本地开发
```bash
# 1. 安装依赖
make install

# 2. 启动数据库
docker-compose up -d db redis

# 3. 数据库迁移
cd apps/server && npx prisma migrate dev

# 4. 启动后端
cd apps/server && npm run dev

# 5. 启动前端（新终端）
cd apps/web && npm run dev
```

---

## 六、关键功能实现思路

### 1. 投骰系统
```typescript
// 核心算法（前后端共用）
function rollDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => 
    Math.floor(Math.random() * sides) + 1
  );
}

function coc7Check(target: number, roll: number): SuccessLevel {
  if (roll === 1) return 'CRITICAL_SUCCESS';
  if (roll === 100) return 'FUMBLE';
  if (roll <= target / 5) return 'EXTREME_SUCCESS';
  if (roll <= target / 2) return 'HARD_SUCCESS';
  if (roll <= target) return 'SUCCESS';
  return 'FAILURE';
}
```

### 2. WebSocket房间通信
```typescript
// 房间事件设计
interface RoomEvents {
  // 客户端发送
  'room:join': { roomId: string; password?: string };
  'room:leave': { roomId: string };
  'message:send': { content: string; characterId?: string };
  'dice:roll': { type: string; target?: number };
  'combat:action': { type: string; target?: string; weapon?: string };
  
  // 服务器发送
  'room:joined': { user: UserInfo; character?: CharacterInfo };
  'room:left': { userId: string };
  'message:received': Message;
  'dice:result': DiceRollResult;
  'combat:update': CombatState;
  'member:list': MemberInfo[];
}
```

### 3. 角色卡状态同步
- 角色卡数据存储在PostgreSQL
- 进入房间时选择角色卡，建立关联（RoomMember.characterId）
- 房间内属性变化（如SAN减少）实时广播给所有成员
- 退出房间时保存最终状态到Character

---

## 七、部署架构

### 生产环境
```
                    ┌─────────────┐
                    │   CDN       │
                    │ (静态资源)   │
                    └──────┬──────┘
                           │
    ┌──────────┐    ┌─────┴─────┐    ┌──────────┐
    │   Nginx  │────│   Nginx   │────│   Nginx  │  (负载均衡)
    │ (SSL)    │    │ (Reverse) │    │ (SSL)    │
    └──────────┘    └─────┬─────┘    └──────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
     ┌────┴────┐     ┌────┴────┐     ┌────┴────┐
     │  App 1  │     │  App 2  │     │  App 3  │  (Node.js x3)
     └────┬────┘     └────┬────┘     └────┬────┘
          │               │               │
          └───────────────┼───────────────┘
                          │
                    ┌─────┴─────┐
                    │ PostgreSQL │  (主从复制)
                    │  + Redis   │
                    └───────────┘
```

### Docker部署
```dockerfile
# apps/server/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY prisma ./prisma
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

---

## 八、与旧项目的对比

| 方面 | 旧项目 | 新项目 |
|------|--------|--------|
| **模板** | EJS（服务器渲染） | React SPA（客户端渲染） |
| **样式** | 多个CSS文件，混乱 | Tailwind CSS，原子化 |
| **类型安全** | 无 | TypeScript全程 |
| **数据库** | SQLite，手动迁移 | PostgreSQL + Prisma |
| **验证** | 手动检查 | Zod schema共享 |
| **实时通信** | Socket.io混乱 | 事件类型化，模块化 |
| **部署** | 手动SCP | Docker Compose |
| **代码组织** | 按技术分层 | 按业务模块（DDD） |
| **测试** | 无 | 单元+集成测试 |
| **错误处理** | 500暴露堆栈 | 统一错误响应 |

---

## 九、下一步

1. **搭建基础框架**：Docker Compose + 空React + Express
2. **数据库设计**：Prisma schema定稿，初始迁移
3. **认证系统**：注册/登录/JWT
4. **角色卡CRUD**：基础增删改查
5. **房间系统**：创建/加入/离开
6. **WebSocket集成**：实时消息
7. **投骰系统**：前端界面 + 后端计算
8. **战斗系统**：回合制管理

这个架构解决了旧项目的所有痛点：
- 清晰的模块边界，不会修A坏B
- 类型安全，减少运行时错误
- 前后端共享schema，不会变量未定义
- Docker确保开发和生产环境一致
- 设计系统统一，避免CSS混乱
# COC跑团平台 v2

一个基于现代技术栈构建的克苏鲁的呼唤（Call of Cthulhu）7版TRPG在线平台。

## 功能特性

### 核心系统
- **用户认证**：JWT-based 认证系统，支持注册/登录/Token刷新
- **角色卡系统**：完整的COC7角色卡创建与管理
  - 8项基本属性（STR/CON/SIZ/DEX/APP/INT/POW/EDU）
  - 派生属性自动计算（HP/MP/SAN/MOV/Build）
  - 60+技能支持，含自定义技能
  - 34种预设武器，9种预设护甲
  - 角色卡导入/导出（JSON格式）
  - 战后技能成长系统

### 房间系统
- **故事书（房间）管理**：创建/加入/离开/关闭
- **6位短ID**：便于分享和加入
- **KP/PLAYER角色区分**

### 实时互动
- **WebSocket实时通信**
- **聊天系统**：房间内文字聊天
- **投骰系统**：COC7六档成功度判定（大成功/极难/困难/成功/失败/大失败）
- **快捷检定栏**：常用技能一键检定

### 战斗系统
- **回合制战斗**：按DEX排序行动顺序
- **装备集成**：自动使用角色装备的武器和护甲
- **完整战斗流程**：命中检定 → 伤害计算 → 护甲减伤
- **战斗日志**：实时记录每场战斗

### 战后报告
- **自动报告生成**：战斗记录、技能检定、角色成长
- **可编辑的故事概要**
- **Markdown导出**：便于保存和分享

## 技术栈

### 前端
- React 18 + TypeScript
- Vite（构建工具）
- Tailwind CSS（样式）
- Socket.io-client（实时通信）
- Zustand（状态管理）

### 后端
- Node.js + Express
- Socket.io（WebSocket服务）
- Prisma ORM
- SQLite（数据库）
- JWT（认证）

## 项目结构

```
coc-platform/
├── apps/
│   ├── server/          # Node后端
│   │   ├── src/
│   │   │   ├── modules/     # 功能模块
│   │   │   │   ├── auth/        # 认证
│   │   │   │   ├── characters/  # 角色卡
│   │   │   │   ├── rooms/       # 房间
│   │   │   │   ├── dice/        # 投骰
│   │   │   │   └── combat/      # 战斗
│   │   │   ├── middleware/  # 中间件
│   │   │   └── config/      # 配置
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   └── web/             # React前端
│       ├── src/
│       │   ├── pages/       # 页面组件
│       │   ├── components/  # 通用组件
│       │   ├── stores/      # 状态管理
│       │   ├── lib/         # 工具函数
│       │   └── hooks/       # 自定义Hooks
│       └── package.json
│
└── package.json         # 根项目配置
```

## 快速开始

### 环境要求
- Node.js 20+
- npm 或 yarn

### 安装依赖
```bash
# 根目录安装
npm install

# 后端依赖
cd apps/server && npm install

# 前端依赖
cd apps/web && npm install
```

### 数据库设置
```bash
cd apps/server
npx prisma migrate dev
npx prisma generate
```

### 启动开发服务器
```bash
# 后端（端口3001）
cd apps/server && npm run dev

# 前端（端口3000）
cd apps/web && npm run dev
```

访问 http://localhost:3000

## API文档

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 角色卡
- `GET /api/characters` - 列表
- `POST /api/characters` - 创建
- `GET /api/characters/:id` - 详情
- `PATCH /api/characters/:id` - 更新
- `DELETE /api/characters/:id` - 删除
- `POST /api/characters/:id/growth` - 战后成长

### 房间
- `GET /api/rooms` - 列表
- `POST /api/rooms` - 创建
- `GET /api/rooms/:roomId` - 详情
- `POST /api/rooms/:roomId/join` - 加入
- `POST /api/rooms/:roomId/leave` - 离开
- `POST /api/rooms/:roomId/close` - 关闭

### 战斗
- `GET /api/rooms/:roomId/combat` - 获取状态
- `POST /api/rooms/:roomId/combat/start` - 开始战斗
- `POST /api/rooms/:roomId/combat/attack` - 执行攻击
- `POST /api/rooms/:roomId/combat/next-turn` - 结束回合
- `POST /api/rooms/:roomId/combat/end` - 结束战斗

## WebSocket事件

### 客户端发送
- `room:join` - 加入房间
- `room:leave` - 离开房间
- `message:send` - 发送消息
- `dice:roll` - 投骰
- `combat:start` - 开始战斗
- `combat:attack` - 执行攻击
- `combat:next_turn` - 结束回合
- `combat:end` - 结束战斗

### 服务器广播
- `message:new` - 新消息
- `dice:result` - 投骰结果
- `combat:started` - 战斗开始
- `combat:updated` - 战斗更新
- `combat:ended` - 战斗结束
- `combat:attack_result` - 攻击结果

## COC7规则实现

### 成功度判定
| 骰值 | 结果 |
|------|------|
| 1 | 大成功 |
| ≤ 技能值/5 | 极难成功 |
| ≤ 技能值/2 | 困难成功 |
| ≤ 技能值 | 成功 |
| > 技能值 | 失败 |
| 96-100 (技能<50) | 大失败 |

### 派生属性计算
- **HP** = (CON + SIZ) / 10
- **MP** = POW / 5
- **SAN** = POW
- **MOV** = 8 (基础，根据STR/DEX/SIZ调整)
- **Build** = 根据STR + SIZ查表

### 战斗伤害
- 成功命中后掷武器伤害骰
- 护甲值自动减免伤害
- 最低伤害为0

## 开发团队

基于React + Node.js + Prisma + Socket.io构建

## 许可证

MIT
# 幻影剧本 3.0 (Phantom Script v3.0)

> 沉没之城 COC 跑团平台 - 单人 AVG 剧本系统

## ✨ 新特性

幻影剧本 3.0 是沉没之城的单人剧本游戏系统，提供类似 AVG 视觉小说的游戏体验：

- 🎮 **六层 AVG 渲染架构** - 背景、滤镜、立绘、CG、对话框、特效
- 🎭 **双模式切换** - TRPG 模式（显示数值）/ STORY 模式（纯故事）
- 🔍 **线索收集与论证** - 调查、收集线索、提交论证
- 📝 **可视化剧本编辑器** - 在线创建剧本，无需编写代码
- 🎨 **角色立绘系统** - 多表情立绘，支持位置配置
- 🎵 **音视频支持** - 背景音乐、音效、转场特效

## 🚀 快速开始

### 环境要求
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15 (Docker 提供)
- Redis 7 (Docker 提供)

### 一键部署

```bash
# 克隆项目
git clone <repo>
cd coc-platform

# 部署开发环境
chmod +x deploy.sh
./deploy.sh dev

# 或使用 Docker
npm run docker:dev
```

### 手动启动

```bash
# 1. 启动基础设施 (PostgreSQL + Redis)
docker-compose up -d db redis

# 2. 安装依赖并启动后端
cd apps/server
npm install
npx prisma migrate dev
npm run dev

# 3. 安装依赖并启动前端 (新终端)
cd apps/web
npm install
npm run dev
```

访问:
- 前端: http://localhost:3000
- 后端 API: http://localhost:3001
- 健康检查: http://localhost:3001/health

## 📁 项目结构

```
coc-platform/
├── apps/
│   ├── server/              # 后端 API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   └── scenario/    # 幻影剧本模块
│   │   │   │       ├── scenario.routes.ts    # API 路由
│   │   │   │       ├── scenario.service.ts   # 业务逻辑
│   │   │   │       ├── clue.service.ts       # 线索服务
│   │   │   │       ├── doubt.service.ts      # 疑点服务
│   │   │   │       ├── argument.service.ts   # 论证服务
│   │   │   │       └── character.service.ts  # 角色服务
│   │   │   ├── data/
│   │   │   │   └── sample-scenario.ts   # 样板剧本
│   │   │   └── scripts/
│   │   │       ├── seed-scenario.ts     # 数据种子
│   │   │       └── ensure-system-user.ts
│   │   └── prisma/
│   │       └── schema.prisma      # 数据库模型
│   │
│   └── web/                 # 前端应用
│       ├── src/
│       │   ├── components/
│       │   │   └── avg/         # AVG 组件
│       │   │       ├── SoloPlayerPage.tsx    # 游戏主页面
│       │   │       ├── StoryDialogBox.tsx    # 打字机对话框
│       │   │       ├── SpriteLayer.tsx       # 角色立绘层
│       │   │       ├── SceneBackground.tsx   # 场景背景
│       │   │       ├── CgOverlay.tsx         # CG 全屏层
│       │   │       └── EffectLayer.tsx       # 转场特效
│       │   ├── pages/
│       │   │   ├── scenarios/
│       │   │   │   ├── select.tsx    # 剧本选择
│       │   │   │   └── editor.tsx    # 剧本编辑器
│       │   │   └── solo/
│       │   │       └── SoloPlayerPage.tsx
│       │   └── stores/
│       │       └── solo.store.ts    # Zustand 状态管理
│       └── Dockerfile
│
├── docker-compose.yml       # 开发环境配置
├── docker-compose.prod.yml  # 生产环境配置
└── deploy.sh               # 一键部署脚本
```

## 📚 API 文档

### 剧本管理
```
GET    /api/scenarios              列出剧本
POST   /api/scenarios              创建剧本
GET    /api/scenarios/:id          剧本详情
PATCH  /api/scenarios/:id          更新剧本
DELETE /api/scenarios/:id          删除剧本
```

### 线索
```
GET    /api/scenarios/:id/clues    剧本线索列表
POST   /api/scenarios/:id/clues    创建线索
GET    /api/clues/:id              线索详情
PATCH  /api/clues/:id              更新线索
DELETE /api/clues/:id              删除线索
```

### 疑点与论证
```
GET    /api/scenarios/:id/doubts   剧本疑点列表
POST   /api/scenarios/:id/doubts   创建疑点
GET    /api/doubts/:id             疑点详情
POST   /api/sessions/:id/arguments 提交论证
GET    /api/sessions/:id/arguments 论证历史
```

## 🎮 剧本格式

### 节点类型
- `STORY` - 剧情节点，推进故事
- `INVESTIGATION` - 调查节点，可收集线索
- `DOUBT` - 疑点节点，需提交线索论证
- `ENDING` - 结局节点，结束剧本

### 转场效果
- `fade` - 淡入淡出
- `dissolve` - 溶解
- `wipe` - 擦除
- `glitch` - 故障效果
- `ripple` - 波纹

### 示例剧本
```typescript
{
  title: '迷雾庄园的晚宴',
  description: '一座位于迷雾山脉深处的古老庄园...',
  difficulty: 'NORMAL',
  estimatedDuration: 45,
  
  nodes: [
    {
      nodeId: 'intro',
      title: '暴风雨之夜',
      type: 'STORY',
      content: '暴雨如注，雷声轰鸣...',
      bgUrl: '/assets/scenarios/mystery-manor/bg/stormy-night.jpg',
      transitionType: 'fade'
    }
  ],
  
  clues: [
    {
      name: '红酒杯',
      description: '杯壁上残留着苦杏仁的气味',
      type: 'ITEM'
    }
  ],
  
  doubts: [
    {
      title: '毒杀疑云',
      requiredClueCount: 3,
      correctClueIds: ['clue-wine-glass', 'clue-poison-bottle', ...],
      successNodeId: 'ending-success',
      failNodeId: 'ending-fail'
    }
  ]
}
```

## 🛠️ 开发指南

### 添加新剧本
1. 使用剧本编辑器 (`/scenarios/new`) 可视化创建
2. 或在 `apps/server/src/data/` 创建 TypeScript 文件
3. 运行 `npx ts-node src/scripts/seed-scenario.ts` 导入

### 前端组件开发
AVG 组件位于 `apps/web/src/components/avg/`：
- 使用 Tailwind CSS 进行样式
- Framer Motion 处理动画
- Zustand 管理游戏状态

### 后端开发
- Express Router 结构
- Prisma ORM 操作数据库
- JSON 字段用于 SQLite 兼容性

## 🧪 测试

```bash
# 运行集成测试
./test-integration.sh

# 或手动测试
curl http://localhost:3001/health
curl http://localhost:3001/api/scenarios -H "Authorization: Bearer <token>"
```

## 📦 部署

### 生产环境
```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env 设置数据库密码和 JWT 密钥

# 2. 一键部署
./deploy.sh prod

# 或使用 Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### 环境变量
```env
# 数据库
DB_USER=coc
DB_PASSWORD=your-secure-password
DB_NAME=coc_platform

# JWT
JWT_SECRET=your-jwt-secret-min-32-characters

# 前端 API 地址 (生产环境)
VITE_API_URL=https://your-domain.com
VITE_WS_URL=wss://your-domain.com
```

## 📝 更新日志

### v3.0.0 (2026-04-15)
- ✅ AVG 六层渲染架构
- ✅ 线索收集与论证系统
- ✅ 双模式切换 (TRPG/STORY)
- ✅ 可视化剧本编辑器
- ✅ 角色立绘与表情系统
- ✅ 15 个 REST API 端点
- ✅ Docker 部署支持

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可证

MIT

---

*沉没之城 - 为 COC 跑团爱好者打造的平台* 🐙

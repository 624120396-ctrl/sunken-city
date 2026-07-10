# 沉没之城 Changelog

所有版本更新记录。

---

## [1.3.0] - 2026-07-10

### 版本代号：公共招募与新手导航

---

### 新功能

- **全站招募板**：可发布站内房间、站外与线下活动；支持筛选、报名、联系方式范围、过期关闭与举报。
- **房间邀请联动**：关联站内房间的招募在接纳报名后，会沿用既有权限和邀请流程创建房间邀请。
- **关于与帮助**：补充注册、角色、找团、房间准备、聊天骰点、结团报告与求助路径。
- **招募举报审核**：管理员可处理举报，并在需要时关闭公共招募条目。

---

## [1.2.0] - 2026-04-04

### 🎯 版本代号：位阶觉醒 (Rank Awakening)

---

### ✨ 新功能

#### 位阶与印记系统 (核心功能)
- **位阶体系**：10级克苏鲁风格位阶，从「海岸漫步者」到「深渊凝视者」
- **经验值系统**：通过跑团、创建调查员、解锁印记等获取 EXP
- **28个印记**：覆盖探索、战斗、社交、疯狂、特殊、隐藏六大类别
- **印记稀有度**：普通 → 稀有 → 史诗 → 传说 → 神话
- **用户选择展示**：玩家可自由选择展示哪个已解锁印记

#### 管理后台 (位阶/印记)
- **位阶管理**：查看列表、编辑属性、实时预览
- **印记管理**：编辑名称、分类、稀有度、解锁条件、隐藏状态
- **数据统计**：位阶用户分布、印记解锁统计

#### 沉浸式体验组件
- **SceneCard** - 场景卡片组件
- **StatusTags** - 状态标签系统
- **PrivateChatPanel** - 私聊面板
- **QuickRollBar** - 快捷技能栏
- **CountdownPanel** - 倒计时面板
- **RoomStatsPanel** - 房间统计面板

---

### 🎨 视觉升级

#### v1.1 深渊凝视主题
- **配色系统重构**：腐烂优雅风格，主色调深渊黑+血祭红+禁忌金
- **字体系统**：
  - `font-ritual`: Cinzel + 思源宋体 (仪式文字)
  - `font-body`: Inter + 思源黑体 (正文)
  - `font-rune`: JetBrains Mono (符文/代码)
  - `font-whisper`: Caveat + 楷体 (疯狂低语)
- **符文边框组件** (`RuneBorder`)：四角符文装饰
- **深渊加载动画** (`EldritchLoader`)：多主题加载效果
- **页面效果**：噪点纹理、羊皮纸黄选中效果

---

### 🔧 技术改进

#### 后端
- 新增 5 个 Prisma 数据表：`RankConfig`, `TitleConfig`, `UserTitle`, `UserRankHistory`, `TitleUnlockLog`
- 新增 18 个 API 端点（用户端 + 管理端）
- 移除 `User.level` 和 `User.title` 字段，改用 EXP 计算位阶

#### 前端
- TypeScript 严格模式：零错误编译
- 新增服务层：`rank-title.service.ts`
- 新增管理页面：`AdminRankTitlePage`
- 新增编辑弹窗：`RankEditModal`, `TitleEditModal`

---

### 🐛 Bug 修复

| 问题 | 解决 |
|------|------|
| API 路径重复 `/api/api/xxx` | 修正 service 层路径配置 |
| 数据库表缺失 | 执行 `prisma db push` 同步 schema |
| seed.js 字段类型错误 | 修复 `privileges` 和 `description` 字段 |

---

### 📁 文件变更

```
apps/server/
├── prisma/
│   └── seed.js                    # 新增：位阶/印记初始数据
├── src/
│   ├── modules/rank-title/
│   │   ├── rank-title.routes.ts   # 新增：用户端 API
│   │   └── admin-rank-title.routes.ts  # 新增：管理端 API
│   └── types/express.d.ts         # 新增：Request 类型扩展

apps/web/src/
├── services/rank-title.service.ts # 新增：API 服务封装
├── pages/
│   ├── ranks/RanksPage.tsx        # 更新：API 集成
│   ├── titles/TitlesPage.tsx      # 更新：API 集成
│   └── admin/
│       ├── AdminRankTitlePage.tsx # 新增：管理页面
│       └── components/
│           ├── RankEditModal.tsx  # 新增：位阶编辑
│           └── TitleEditModal.tsx # 新增：印记编辑
```

---

### 🌐 部署信息

| 项目 | 信息 |
|------|------|
| 服务器 IP | 43.254.167.183 |
| 访问地址 | http://43.254.167.183 |
| 管理后台 | http://43.254.167.183/admin |
| PM2 进程 | coc-server |
| 数据库 | SQLite (prisma/dev.db) |

---

### 📝 后续计划

- [ ] 新增位阶/印记功能
- [ ] 用户 EXP 手动调整
- [ ] 印记批量授予/撤销
- [ ] 位阶特权系统实现
- [ ] 隐藏印记解锁逻辑

---

## [1.0.0] - 2026-04-04

### 🎯 初始版本

#### 核心功能
- 用户注册/登录/认证
- 调查员角色卡创建/编辑/删除
- 跑团房间创建/加入/管理
- 骰子投掷系统
- 基础管理后台

#### 技术栈
- 前端：React + TypeScript + Tailwind CSS + Vite
- 后端：Node.js + Express + Prisma + Socket.io
- 数据库：SQLite
- 部署：Docker + Nginx + PM2

---

## 版本号说明

格式：`主版本.次版本.修订号`

- **主版本**：重大架构变更或重构
- **次版本**：功能新增或重大改进
- **修订号**：Bug 修复或小型优化

# 沉没之城 Changelog

所有版本更新记录。

---

## [1.4.5] - 2026-04-07

### 🎯 版本代号：位阶觉醒 (Rank Awakening) — 稳定补丁

---

### ✨ 新功能

#### 好友系统 MVP
- **关系检测**：在社交触点（论坛帖子/回复作者、房间成员资料卡）内置好友状态查询
- **快捷操作**：加好友 / 接受请求 / 删除好友一键完成
- **在线状态广播**：Socket.io `friend:status_update` 实时推送好友上下线/进房状态
- **后台接口**：`GET/POST /api/friends/*` 全套关系管理 API
- **通知集成**：好友请求、好友通过、房间邀请均已接入通知中心

#### 论坛富文本编辑器
- **Tiptap 编辑器**：全面替换原生 `textarea`
- **支持格式**：粗体、斜体、删除线、H2/H3 标题、无序/有序列表、引用块、行内代码、代码块、水平分割线、插入链接
- **旧帖兼容**：`HtmlContent` 组件自动检测纯文本内容，零破坏兼容历史帖子
- **安全消毒**：DOMPurify 白名单过滤，防止 XSS 注入

#### 管理后台增强
- 新增 `POST /api/admin/notifications/broadcast` 接口，管理员可一键群发系统通知

---

### 🔧 修复与优化

#### 角色卡系统
- **修复技能点分配无上限**：`+` 按钮在点数耗尽后正确禁用，信用评级滑块联动剩余可用点数
- **修复详情页显示异常**：技能展示数据源从旧版中文键迁移到新版 `COC7E_SKILLS` snake_case 键
- **修复背景故事不展示**：正确解析并渲染 `backgroundEntries` 数组与 `keyConnection`
- **修复角色编辑功能**：后端新增 `PATCH /:id`，编辑页兼容新版数据结构
- **修复 QuickRollBar 和战后成长页**：彻底迁移到新版技能数据

#### 通知中心
- 弹窗宽度从 288px 扩展至 384px，解决左侧溢出裁切
- 新增「通知详情」独立 Modal，长文本站内信可完整阅读
- 系统通知支持展开/收起，无跳转目标时不再点击无反应

#### 运维安全
- **修复部署脚本**：彻底移除 `prisma/dev.db` 向生产环境的 rsync 同步，避免开发库覆盖生产库
- **修复自动备份脚本**：解决 `$` 转义语法错误，恢复每 4 小时自动备份并保留最近 10 份
- **将数据库文件移出 Git**：更新 `.gitignore`，`dev.db` 不再受版本控制

---

### 📁 文件变更

```
apps/server/
├── src/modules/friends/friend.routes.ts      # 新增：好友系统路由
├── src/modules/admin/admin.routes.ts         # 更新：新增群发通知接口
├── src/config/socket.ts                      # 更新：好友状态广播
├── prisma/schema.prisma                      # 更新：User/FriendRequest/Friendship/DirectMessage
├── package.json                              # 版本：1.4.5

apps/web/src/
├── components/
│   ├── RichTextEditor.tsx                    # 新增：Tiptap 富文本编辑器
│   ├── HtmlContent.tsx                       # 新增：安全 HTML 渲染组件
│   └── notifications/NotificationBell.tsx    # 重写：通知弹窗 + 详情 Modal
├── pages/forum/
│   ├── ForumNewPostPage.tsx                  # 更新：接入富文本编辑器
│   └── ForumPostPage.tsx                     # 更新：帖子/回复展示与编辑均接入富文本
├── pages/characters/
│   ├── CharacterCreateV2Page.tsx             # 更新：修复技能点校验与信用评级滑块
│   ├── CharacterDetailPage.tsx               # 更新：修复技能与背景展示
│   └── CharacterEditPage.tsx                 # 重写：兼容新版数据结构
├── package.json                              # 版本：1.4.5

package.json                                   # 根项目版本：1.4.5
CHANGELOG.md                                   # 更新
```

---

### 🌐 部署信息

| 项目 | 信息 |
|------|------|
| 服务器 IP | 43.254.167.183 |
| 访问地址 | https://coc.city |
| 管理后台 | https://coc.city/admin |
| PM2 进程 | coc-server |
| 数据库 | SQLite (prisma/dev.db) |

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

# 非房间全站 UI/UX 资产与页面清单审计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 明确《沉没之城》非房间全站 UI/UX 统一视觉的页面范围、入口缺口、设计系统底座、优先级和实施禁区。

**Architecture:** 本计划只承接非房间全站 UI/UX 统一视觉，不重启房间桌面端整体视觉重构，也不接房间移动端专项。后续实施应先修正入口与设计系统一致性，再逐页推广“发光的秘仪档案馆”材质语言。

**Tech Stack:** React 18 + TypeScript + Vite、React Router、Tailwind CSS、现有 `Surface` / `PageShell` / `tokens-v2.css` / `ui-textures`、Lucide icons。

---

## 1. 当前接手结论

真实仓库：

- `C:\Users\29102\Documents\沉没之城`

当前分支：

- `codex/frontend-system-v2-phase1`

当前线程定位：

- 负责非房间全站 UI/UX 统一视觉。
- 房间 Web 桌面端状态为：已定版并部署，进入维护修补阶段。
- 房间移动端由独立专项线程处理。

已确认房间桌面端交接基线：

- `docs/room-system-web-final-handoff-2026-07-08.zh-CN.md`
- `docs/room-visual-material-library.zh-CN.md`
- `9f55c7f fix: improve room tool readability`
- `feb229d fix: keep player quick roll placeholder readable`
- `e083b4b docs: add room web final handoff`

本计划不修改这些房间桌面端定版结论，只复用其材质经验。

## 2. 文档优先级

后续非房间 UI/UX 工作按以下顺序理解文档：

1. `PRODUCT.md`：产品气质、反参考、可读性原则。
2. `PRD.md`：产品边界、模块范围、执行禁区。
3. `docs/superpowers/plans/2026-07-05-sunken-city-master-iteration-roadmap.zh-CN.md`：当前阶段总路线，确认 UI/UX 统一视觉为下一阶段重点。
4. `docs/superpowers/plans/2026-07-04-sunken-city-ui-ux-product-design-master-plan.zh-CN.md`：信息架构、用户流程、线框图、页面优先级。
5. `docs/superpowers/plans/2026-07-04-sunken-city-ui-asset-pipeline.zh-CN.md`：image2 资产规格、命名、压缩、入库和 CSS token 绑定。
6. `docs/superpowers/plans/2026-07-01-sunken-city-ui-readability-redesign.zh-CN.md`：可读性、背景档位、Surface 粘连反模式、轻量验收底线。
7. `docs/room-system-web-final-handoff-2026-07-08.zh-CN.md`：房间桌面端维护边界。
8. `docs/room-visual-material-library.zh-CN.md`：房间材质资产可复用经验。

## 3. 已有设计系统底座

这些不是待从零实现的能力，后续应复用和硬化：

| 底座 | 文件 | 当前判断 |
| --- | --- | --- |
| Surface 材质入口 | `apps/web/src/components/system/Surface.tsx` | 已有 `material`：`archive`、`limestone`、`basalt`、`copper`、`relic` |
| 页面壳 | `apps/web/src/components/system/PageShell.tsx` | 已有 header、body、main、aside 基础结构 |
| 纹理 token | `apps/web/src/styles/tokens-v2.css` | 已绑定 archive paper、limestone、copper、sea mist、dark stone、gold thread 等 token |
| 系统样式 | `apps/web/src/styles/system-v2.css` | 已含 Surface 材质样式、section stack / group、防粘连基础 |
| UI 资产目录 | `apps/web/public/ui-textures/` | 已有全站材质资产与房间 V6 资产，不应直接提交临时草稿 |
| 合约检查 | `apps/web/scripts/check-ui-system-contract.mjs` | 已有部分页面和超宽屏约束，可继续扩展但不替代人工视觉判断 |
| 通知铃 | `apps/web/src/components/notifications/NotificationBell.tsx` | 已可展示通知、跳转目标和标记已读 |
| 消息中心页面 | `apps/web/src/pages/messages/MessageCenterPage.tsx` | 文件存在，但入口未完整接入 |

## 4. 当前入口审计

### 4.1 主路由

`apps/web/src/App.tsx` 已接入：

- `/`
- `/characters`
- `/characters/new`
- `/characters/:id`
- `/characters/:id/growth`
- `/rooms`
- `/rooms/:roomId/report`
- `/rooms/:roomId/dice-history`
- `/ranks`
- `/titles`
- `/shop`
- `/inventory`
- `/market`
- `/forums`
- `/forums/board/:boardKey`
- `/forums/new`
- `/forums/:postId`
- `/friends`
- `/fishing`
- `/dream`
- `/profile`

`apps/web/src/App.tsx` 未接入但文件或入口存在：

- `/messages`：`MessageCenterPage.tsx` 存在，`CommandPalette.tsx` 有入口，但路由未接入。
- `/world`：`CommandPalette.tsx` 有入口，未在主路由中接入。
- `/help`：`CommandPalette.tsx` 有入口，未在主路由中接入。

### 4.2 桌面侧栏

`apps/web/src/components/layout/SideNavV2.tsx` 当前入口：

- 首页
- 调查员
- 故事书
- 好友
- 黑水港
- 溺者之牌
- 无名集市
- 旧日低语

缺口：

- 没有消息中心入口。
- 没有位阶 / 印记入口，当前只能通过命令面板或页面内部入口触达。
- 没有将“档案馆 / 秘仪 / 遗物”分组显性化。

### 4.3 移动底栏

`apps/web/src/components/layout/MobileNavV2.tsx` 当前入口：

- 房间
- 首页
- 调查员
- 低语
- 我的

当前判断：

- 移动底栏是克制版本，适合只放高频入口。
- 黑水港、溺者之牌、无名集市、好友、消息中心不一定都进底栏，但必须有可发现的二级入口。
- 后续不应把 PC 侧栏直接压缩到移动端。

### 4.4 命令面板

`apps/web/src/components/ui/CommandPalette.tsx` 当前入口多于正式路由：

- `/messages` 存在命令入口但未路由。
- `/world` 存在命令入口但未路由。
- `/help` 存在命令入口但未路由。

P0 结论：

- 先修正命令面板、路由、侧栏、移动入口之间的不一致。
- 对尚未正式上线的页面，命令面板不能提供死入口。

## 5. 非房间页面范围表

| 模块 | 主要文件 | 当前入口状态 | 本线程职责 |
| --- | --- | --- | --- |
| 首页 | `apps/web/src/pages/dashboard/DashboardPage.tsx` | 已路由、侧栏、移动底栏 | 改成“城市档案台”方向，减少旧黑玻璃和堆叠装饰 |
| 全局导航 | `SideNavV2.tsx`、`MobileNavV2.tsx`、`TopNav.tsx`、`CommandPalette.tsx` | 已上线但入口不一致 | 统一入口命名、分组、缺页处理 |
| 故事书 / 房间列表 | `apps/web/src/pages/rooms/RoomListPage.tsx` | 已路由、侧栏、移动底栏 | 只处理列表、摘要、招募、准备度、报告入口；不进入房间详情页 |
| 调查员列表 | `CharacterListPage.tsx` | 已路由、侧栏、移动底栏 | 调查员名册档案化，保留可读表单入口 |
| 角色详情非房间部分 | `CharacterDetailPage.tsx` | 已路由 | 角色经历、报告归档入口、公开经历展示；不做正式结团成长规则 |
| 调查报告归档 | `RoomReportPage.tsx`、角色经历相关入口 | 路由存在于 `/rooms/:roomId/report` | 只做归档阅读和入口呈现，不改结算写回 |
| 消息中心 | `MessageCenterPage.tsx` | 文件存在，路由缺失 | P0 修正入口一致性，再做通知分层和私信可读性 |
| 通知铃 | `NotificationBell.tsx` | 顶栏能力存在 | 与消息中心统一通知元信息、动作入口、优先级表达 |
| 好友 | `FriendListPage.tsx` | 已路由、侧栏 | 调查员社交、邀请、关系、通知入口 |
| 论坛 / 旧日低语 | `ForumListPage.tsx`、`ForumBoardPage.tsx`、`ForumPostPage.tsx`、`ForumNewPostPage.tsx` | 已路由、侧栏、移动底栏 | 档案化阅读、主题帖、回复、长文可读性 |
| 个人资料 | `ProfilePage.tsx` | 已路由、移动底栏 | 调查员档案夹，聚合角色、论坛足迹、藏品、印记 |
| 无名集市 | `ShopPage.tsx`、`InventoryPage.tsx`、`RelicMarketPage.tsx`、`EconomyPageShell.tsx` | 已路由、侧栏聚合 | 遗物陈列、藏品账本、交易入口层级 |
| 黑水港 | `FishingPage.tsx`、`components/fishing/*` | 已路由、侧栏 | 明亮深海港口小游戏台，等待 / 咬钩 / 收竿 / 渔获结算 |
| 溺者之牌 | `DreamingPage.tsx`、`components/dreaming/*` | 已路由、侧栏 | 明亮仪式牌桌，入梦 / 选牌 / 翻牌 / 解牌 / 图鉴 |
| 位阶 / 印记 | `RanksPage.tsx`、`TitlesPage.tsx` | 已路由，侧栏缺入口 | 馆藏、证章、封印、长期目标 |

## 6. 优先级

### P0：先修入口和设计系统硬化

1. 消息中心入口一致性：`MessageCenterPage.tsx`、`App.tsx`、`CommandPalette.tsx`、`SideNavV2.tsx`、必要时 `MobileNavV2.tsx`。
2. 命令面板死入口处理：`/world`、`/help` 必须删除、隐藏或接入真实页面。
3. 全局导航信息架构：桌面侧栏按“跑团 / 档案馆 / 秘仪 / 遗物”建立可理解分组，移动端保留高频入口并补充可发现二级入口。
4. Surface 防粘连规则：继续使用 `coc-section-stack`、`coc-section-group`，扩展到首页、消息中心、论坛、个人资料。
5. 21:9 / 16:9 / 笔记本宽度规则：禁止主内容仍挤在中间小列。

### P1：第一批非房间页面统一

1. 首页：从旧式沉浸卡片过渡为“城市档案台”。
2. 个人资料 / 调查员档案夹：作为长期留存聚合页。
3. 调查员列表与角色详情非房间部分：角色经历、报告归档入口、公开经历展示。
4. 论坛 / 旧日低语：优先解决长文阅读、主题帖、回复层级。
5. 好友 / 消息中心 / 通知：统一社交、邀请、申请、公告的可读分层。

### P2：设计系统稳定后推进

1. 无名集市：遗物陈列和藏品账本。
2. 黑水港：玩法化小游戏台。
3. 溺者之牌：仪式牌桌和解牌档案。
4. 位阶 / 印记：馆藏和证章体系。

## 7. 必须等设计系统硬化后再动的内容

以下页面视觉冲击强、交互状态多，不应在 P0 入口不一致和 Surface 规则未收口时先大改：

- 黑水港
- 溺者之牌
- 无名集市三页联动
- 位阶 / 印记大图鉴
- 首页整屏级视觉替换

原因：

- 它们容易把页面做成一堆材质卡片，放大“AI 味”和套娃卡片问题。
- 它们依赖清晰的按钮、状态、空态和移动端规则。
- 它们需要 image2 资产严格按规格入库，不能直接使用生成草稿。

## 8. 设计方向约束

继续沿用：

- 发光的秘仪档案馆。
- 深海冷雾。
- 可读烟熏玻璃和材质化 Surface。
- 克制金色仪式感。
- 非纯黑克苏鲁。
- 适量血红色，仅用于危险、战斗、理智崩坏、不可逆操作等强语义。
- 更明亮、更可读，不回到全局黑幕。

重点防回归：

- 两个卡片 / 面板上下贴得过紧。
- 21:9 超宽屏仍挤在中间小列。
- PC 页面过度紧凑。
- 移动端信息堆叠。
- 背景抢正文可读性。
- 用全局黑幕解决可读性。
- 页面做成一堆互相套娃的卡片。
- 低透明金色正文、灰底灰字、黑色透明卡片滥用。

## 9. 后续实施任务

### Task 1: 导航与入口一致性

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/components/ui/CommandPalette.tsx`
- Modify: `apps/web/src/components/layout/SideNavV2.tsx`
- Consider: `apps/web/src/components/layout/MobileNavV2.tsx`

**目标：**

- `/messages` 要么正式接入路由和导航，要么从命令面板移除。
- `/world` 和 `/help` 不再作为死入口出现。
- 桌面侧栏和命令面板命名统一：故事书、旧日低语、无名集市、消息中心。

**轻量验证：**

```powershell
rg -n "path=\"/messages\"|/messages|/world|/help" apps/web/src/App.tsx apps/web/src/components/ui/CommandPalette.tsx apps/web/src/components/layout/SideNavV2.tsx apps/web/src/components/layout/MobileNavV2.tsx
```

预期：

- `/messages` 在路由和至少一个可发现入口中一致存在，或完全不作为入口暴露。
- `/world`、`/help` 不再暴露为可点击死入口。

### Task 2: 非房间页面 Surface 合约扩展

**Files:**
- Modify: `apps/web/scripts/check-ui-system-contract.mjs`
- Modify: `apps/web/src/styles/system-v2.css`
- Audit: 首页、消息中心、论坛、个人资料、好友、无名集市、黑水港、溺者之牌、位阶、印记页面文件

**目标：**

- 把 `coc-section-stack` / `coc-section-group` 防粘连要求扩展到非房间页面。
- 合约检查只做结构性防回归，不替代视觉判断。

**轻量验证：**

```powershell
pnpm --filter @sunken-city/web check:ui-system
```

预期：

- UI system contract check passed.

### Task 3: 首页与全局导航样板

**Files:**
- Modify: `apps/web/src/pages/dashboard/DashboardPage.tsx`
- Modify: `apps/web/src/components/layout/SideNavV2.tsx`
- Modify: `apps/web/src/components/layout/MobileNavV2.tsx`
- Modify: `apps/web/src/components/layout/TopNav.tsx`
- Modify: `apps/web/src/styles/system-v2.css`

**目标：**

- 首页成为“城市档案台”，不是黑玻璃功能卡堆叠。
- 桌面导航有清晰信息架构，移动端不照搬桌面侧栏。
- 21:9 不挤在中间小列。

**轻量验证：**

```powershell
pnpm --filter @sunken-city/web typecheck
```

预期：

- TypeScript 检查通过。

### Task 4: 消息中心与通知体系可读化

**Files:**
- Modify: `apps/web/src/pages/messages/MessageCenterPage.tsx`
- Modify: `apps/web/src/components/notifications/NotificationBell.tsx`
- Check: `apps/web/src/services/notification-meta.ts`

**目标：**

- 通知、私信、公告、邀请、申请、系统消息形成可读分层。
- 通知铃和消息中心使用一致的类型标签、目标入口和动作文案。
- 不新增后端字段，不改变通知接口契约。

**轻量验证：**

```powershell
pnpm --filter @sunken-city/web typecheck
```

预期：

- TypeScript 检查通过。

### Task 5: 长期留存页面第一批推广

**Files:**
- Modify: `apps/web/src/pages/profile/ProfilePage.tsx`
- Modify: `apps/web/src/pages/forum/ForumListPage.tsx`
- Modify: `apps/web/src/pages/forum/ForumBoardPage.tsx`
- Modify: `apps/web/src/pages/forum/ForumPostPage.tsx`
- Modify: `apps/web/src/pages/friends/FriendListPage.tsx`
- Modify: `apps/web/src/pages/characters/CharacterDetailPage.tsx`

**目标：**

- 个人资料像调查员档案夹。
- 论坛像可归档文献，不像普通 feed。
- 好友像调查员联系人册。
- 角色详情只处理非房间部分：经历展示、报告归档入口、公开经历。

**轻量验证：**

```powershell
pnpm --filter @sunken-city/web typecheck
pnpm --filter @sunken-city/web check:ui-system
```

预期：

- 类型检查通过。
- UI system contract check passed.

## 10. 不碰范围

本线程不做：

- 后台 / admin。
- 房间桌面端整体视觉重构。
- 房间移动端重构。
- 房间生命周期、Socket 协议、骰点核心、战斗核心、私聊核心、结算写回规则。
- 回退到 `isCreator` 或局部状态猜权限。
- AI 面板默认挂载。
- 真实 AI 调用。
- 官方规则自动化。
- 结团后正式角色成长机制。
- 重新生成 moodboard。
- 深度 E2E、深度 Playwright、全量视觉回归，除非用户明确要求。
- 提交 `outputs/`、截图临时产物、`tmp/`。

## 11. 当前建议

下一步最小实施切片：

1. 先修 `MessageCenterPage.tsx` 的入口一致性。
2. 同时清理 `CommandPalette.tsx` 中 `/world`、`/help` 这类死入口。
3. 再把消息中心纳入非房间 UI/UX 样板候选。

这样收益最高：

- 它不碰房间详情页。
- 它不需要后端新字段。
- 它修复真实可点击入口的不一致。
- 它能把通知、邀请、申请、公告这些已完成基础能力真正呈现给用户。

## 12. 2026-07-08 执行记录

已完成第一刀入口一致性处理：

- `/messages` 已接入正式路由。
- 桌面侧栏已增加“消息中心”入口。
- 命令面板已接入“消息中心”。
- 命令面板已移除未接路由的 `/world`、`/help` 入口。
- 命令面板文案已统一为“首页 / 故事书 / 旧日低语 / 位阶 / 印记”等产品词。
- UI system contract 已补充非房间入口一致性检查，防止后续回归。

当前轻量验证结果：

- `pnpm --filter @sunken-city/web typecheck` 通过。
- `pnpm --filter @sunken-city/web check:ui-system` 已通过新增的非房间入口检查。

## 13. 2026-07-08 消息中心样板页

已把消息中心推进为非房间全站 UI/UX 的第一个样板页：

- 从旧式 `RuneBorder` 容器迁移到 `PageShell + Surface`。
- 使用 `archive` 材质，延续“发光的秘仪档案馆”方向。
- 通知拆成“全部 / 调度 / 社交 / 系统”四层。
- 调度层承接排期、申请、邀请、房间公告等高优先信息。
- 社交层承接好友、论坛、提及、回复等长期关系信息。
- 系统层承接公告、位阶、印记、商城和管理信息。
- 私信会话与单人私信详情保留原有接口和发送逻辑，只调整阅读结构和视觉层级。
- 血红色仅保留给未读强提醒、删除等高强度语义，常规主按钮改用克制金色。

当前轻量验证结果：

- 已先让 `check:ui-system` 因消息中心 contract 缺失失败。
- 完成页面改造后，`pnpm --filter @sunken-city/web typecheck` 通过。
- 完成页面改造后，`pnpm --filter @sunken-city/web check:ui-system` 通过。

## 14. 2026-07-08 通知铃一致性

已把顶部通知铃与消息中心统一：

- 通知分层抽到 `notification-meta.ts`，作为消息中心与通知铃共用规则。
- 通知铃下拉面板增加“全部 / 调度 / 社交 / 系统”分层筛选。
- 通知铃增加“消息中心”入口，可直接进入完整消息中心页面。
- 通知条目展示所属分层，用户能快速判断信息是调度、社交还是系统。
- 通知详情的普通关闭按钮改用克制金色，血红色继续保留给删除等高强度操作。
- UI system contract 已补充通知铃与消息中心共享分层规则，防止两处文案和信息架构再次分叉。

当前轻量验证结果：

- 已先让 `check:ui-system` 因通知分层规则缺失失败。
- 完成通知铃一致性改造后，`pnpm --filter @sunken-city/web typecheck` 通过。
- 完成通知铃一致性改造后，`pnpm --filter @sunken-city/web check:ui-system` 通过。

## 15. 2026-07-08 调查员社交页

已把好友页推进为“调查员社交”样板：

- 页面从“我的好友”改为“调查员社交”，语义更贴合世界观。
- 顶部增加联系人册、同行状态、待处理申请三组摘要。
- 筛选标签统一为“联系人册 / 同行状态 / 待处理申请”。
- 增加“进入消息中心”入口，使社交页与通知、私信形成闭环。
- 主列表文案改为联系人档案语气，减少普通社交产品感。
- 使用 `archive` 材质承接消息中心样板，不额外扩展后端接口。
- UI system contract 已补充调查员社交页防回归检查。

当前轻量验证结果：

- 已先让 `check:ui-system` 因调查员社交 contract 缺失失败。
- 完成页面改造后，`pnpm --filter @sunken-city/web typecheck` 通过。
- 完成页面改造后，`pnpm --filter @sunken-city/web check:ui-system` 通过。

## 16. 2026-07-08 调查员档案页

已把个人资料页推进为“调查员档案”样板：

- 页面主语从“个人档案 / profile settings”改为“调查员档案”。
- 顶部增加“角色档案”和“进入消息中心”入口。
- 新增“公开身份 / 角色档案 / 长期留存”三段档案索引。
- 身份主卡、档案索引、档案形象区使用 `archive` 材质。
- 保留原有头像、昵称、背景、藏品、密码、头像生成等功能入口，不新增后端接口。
- UI system contract 已补充调查员档案页防回归检查。

当前轻量验证结果：

- 已先让 `check:ui-system` 因调查员档案 contract 缺失失败。
- 完成页面改造后，`pnpm --filter @sunken-city/web typecheck` 通过。
- 调查员档案相关 contract 字符串已命中，旧的 `profile settings`、`个人档案` 已移除。
- 完成页面改造后，`pnpm --filter @sunken-city/web check:ui-system` 通过。

## 17. 2026-07-08 角色详情非房间归档

已把角色详情页的非房间部分推进为“调查员卷宗”：

- 页面主语从通用“调查员档案”强化为“调查员卷宗”。
- 页面说明改为调查记录口吻，贴近《克苏鲁的呼唤》的档案风格。
- 顶部身份卡使用 `archive` 材质。
- 新增“公开经历 / 报告归档 / 结案记号”三段索引。
- 房间经历区改为“房间经历卷宗”。
- 报告入口文案改为“阅读调查报告”。
- 结局展示文案改为“结案记号”，保留原有数据和结算展示，不触碰成长规则。
- UI system contract 已补充角色详情非房间归档防回归检查。

当前轻量验证结果：

- 已先让 `check:ui-system` 因角色详情归档 contract 缺失失败。
- 完成页面改造后，`pnpm --filter @sunken-city/web typecheck` 通过。
- 角色详情归档相关 contract 字符串已命中，旧的通用说明已移除。
- 完成页面改造后，`pnpm --filter @sunken-city/web check:ui-system` 通过。

## 18. 2026-07-08 旧日低语文案统一

已把论坛相关页面推进为“旧日低语档案”：

- 论坛入口页改为“旧日低语档案 / 低语卷宗 / 已启封分卷”口吻。
- 版块页改为“旧日低语分卷 / 卷宗概览 / 誊录低语 / 最近回声”口吻。
- 帖子详情页改为“低语档案 / 原始记录 / 回声档案 / 誊写回声”口吻。
- 发帖页改为“誊录一则低语 / 密档标题 / 低语正文 / 封入档案”口吻。
- 删除、编辑、发布、回复、空状态等提示文案同步风格化，避免普通论坛产品感。
- UI system contract 已补充论坛文案风格防回归检查。
- 已扫除论坛页面中“论坛 / 版块 / 发布主题 / 帖子 / 普通讨论”等通用前端文案。

当前轻量验证结果：

- 已先让 `check:ui-system` 因论坛文案 contract 缺失失败。
- 完成文案统一后，`pnpm --filter @sunken-city/web typecheck` 通过。
- 完成文案统一后，`pnpm --filter @sunken-city/web check:ui-system` 通过。
- 论坛页面通用文案扫描通过。

## 19. 2026-07-08 黑水港作业台

已把黑水港推进为“分阶段港口作业台”样板：

- 页面主语从“深渊垂钓”强化为“黑水港作业台”，更像一个可反复游玩的世界观入口。
- 顶部阶段卡改为“潮汐等待 / 咬钩警讯 / 收竿结算 / 渔获账本”，对应等待、咬钩、收竿、沉淀四个核心动作。
- 中央操作区继续承载原有钓鱼画面、张力小游戏和结算弹层，不改动后端接口。
- 右侧沉淀区改为“渔获账本 / 可疑渔获”，把收集率、未封存、稀有记录、历史渔获统一归入港务档案。
- 页面 Surface 使用 `archive` 材质，延续消息中心、调查员档案、旧日低语的可读档案馆方向。
- 血红色只保留给咬钩、张力危险、失败提示等高强度状态。
- UI system contract 已补充黑水港作业台防回归检查。

当前轻量验证结果：

- 已先让 `check:ui-system` 因黑水港作业台 contract 缺失失败。
- 完成页面改造后，`pnpm --filter @sunken-city/web check:ui-system` 通过。
- 完成页面改造后，`pnpm --filter @sunken-city/web typecheck` 通过。

## 20. 2026-07-08 溺者之牌仪式台

已把溺者之牌推进为“分阶段仪式台”样板：

- 页面主语从通用“溺者之牌”强化为“溺者之牌仪式台”。
- 顶部阶段卡改为“入梦门槛 / 选牌仪式 / 翻牌解梦 / 梦兆图鉴 / 历史梦录”，对应入梦、选牌、翻牌、解牌、沉淀五个核心动作。
- 标签从“今日占卜 / 图鉴 / 历史”调整为“今日入梦 / 梦兆图鉴 / 历史梦录”，页面结构更贴近梦境档案。
- 中央牌桌继续承载原有抽牌、选牌、牌面展示、普通解牌、深层解牌逻辑，不改动后端接口。
- 右侧说明区增加“解牌代价”语义，保留锈蚀硬币和虚银两类消耗。
- 图鉴和历史区域使用 `archive` 材质，延续“发光秘仪档案馆”的可读沉淀方向。
- UI system contract 已补充溺者之牌仪式台防回归检查。

当前轻量验证结果：

- 已先让 `check:ui-system` 因溺者之牌仪式台 contract 缺失失败。
- 完成页面改造后，`pnpm --filter @sunken-city/web check:ui-system` 通过。
- 完成页面改造后，`pnpm --filter @sunken-city/web typecheck` 通过。

## 21. 2026-07-09 Surface 材质修正：优先复用 KP 聊天区羊皮纸

根据截图反馈，旧的 `archive-paper-light-surface.webp` 横纹质感偏灰、偏普通纸面，不适合作为非房间主 Surface 的长期底纹。

本轮已把 `archive` Surface 的材质源切换为房间页面 KP 聊天区域同款羊皮纸：

- 新增 `--coc-texture-keeper-parchment`，指向 `room-v6-aged-parchment-white.webp`。
- `--coc-texture-archive-paper` 改为引用 `--coc-texture-keeper-parchment`。
- `archive` Surface 叠加层从粗横纹改为轻高光、边缘压暗和纸面阴影。
- 消息中心、调查员档案、黑水港、溺者之牌等已使用 `archive` 的非房间页面会自动继承这套材质。
- UI system contract 已补充规则：`archive` Surface 必须使用 KP 聊天区羊皮纸，而不是旧通用 archive paper。

当前轻量验证结果：

- 已先让 `check:ui-system` 因 `--coc-texture-keeper-parchment` 缺失失败。
- 完成材质替换后，`pnpm --filter @sunken-city/web typecheck` 通过。
- `check:ui-system` 已通过新增材质规则，但当前工作区仍有房间移动端专项 contract 未满足，属于本线程不接手范围。

## 22. 2026-07-09 KP 端子卡片与房间列表顶栏对齐

根据最新截图反馈，非房间页面的容器层级继续向房间系统靠拢：

- 全站 `PageShell` 顶部栏改为参照房间列表页：深绿黑色仪式横幅、细金边、左侧竖向仪式标记、金色放射纹、右侧深色操作区。
- 第一版曾尝试使用房间控制台与顶栏近似材质，后续已改为直接迁移房间列表页真实顶部栏结构。
- 新增通用 `.coc-archive-subcard`，用于容器内部的子卡片、计数器和轻量信息块。
- `.coc-archive-subcard` 复用 KP 聊天区羊皮纸材质，采用浅底、细边、内阴影，不再使用黑色半透明子块。
- 溺者之牌的资源计数、仪式阶段、解牌代价、历史数量已改用 `.coc-archive-subcard`。
- 黑水港作业台的今日作业计数已改用 `.coc-archive-subcard`。
- UI system contract 已补充防回归规则：非房间顶栏必须保留房间列表式金纹横幅，非房间 archive 子卡片必须使用 KP 羊皮纸层级。

当前轻量验证结果：

- 新增的非房间顶栏 / 子卡片视觉契约已命中。
- `git diff --check` 对本轮触及文件通过，仅保留仓库既有 LF/CRLF 提示。
- `check:ui-system` 已通过本轮新增契约，但仍停在既有房间移动端专项 contract，属于本线程不接手范围。
- 已截取 `/dream` 预览图：`C:\WINDOWS\TEMP\sunken-city-dream-kp-header-subcards-preview.png`。

## 23. 2026-07-09 顶部栏改为直接复制房间列表页结构

根据进一步反馈，上一版“近似房间列表顶部”的做法不够直接。本轮已把房间列表页真实顶部栏结构迁移到全站 `PageShell`：

- 通用顶部栏使用与房间列表一致的两栏结构：左侧标题说明，右侧深色操作井。
- 背景材质改为房间列表页同款 `header-cold-mist`，不再使用上一版近似的 `room-v6-topbar`。
- 左侧仪式标记改为房间列表页同款 `gold-vertical-sigil`。
- 金色放射纹、内层细金边、右侧按钮井、按钮扫光和金/血红渐变状态沿用房间列表页。
- 配色仅做可读性微调：深绿更冷、更透气，金边略提高亮度，正文保持奶油色，不回到低透明灰字。
- 移动端也复制房间列表页的单列顶部栏规则，避免桌面和手机视觉断层。
- `PageShell` 顶部 Surface 改为 `padding="none"`，避免通用内边距覆盖房间列表式左侧仪式标记与标题缩进。
- UI system contract 已改为检查房间列表真实顶部栏结构：`header-cold-mist`、`gold-vertical-sigil`、`gold-sunburst-arc`、12rem 操作井和按钮样式。

## 24. 2026-07-09 深度对比修正：原始素材、资源井、PL 羊皮纸信息架

根据进一步截图反馈，本轮对比了三类基准：

- 房间列表页顶部栏：深绿色冷雾原始素材、金色竖向标记、金色放射纹、右侧深色操作井。
- 房间系统 Web 端 PL 左侧栏：浅羊皮纸信息架、细金边、墨色正文、金色小标题。
- 当前 `/dream` 页面：顶部背景像被压暗的截图层，右侧货币像临时小白块，阶段条尺寸突兀，说明卡标题浅紫低对比。

本轮修正：

- 顶部栏撤销“仿制深绿背景”参数，改为直接读取并迁移 `RoomListPage.tsx` / `rooms.css` 的顶部栏源码：`90deg` 深绿渐变、`header-cold-mist` 原始素材、金色竖向标记、放射纹和右侧操作井保持同一套组合。
- 通用顶部栏选择器提升为 `.coc-page-shell__header.coc-surface-v2`，避免 `Surface[data-variant="page"]` 半透明背景覆盖原始素材。
- `/dream` 右侧货币不再使用浅色子卡片，改为房间列表右侧操作井内的全宽资源条。
- `/dream` 阶段区改为 PL 左侧栏式浅羊皮纸信息架：左侧标签控制，右侧阶段卡更短、更密、更像档案栏。
- `/dream` 说明卡标题从浅紫改为金色档案标题，正文改为墨色高对比文本。
- 防回归规则新增：不得用 `room-v4-header-ritual.webp` 或其他合成背景替换房间列表页原始 `header-cold-mist` 顶部栏源码；溺者之牌必须保留资源井、阶段条、说明卡专用样式。

后续截图反馈修正：

- 移除 `/dream` 旧页面遗留的 `padding-top: 2rem`，避免房间列表式横幅距离顶部导航过远。
- 将 `/dream` 顶部状态区左侧三枚入口从矮按钮条改为三张独立同高索引牌，和右侧五枚阶段卡组成 `3 + 5` 的等规格队列；计数改为独立下行，避免文字和数字挤在同一行。
- 根据后续反馈，顶部状态区正式定版为三张唯一入口卡：`今日入梦 / 梦兆图鉴 / 历史梦兆`。删除重复的“入梦门槛 / 选牌仪式 / 翻牌解梦 / 梦兆图鉴 / 历史梦录”五卡流程展示；保留其中不重复的选牌、翻牌、深度解牌、归档刷新说明，并放入右侧说明栏。

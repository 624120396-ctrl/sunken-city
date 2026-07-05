# 沉没之城调查体验升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 围绕网络跑团最痛的环节，把《沉没之城》从“能聊天、能骰点的房间”升级为“团前准备、团中调查、团后回顾”三段式 CoC 调查工作台。

**Architecture:** 本轮优先做不依赖官方规则书的产品能力：线索板、NPC 档案、场景系统、调查日志、KP 私密便签、上次回顾、当前目标和开团协作。AI 能力合并进总路线图，但作为独立迭代线执行：先建设档案和日志数据，再接低成本文本整理、Seedream 4.5 素材生成和公开摘要；语音大模型后置，只预留数据结构与开关。所有 AI 输出默认是草稿，必须经过权限过滤和人工确认后才能公开。后端沿用已上线的房间身份与生命周期契约，所有权限显示与写操作围绕 `myRole`、`myCapabilities`、`myBinding`、`lifecycle`，不新增规则裁定，不改 Socket 事件，不碰结团后角色成长。

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS，Express + Prisma + SQLite + Socket.io，现有房间 capability contract，AI 接入层使用统一 `AiJob` / `AiAsset` / `AiUsageLedger` / provider adapter 抽象。语言模型优先接入 DeepSeek V4 / V4.1 Flash 与 Doubao-Seed-Character，图像模型接入 Seedream 4.5；语音大模型、TTS、STT 和实时语音只做后期预留。现有 UI system 由 UI/UX 专项会话负责。

---

> 审计备注：本文档是“调查体验升级总路线图 + 分阶段实施计划”，不应作为一次性执行清单直接整体开工。实际进入开发时，应按 Phase 1、Phase 2、Phase 5-7、Phase 8-10 分拆成独立执行计划，每个计划单独做迁移、接口、前端、轻量验证和交接。

## 0. 调研来源

本方案基于一次中英文网络检索和当前项目状态整理，重点参考：

- [TRPG Engine 介绍](https://trpgdoc.moonrailgun.com/docs/introduce)：普通聊天工具跑团需要外接骰子、人物卡、文档和地图，容易产生数据不同步、文件管理混乱、机器人服务不稳定等问题。
- [Notion COC TRPG Dashboard](https://www.notion.com/zh-cn/templates/coc-trpg-dashboard)：COC 跑团面板把 KP 备团笔记、PL 人物卡一览、团务回顾放在核心位置。
- [Pelgrane Press: 9 Tips for Remote Tabletop RPG Play](https://pelgranepress.com/2020/03/23/9-tips-for-remote-tabletop-rpg-play/)：远程跑团应降低工具学习成本，优先使用熟悉、稳定的流程。
- [The Angry GM: How to Run an Online Game](https://theangrygm.com/how-to-run-an-online-game/)：过重的 VTT 功能会带来学习曲线、准备时间和游戏迟滞。
- [Reddit: GM remote play setup](https://www.reddit.com/r/rpg/comments/rihugq/gms_whats_your_setup_for_fully_remote_play_whats/)：远程跑团中数字人物卡、视觉辅助、资料组织是常见痛点。
- [Reddit: Paying attention during online gaming](https://www.reddit.com/r/rpg/comments/pkn6ok/paying_attention_during_online_gaming/)：线上玩家和主持人更容易分心，需要更明确的当前焦点。
- `C:\Users\29102\Downloads\网络跑团痛点分析报告.md`：覆盖玩家端、KP 端、工具平台、社交社区和 COC 专项痛点，进一步确认鸽团、沟通失真、专注力不足、工具碎片化、凑人难、风格割裂和 COC 氛围难在线复现是后续迭代必须覆盖的核心问题。
- [DeepSeek API Docs](https://api-docs.deepseek.com/) / [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing)：语言模型接入优先走 DeepSeek V4 / V4.1 Flash 路线，用于长上下文摘要、结构化提取、日志整理、公开摘要和低成本批处理任务；具体 `modelId` 不写死，以供应商控制台和线上可用性为准。
- [Volcengine Doubao 模型列表](https://www.volcengine.com/docs/82379/1330310) / [Doubao 产品页](https://www.volcengine.com/product/doubao)：Doubao-Seed-Character 用于 NPC 口吻、角色化文本、招募文案、氛围描述和 KP 草稿润色，适合增强“像角色在说话”的 CoC 沉浸感。
- [ByteDance Seedream 4.5](https://seed.bytedance.com/en/seedream4_5) / [BytePlus Image Generation API](https://docs.byteplus.com/en/docs/ModelArk/1541523)：图像模型接入 Seedream 4.5，用于 NPC 头像、场景图、报纸剪报、旧照片、调查 handout 和神秘符号。
- 结构化输出作为通用工程原则：所有 AI 摘要、提取和公开答复都必须按预设 schema 返回，保留来源引用，并在公开前由 KP 人工确认。
- 语音大模型、TTS、STT 和实时语音不进入第一轮 AI 实施，只预留能力位；后续等成本、模型质量和隐私同意机制明确后再启动。

### 0.1 报告复核结论

这份痛点分析报告已经足够完整，不需要用户再补充材料。它对原计划的主要修正是：调查档案系统只能解决“信息散落”和“复盘困难”，但网团更大的长期风险还包括“鸽团 / 改期 / 凑人 / 风格不匹配 / 线上沟通失真 / 玩家分心 / COC 氛围被技术打断”。因此调查体验完成后，下一组迭代不应继续扩写线索板，而应转向开团协作、参与承诺、沟通秩序和风格匹配。

## 1. 产品判断

CoC 网络跑团最痛的不是“不会掷骰”，而是：

- 网团缺少线下见面的承诺压力，临时请假、连续改期和长团烂尾是头号杀手。
- KP 资料散在外部文档、聊天记录、图片文件夹和临时笔记里。
- PL 很难从聊天流里找回线索、NPC、地点和当前目标。
- 线上跑团容易断档，下次开团时大家忘记上回发生了什么。
- KP 要同时处理剧情、线索、暗线、私聊、骰点、NPC 和玩家状态，操作负担高。
- 团后报告和复盘需要重新翻聊天记录，成本高。
- 工具太重会增加学习成本，反而拖慢跑团。
- 线上语音缺少眼神、表情和空间感，抢话、沉默玩家、垄断型玩家更难处理。
- COC 对恐怖氛围、节奏和信息管理敏感，网络延迟、噪音、分心和玩家数量过多会显著削弱体验。
- 玩家和 KP 对 COC 风格的期待可能不同，例如日系情感戏剧、传统调查恐怖、轻松相声团和硬核规则团混在一起会造成体验分裂。

因此《沉没之城》下一阶段的新增功能核心是：

> 帮 KP 管住调查过程，帮 PL 看懂当前局势，帮所有人留下可复盘的案件档案。

## 2. 非目标

本轮明确不做：

- 官方规则书相关自动化。
- 结团后的正式角色成长机制。
- 完整战斗自动化。
- 复杂地图编辑器或 3D VTT。
- AI 自动 KP。
- 复杂推理图谱和大关系网可视化。
- 后台 admin。
- 大规模 E2E、深度 Playwright 或全站视觉回归。
- AI 自动发布公开内容。
- AI 读取或泄露 KP 私密便签、私密线索、私聊或未公开场景。
- 第一轮接入语音大模型、TTS、STT 或实时语音代理。
- AI 克隆真人声音、冒充真实人物或生成无授权声音。
- AI 绕过 KP 确认直接改房间状态、公开线索、结算、角色卡或用户数据。

## 3. 阶段路线

### Phase 1：调查档案系统 V1

目标：让每个房间拥有结构化案件档案，而不是只依赖聊天流。

包含：

- 案件线索板
- NPC 档案柜
- 场景 / 地点系统
- 调查日志时间线
- KP 私密便签

验收：

- KP 可以在一个房间内创建、公开、隐藏和管理线索、NPC、场景。
- PL 只能看到公开内容。
- 关键事件自动进入调查日志。
- KP 私密便签不会暴露给 PL / OBSERVER。

### Phase 2：团前 / 团后连续性

目标：解决长团断档和开团前资料散乱。

包含：

- 备团中心
- 开团检查清单
- 上次回顾
- 当前调查目标
- 未解决问题列表

验收：

- KP 进房前能看到本团准备状态。
- PL 进房后能快速知道上回发生了什么、当前要查什么。
- 长团暂停一周后仍能恢复上下文。

### Phase 3：线上参与焦点

目标：降低线上玩家分心和移动端迷路。

包含：

- PL 当前焦点面板
- KP 置顶消息
- 最新公开线索
- 最近关键骰点
- 当前场景摘要

验收：

- PL 首屏能知道“现在在哪里、要做什么、刚发现了什么”。
- KP 能把重要信息固定在房间顶部或焦点区。

### Phase 4：低成本效率工具

目标：继续减轻 KP 操作负担，但不引入重 VTT。

包含：

- 快捷骰点增强
- 重要消息标记
- 报告自动生成增强
- 数字人物卡状态同步检查

验收：

- 骰点、关键消息、线索公开、场景切换都能进入日志。
- 团后报告不需要 KP 从零整理。

### Phase 5：开团协作与承诺系统

目标：解决网团最常见的鸽团、改期、忘记开团和参与状态不清楚。

包含：

- 房间邀请
- 下次开团时间
- 成员参加确认
- 请假 / 待确认 / 可参加状态
- KP 房间公告
- 开团前提醒
- 长团排期记录

验收：

- KP 可以设置下次开团时间并通知成员。
- PL 可以确认参加、请假或保持待确认。
- 改期会自动生成通知。
- 房间列表或房间入口能显示“下一次开团”和“还有谁未确认”。

### Phase 6：沟通秩序与当前焦点

目标：缓解线上抢话、沉默、注意力分散和 COC 氛围被打断的问题。

包含：

- KP 置顶当前焦点
- 发言 / 行动轮候队列
- “轮到谁”轻提示
- 沉默玩家提醒给 KP
- 关键骰点 / 关键选择聚焦
- 场景氛围提示和开场前环境检查

验收：

- PL 可以清楚知道当前正在讨论什么、谁在行动、自己是否需要回应。
- KP 可以温和地提示某个玩家发言或确认在线。
- COC 恐怖场景前可以提示玩家保持耳机、环境安静和专注。

### Phase 7：招募、风格匹配与新手/KP 降压

目标：解决凑人难、风格不匹配、新手门槛高和 KP 培养困难。

包含：

- 房间招募页
- 跑团风格标签
- 推荐人数提示，COC 网团默认建议 3-4 名 PL
- 新手友好 / 老手向 / 严肃调查 / 轻松社交 / 恐怖氛围 / 角色关系 等标签
- 玩家申请加入
- KP 审核申请
- 新手 PL 入房小抄
- 新手 KP 开团检查清单

验收：

- 玩家报名之前能看懂本团风格、人数、时间和门槛。
- KP 能筛选风格匹配的玩家。
- 新人不会一进房就面对一整套复杂规则和工具。

### Phase 8：AI 档案整理与备团副手

目标：把 AI 用在最适合的位置：帮助 KP 把散乱文本整理成结构化档案，而不是替代 KP 带团。

包含：

- 模组 / 笔记结构化提取
- AI 线索草稿
- AI NPC 草稿
- AI 场景草稿
- AI 上次回顾草稿
- AI 当前目标草稿
- AI 未解决问题清单

验收：

- AI 只能生成草稿，KP 确认后才写入房间正式档案。
- AI 输出必须带来源片段或来源事件，避免无来源编造。
- AI 不能读取 PL 不应看到的 KP 私密内容。

### Phase 9：AI 素材工坊（Seedream 4.5）与语音能力预留

目标：补齐 COC 网团最难在线复现的氛围感，但不引入重 VTT。

包含：

- NPC 头像生成
- 场景氛围图生成
- 报纸剪报 / 旧照片 / 调查 handout 生成
- 图像编辑和风格化
- 神秘符号、档案印章、旧地图局部等视觉素材
- 语音能力的数据结构、开关和审计预留

验收：

- AI 素材默认私密保存，KP 手动公开。
- 每个素材都记录用途、生成提示、可见性和关联对象。
- 首轮不接入 TTS、STT 或实时语音代理，不产生语音费用。

### Phase 10：AI 玩家公开摘要与 KP 私密提醒

目标：降低线上断档、玩家分心和 KP 叙事负担。

包含：

- “我现在知道什么”公开摘要
- 当前场景公开摘要
- NPC / 线索关系公开摘要
- KP 私密线索遗漏提醒
- 沉默玩家提示
- 节奏推进建议
- 恐怖氛围强化建议

验收：

- PL 摘要只能基于公开内容和该玩家可见内容。
- KP 私密提醒只在 KP 界面显示，不自动发言、不自动改状态。
- AI 建议必须可关闭。

## 4. Phase 1 文件结构

### 后端新增文件

- `apps/server/src/modules/rooms/investigation-board.routes.ts`
  - 挂载调查档案相关路由。
- `apps/server/src/modules/rooms/investigation-clue.service.ts`
  - 线索 CRUD、公开/隐藏、权限校验。
- `apps/server/src/modules/rooms/investigation-npc.service.ts`
  - NPC 档案 CRUD、公开字段与 KP 私密字段隔离。
- `apps/server/src/modules/rooms/investigation-scene.service.ts`
  - 场景 CRUD、当前场景切换。
- `apps/server/src/modules/rooms/investigation-log.service.ts`
  - 调查日志写入、读取、重要事件标记。
- `apps/server/src/modules/rooms/kp-note.service.ts`
  - KP 私密便签。

### 前端新增文件

- `apps/web/src/services/investigation.service.ts`
  - 调查档案 API 调用。
- `apps/web/src/types/investigation-contract.ts`
  - 线索、NPC、场景、日志、便签类型。
- `apps/web/src/pages/rooms/components/InvestigationDock.tsx`
  - 房间内调查档案入口容器。
- `apps/web/src/pages/rooms/components/ClueBoardPanel.tsx`
  - 线索板。
- `apps/web/src/pages/rooms/components/NpcArchivePanel.tsx`
  - NPC 档案柜。
- `apps/web/src/pages/rooms/components/ScenePanel.tsx`
  - 场景 / 地点系统。
- `apps/web/src/pages/rooms/components/InvestigationTimelinePanel.tsx`
  - 调查日志时间线。
- `apps/web/src/pages/rooms/components/KpPrivateNotesPanel.tsx`
  - KP 私密便签。

### 修改文件

- `apps/server/prisma/schema.prisma`
  - 新增调查档案数据模型。
- `apps/server/src/index.ts`
  - 挂载新路由。
- `apps/server/src/modules/rooms/room-auth.ts`
  - 如现有能力不足，补最小 capability 字段；优先复用 `canManageClues`、`canManageScene`、`canViewPublicContent`。
- `apps/web/src/pages/rooms/RoomPage.tsx`
  - 接入 `InvestigationDock`。
- `apps/web/src/types/room-contract.ts`
  - 如需要，补充轻量显示字段；不要改变现有 contract 含义。

## 5. 数据模型

### Task 1: 增加调查档案模型

**Files:**

- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: 添加线索模型**

```prisma
model InvestigationClue {
  id          String   @id @default(uuid())
  roomId      String
  title       String
  content     String
  source      String?
  status      String   @default("UNREVEALED") // UNREVEALED | REVEALED | ANALYZED | KEY | DOUBTFUL
  visibility  String   @default("KP_ONLY") // KP_ONLY | PUBLIC
  npcId       String?
  sceneId     String?
  createdById String
  revealedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  room        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, visibility])
  @@index([roomId, status])
}
```

- [ ] **Step 2: 添加 NPC 档案模型**

```prisma
model InvestigationNpc {
  id             String   @id @default(uuid())
  roomId         String
  name           String
  avatarUrl      String?
  publicProfile  String   @default("")
  keeperNotes    String   @default("")
  status         String   @default("UNSEEN") // UNSEEN | APPEARED | MISSING | DEAD | SUSPECT | ALLY | HOSTILE
  visibility     String   @default("KP_ONLY") // KP_ONLY | PUBLIC
  createdById    String
  revealedAt     DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  room           Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, visibility])
  @@index([roomId, status])
}
```

- [ ] **Step 3: 添加场景模型**

```prisma
model InvestigationScene {
  id            String   @id @default(uuid())
  roomId        String
  title         String
  publicSummary String  @default("")
  keeperNotes   String  @default("")
  atmosphere    String  @default("normal")
  imageUrl      String?
  isCurrent     Boolean @default(false)
  sortOrder     Int     @default(0)
  createdById   String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  room          Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, isCurrent])
  @@index([roomId, sortOrder])
}
```

- [ ] **Step 4: 添加调查日志模型**

```prisma
model InvestigationLogEntry {
  id          String   @id @default(uuid())
  roomId      String
  eventType   String   // CLUE_REVEALED | NPC_REVEALED | SCENE_CHANGED | IMPORTANT_MESSAGE | DICE_KEY | KP_NOTE_MARKER
  title       String
  content     String?
  payload     String   @default("{}")
  visibility  String   @default("PUBLIC") // PUBLIC | KP_ONLY
  isPinned    Boolean  @default(false)
  createdById String?
  createdAt   DateTime @default(now())

  room        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, visibility, createdAt])
  @@index([roomId, isPinned])
}
```

- [ ] **Step 5: 添加 KP 私密便签模型**

```prisma
model KpPrivateNote {
  id        String   @id @default(uuid())
  roomId    String
  userId    String
  title     String
  content   String
  tags      String   @default("[]")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  room      Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, userId])
}
```

- [ ] **Step 6: 给 `Room` 添加关系**

```prisma
  investigationClues InvestigationClue[]
  investigationNpcs InvestigationNpc[]
  investigationScenes InvestigationScene[]
  investigationLogEntries InvestigationLogEntry[]
  kpPrivateNotes KpPrivateNote[]
```

- [ ] **Step 7: 生成迁移**

```powershell
cd apps/server
npx prisma migrate dev --name add_investigation_workspace
```

Expected: 只新增调查档案相关表和索引。

## 6. 后端任务

### Task 2: 线索板服务

**Files:**

- Create: `apps/server/src/modules/rooms/investigation-clue.service.ts`
- Create or Modify: `apps/server/src/modules/rooms/investigation-board.routes.ts`

- [ ] **Step 1: 定义输入 schema**

```ts
const cluePayloadSchema = z.object({
  title: z.string().min(1).max(80),
  content: z.string().max(4000).default(''),
  source: z.string().max(120).nullable().optional(),
  status: z.enum(['UNREVEALED', 'REVEALED', 'ANALYZED', 'KEY', 'DOUBTFUL']).optional(),
  visibility: z.enum(['KP_ONLY', 'PUBLIC']).optional(),
  npcId: z.string().nullable().optional(),
  sceneId: z.string().nullable().optional(),
});
```

- [ ] **Step 2: 权限规则**

```text
读取公开线索：canViewPublicContent
读取全部线索：canManageClues
创建/修改/删除线索：canManageClues
公开线索：canManageClues
```

- [ ] **Step 3: 自动写日志**

当线索从 `KP_ONLY` 改为 `PUBLIC` 时，写入 `InvestigationLogEntry`：

```text
eventType = CLUE_REVEALED
title = 发现线索：{title}
visibility = PUBLIC
```

### Task 3: NPC 档案服务

**Files:**

- Create: `apps/server/src/modules/rooms/investigation-npc.service.ts`
- Modify: `apps/server/src/modules/rooms/investigation-board.routes.ts`

- [ ] **Step 1: 权限规则**

```text
PL / OBSERVER：只能读取 PUBLIC NPC，且不返回 keeperNotes
KP：可读取全部 NPC 和 keeperNotes
KP：可创建、修改、删除、公开 NPC
```

- [ ] **Step 2: 自动写日志**

当 NPC 首次公开时写入：

```text
eventType = NPC_REVEALED
title = NPC 登场：{name}
visibility = PUBLIC
```

### Task 4: 场景 / 地点服务

**Files:**

- Create: `apps/server/src/modules/rooms/investigation-scene.service.ts`
- Modify: `apps/server/src/modules/rooms/investigation-board.routes.ts`

- [ ] **Step 1: 当前场景切换**

切换当前场景时必须在事务里执行：

```text
同房间所有 scene.isCurrent = false
目标 scene.isCurrent = true
写入 InvestigationLogEntry
```

- [ ] **Step 2: 权限规则**

```text
读取公开场景：canViewPublicContent
创建/修改/切换场景：canManageScene
```

### Task 5: 调查日志服务

**Files:**

- Create: `apps/server/src/modules/rooms/investigation-log.service.ts`
- Modify: `apps/server/src/modules/rooms/investigation-board.routes.ts`

- [ ] **Step 1: 读取日志**

```text
PL / OBSERVER：只读 PUBLIC
KP：可读 PUBLIC + KP_ONLY
```

- [ ] **Step 2: 重要事件标记**

KP 可创建手动日志条目：

```text
IMPORTANT_MESSAGE
KP_NOTE_MARKER
DICE_KEY
```

第一版不强行追溯旧聊天记录，只支持从上线后开始归档。

### Task 6: KP 私密便签

**Files:**

- Create: `apps/server/src/modules/rooms/kp-note.service.ts`
- Modify: `apps/server/src/modules/rooms/investigation-board.routes.ts`

- [ ] **Step 1: 权限规则**

```text
只有 canUseKPTools 的用户可访问
OWNER_KP 和 ASSISTANT_KP 可以各自拥有便签
便签不进入 PUBLIC 调查日志
```

- [ ] **Step 2: 标签存储**

`tags` 使用 JSON 字符串数组，后端读取时安全解析，解析失败返回空数组。

## 7. 前端任务

### Task 7: 前端契约与 service

**Files:**

- Create: `apps/web/src/types/investigation-contract.ts`
- Create: `apps/web/src/services/investigation.service.ts`

- [ ] **Step 1: 类型定义**

```ts
export type InvestigationVisibility = 'KP_ONLY' | 'PUBLIC';
export type ClueStatus = 'UNREVEALED' | 'REVEALED' | 'ANALYZED' | 'KEY' | 'DOUBTFUL';
export type NpcStatus = 'UNSEEN' | 'APPEARED' | 'MISSING' | 'DEAD' | 'SUSPECT' | 'ALLY' | 'HOSTILE';

export interface InvestigationClueView {
  id: string;
  roomId: string;
  title: string;
  content: string;
  source: string | null;
  status: ClueStatus;
  visibility: InvestigationVisibility;
  npcId: string | null;
  sceneId: string | null;
  revealedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationNpcView {
  id: string;
  roomId: string;
  name: string;
  avatarUrl: string | null;
  publicProfile: string;
  keeperNotes?: string;
  status: NpcStatus;
  visibility: InvestigationVisibility;
  revealedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationSceneView {
  id: string;
  roomId: string;
  title: string;
  publicSummary: string;
  keeperNotes?: string;
  atmosphere: string;
  imageUrl: string | null;
  isCurrent: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvestigationLogEntryView {
  id: string;
  roomId: string;
  eventType: string;
  title: string;
  content: string | null;
  payload: unknown;
  visibility: 'PUBLIC' | 'KP_ONLY';
  isPinned: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: service 函数**

提供最小 API：

```ts
getInvestigationClues(roomId)
saveInvestigationClue(roomId, payload)
revealInvestigationClue(roomId, clueId)
getInvestigationNpcs(roomId)
saveInvestigationNpc(roomId, payload)
revealInvestigationNpc(roomId, npcId)
getInvestigationScenes(roomId)
saveInvestigationScene(roomId, payload)
setCurrentInvestigationScene(roomId, sceneId)
getInvestigationTimeline(roomId)
getKpPrivateNotes(roomId)
saveKpPrivateNote(roomId, payload)
```

### Task 8: 房间页调查档案入口

**Files:**

- Create: `apps/web/src/pages/rooms/components/InvestigationDock.tsx`
- Modify: `apps/web/src/pages/rooms/RoomPage.tsx`

- [ ] **Step 1: 接入规则**

`RoomPage` 根据 capability 显示：

```tsx
{room.myCapabilities?.canViewPublicContent && (
  <InvestigationDock roomId={room.roomId} capabilities={room.myCapabilities} />
)}
```

- [ ] **Step 2: 面板入口**

第一版 Dock 包含 tab：

```text
线索
NPC
场景
日志
KP 便签（仅 KP）
```

### Task 9: 线索 / NPC / 场景 / 日志 / 便签面板

**Files:**

- Create: `apps/web/src/pages/rooms/components/ClueBoardPanel.tsx`
- Create: `apps/web/src/pages/rooms/components/NpcArchivePanel.tsx`
- Create: `apps/web/src/pages/rooms/components/ScenePanel.tsx`
- Create: `apps/web/src/pages/rooms/components/InvestigationTimelinePanel.tsx`
- Create: `apps/web/src/pages/rooms/components/KpPrivateNotesPanel.tsx`

- [ ] **Step 1: 第一版交互原则**

```text
KP：可新增、编辑、公开
PL：只读公开内容
OBSERVER：只读公开内容
NON_MEMBER：不可读
```

- [ ] **Step 2: 空状态文案**

```text
暂无公开线索
暂无公开 NPC 档案
当前场景尚未设定
调查日志会记录公开线索、NPC 登场和场景切换
KP 便签仅主持人可见
```

## 8. Phase 2 规划

### Task 10: 团前准备中心

**Files:**

- Create: `apps/server/src/modules/rooms/session-prep.service.ts`
- Create: `apps/web/src/pages/rooms/components/SessionPrepPanel.tsx`

第一版字段：

```text
开团时间
准备清单
PL 角色确认状态
备团备注
模组资料链接
```

权限：

```text
KP 可编辑
PL 可查看公开准备项和角色确认状态
```

### Task 11: 上次回顾与当前目标

**Files:**

- Create: `apps/server/src/modules/rooms/session-recap.service.ts`
- Create: `apps/web/src/pages/rooms/components/CurrentFocusPanel.tsx`

第一版字段：

```text
上次回顾
当前调查目标
未解决问题
KP 置顶消息
```

权限：

```text
KP 可编辑
PL / OBSERVER 可读公开内容
```

## 9. Phase 5 规划：开团协作与承诺系统

### Task 12: 通知中心与房间公告

**Files:**

- Create: `apps/server/src/modules/notifications/room-notification.service.ts`
- Create: `apps/server/src/modules/rooms/room-announcement.service.ts`
- Create: `apps/web/src/services/room-notification.service.ts`
- Create: `apps/web/src/pages/rooms/components/RoomAnnouncementPanel.tsx`
- Modify: `apps/server/prisma/schema.prisma`

第一版数据对象：

```text
RoomAnnouncement
- roomId
- title
- content
- importance: normal | important | urgent
- createdById
- publishedAt

RoomNotification
- userId
- roomId
- type: ROOM_INVITE | SCHEDULE_CHANGED | ANNOUNCEMENT | CLUE_REVEALED | SCENE_CHANGED | REPORT_READY
- title
- content
- link
- status: UNREAD | READ | HANDLED | EXPIRED
```

权限：

```text
KP 可发布房间公告
房间成员可读公告
通知只发给相关用户
```

第一版不做短信、邮件或系统级推送，只做站内通知。

### Task 13: 下次开团时间与成员确认

**Files:**

- Create: `apps/server/src/modules/rooms/room-schedule.service.ts`
- Create: `apps/web/src/pages/rooms/components/RoomSchedulePanel.tsx`
- Modify: `apps/server/prisma/schema.prisma`

第一版字段：

```text
RoomSchedule
- roomId
- startsAt
- note
- status: PLANNED | RESCHEDULED | CANCELLED | COMPLETED

RoomAttendance
- scheduleId
- userId
- status: PENDING | AVAILABLE | ABSENT | MAYBE
- note
```

交互：

```text
KP 设置或修改下次开团时间
PL 确认可参加 / 请假 / 待定
改期后相关成员收到通知
房间入口显示未确认人数
```

### Task 14: 房间邀请

**Files:**

- Create: `apps/server/src/modules/rooms/room-invite.service.ts`
- Create: `apps/web/src/pages/rooms/components/RoomInvitePanel.tsx`
- Modify: `apps/server/prisma/schema.prisma`

第一版字段：

```text
RoomInvite
- roomId
- inviterId
- inviteeId
- inviteRole: PLAYER | OBSERVER
- message
- status: PENDING | ACCEPTED | DECLINED | EXPIRED
- expiresAt
```

规则：

```text
KP 可邀请 PL 或 OBSERVER
被邀请用户可接受或拒绝
接受 PLAYER 邀请后仍需要绑定自己拥有的角色卡
接受 OBSERVER 邀请不绑定角色卡
过期邀请不可再接受
```

## 10. Phase 6 规划：沟通秩序与当前焦点

### Task 15: 发言 / 行动轮候队列

**Files:**

- Create: `apps/server/src/modules/rooms/room-turn-queue.service.ts`
- Create: `apps/web/src/pages/rooms/components/RoomTurnQueuePanel.tsx`
- Modify: `apps/server/prisma/schema.prisma`

第一版目标不是战斗先攻，而是线上沟通秩序：

```text
KP 可把成员加入“等待发言 / 等待行动”队列
KP 可标记当前焦点成员
PL 可看到当前轮到谁、自己是否在队列中
```

默认不影响聊天发送权限，不改战斗系统。

### Task 16: COC 氛围与技术准备检查

**Files:**

- Create: `apps/server/src/modules/rooms/session-readiness.service.ts`
- Create: `apps/web/src/pages/rooms/components/SessionReadinessPanel.tsx`

第一版检查项：

```text
耳机 / 麦克风可用
当前环境适合语音
角色卡已绑定
已阅读上次回顾
已查看当前目标
本团风格已确认
```

用途：

```text
开场前降低技术故障和氛围打断
帮助 KP 判断谁还没准备好
```

## 11. Phase 7 规划：招募、风格匹配与新手/KP 降压

### Task 17: 房间招募与风格标签

**Files:**

- Create: `apps/server/src/modules/rooms/room-recruitment.service.ts`
- Create: `apps/web/src/pages/rooms/components/RoomRecruitmentPanel.tsx`
- Modify: `apps/server/prisma/schema.prisma`

第一版字段：

```text
招募状态：closed | recruiting | paused | full
人数上限
推荐 PL 人数
跑团风格标签
新手友好程度
预计时长
开团频率
报名说明
```

建议内置标签：

```text
严肃调查
恐怖氛围
角色关系
轻松社交
新手友好
老手向
短团
长团
日系风格
传统调查
```

COC 网团默认提示：推荐 3-4 名 PL，超过 4 人需要 KP 明确接受更高沟通成本。

### Task 18: 玩家报名与 KP 审核

**Files:**

- Create: `apps/server/src/modules/rooms/room-application.service.ts`
- Create: `apps/web/src/pages/rooms/components/RoomApplicationPanel.tsx`
- Modify: `apps/server/prisma/schema.prisma`

第一版字段：

```text
RoomApplication
- roomId
- userId
- characterId
- message
- status: PENDING | ACCEPTED | REJECTED | WITHDRAWN
```

规则：

```text
公开招募房间允许玩家申请
KP 审核通过后玩家再完成加入 / 角色绑定
拒绝申请可以保留简短原因
```

### Task 19: 新手 PL 小抄与 KP 开团清单

**Files:**

- Create: `apps/web/src/pages/rooms/components/NewPlayerGuidePanel.tsx`
- Create: `apps/web/src/pages/rooms/components/KeeperLaunchChecklistPanel.tsx`

第一版内容：

```text
PL 小抄：如何进房、绑定角色、看当前目标、看线索、发言、投骰、私聊 KP
KP 清单：确认玩家、确认角色卡、设置当前场景、准备线索、发布回顾、设置开团时间
```

不引入官方规则细节，只讲产品内操作和网团礼仪。

## 12. Phase 8-10 规划：AI 辅助系统

### 12.1 AI 总原则

AI 在《沉没之城》里的定位是：

```text
KP 副手
档案整理员
氛围素材工坊
公开信息摘要器
```

AI 不是：

```text
自动 KP
规则裁判
自动剧情推进器
自动公开发布器
替玩家做决定的代理
```

所有 AI 输出默认进入草稿状态。凡是会被 PL / OBSERVER 看到的内容，都必须经过 KP 或具备对应 capability 的用户确认。

### Task 20: 统一 AI 数据模型与供应商路由

**Files:**

- Modify: `apps/server/prisma/schema.prisma`
- Create: `apps/server/src/modules/ai/ai-job.service.ts`
- Create: `apps/server/src/modules/ai/ai-provider.service.ts`
- Create: `apps/server/src/modules/ai/ai.routes.ts`
- Create: `apps/web/src/types/ai-contract.ts`
- Create: `apps/web/src/services/ai.service.ts`

- [ ] **Step 1: 新增 Prisma 模型**

```prisma
model AiJob {
  id             String   @id @default(uuid())
  roomId          String?
  userId          String
  kind            String   // PREP_EXTRACT | SESSION_RECAP | CLUE_DRAFT | NPC_DRAFT | SCENE_DRAFT | IMAGE_ASSET | PLAYER_SUMMARY | KP_REMINDER | VOICE_RESERVED
  provider        String
  model           String?
  status          String   @default("PENDING") // PENDING | RUNNING | SUCCEEDED | FAILED | CANCELLED
  visibility      String   @default("KP_ONLY") // KP_ONLY | PUBLIC_DRAFT | PLAYER_PRIVATE
  inputSummary    String   @default("")
  outputJson      String   @default("{}")
  errorMessage    String?
  sourceRefs      String   @default("[]")
  costUnits       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([roomId, kind, createdAt])
  @@index([userId, createdAt])
  @@index([status])
}

model AiAsset {
  id             String   @id @default(uuid())
  roomId          String?
  userId          String
  jobId           String?
  assetType       String   // IMAGE | AUDIO_RESERVED | TEXT
  purpose         String   // NPC_AVATAR | SCENE_IMAGE | HANDOUT | NEWSPAPER | OLD_PHOTO | OCCULT_SYMBOL | VOICE_RESERVED
  title           String
  prompt          String   @default("")
  url             String?
  storagePath     String?
  mimeType        String?
  visibility      String   @default("KP_ONLY")
  linkedType      String?
  linkedId        String?
  approvalStatus  String   @default("DRAFT") // DRAFT | APPROVED | PUBLISHED | DISCARDED
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([roomId, assetType, createdAt])
  @@index([jobId])
}

model AiUsageLedger {
  id          String   @id @default(uuid())
  roomId      String?
  userId      String
  jobId       String?
  kind        String
  provider    String
  model       String?
  unitType    String   @default("TOKEN_OR_IMAGE") // TOKEN | IMAGE | RESERVED_AUDIO | MANUAL
  units       Int      @default(0)
  estimatedCostCents Int @default(0)
  providerRequestId String?
  createdAt   DateTime @default(now())

  @@index([roomId, createdAt])
  @@index([userId, createdAt])
}
```

- [ ] **Step 2: 供应商配置规则**

```text
语言模型主路由：
- DeepSeek V4 / V4.1 Flash：摘要、结构化提取、回顾、玩家公开摘要、低成本长上下文任务。
- Doubao-Seed-Character：NPC 口吻、角色化文本、招募文案、氛围描述、KP 可选草稿润色。

图像模型主路由：
- Seedream 4.5：NPC 头像、场景图、handout、报纸剪报、旧照片、神秘符号。

语音模型：
- 第一轮暂不接入，只保留 VOICE_RESERVED、AUDIO_RESERVED、voiceEnabled=false 和审计字段。

工程规则：
- provider adapter 输出统一 AiJob / AiAsset 结果。
- 默认模型由 ai-provider.service.ts 按 kind、成本策略和房间设置选择，不在 Prisma schema 里硬编码。
- 具体 modelId 不写死在业务代码里，通过环境变量或服务端配置表读取。
- V4.1 Flash 作为可配置 modelId 保留，实际可用性以供应商控制台为准。
```

- [ ] **Step 3: 设计状态机**

```text
PENDING -> RUNNING -> SUCCEEDED
PENDING -> RUNNING -> FAILED
PENDING -> CANCELLED
```

公开素材：

```text
DRAFT -> APPROVED -> PUBLISHED
DRAFT -> DISCARDED
```

- [ ] **Step 4: 可见性规则**

```text
KP_ONLY：只有 canUseKPTools 可见
PUBLIC_DRAFT：KP 可见，待公开确认
PLAYER_PRIVATE：指定玩家可见，不能读取 KP 私密上下文
```

### Task 21: AI 上下文过滤器

**Files:**

- Create: `apps/server/src/modules/ai/ai-context.service.ts`
- Modify: `apps/server/src/modules/rooms/investigation-log.service.ts`
- Modify: `apps/server/src/modules/rooms/kp-note.service.ts`

- [ ] **Step 1: 定义上下文类型**

```ts
type AiContextScope =
  | 'KP_ROOM_PRIVATE'
  | 'ROOM_PUBLIC'
  | 'PLAYER_VISIBLE';
```

- [ ] **Step 2: 过滤规则**

```text
KP_ROOM_PRIVATE：可读取公开内容 + KP 私密便签 + KP_ONLY 线索/NPC/场景
ROOM_PUBLIC：只读取 PUBLIC 线索、NPC、场景、日志、公告和当前目标
PLAYER_VISIBLE：读取 ROOM_PUBLIC + 当前玩家自己的角色绑定；第一版不读取私聊内容，未来如需私聊摘要必须单独设计授权和可见性规则
```

- [ ] **Step 3: 来源引用**

AI 输入必须附带 `sourceRefs`：

```json
[
  { "type": "clue", "id": "clue-id", "title": "线索标题" },
  { "type": "log", "id": "log-id", "title": "日志标题" }
]
```

所有摘要类输出必须保留这些引用，便于回查。

### Task 22: AI 备团副手与结构化提取

**Files:**

- Create: `apps/server/src/modules/ai/ai-prep.service.ts`
- Create: `apps/web/src/pages/rooms/components/AiPrepAssistantPanel.tsx`
- Modify: `apps/server/src/modules/rooms/investigation-board.routes.ts`

- [ ] **Step 1: 输入**

```text
KP 粘贴一段备团笔记、模组摘录或剧情整理。
```

- [ ] **Step 2: 模型路由**

```text
默认使用 DeepSeek V4 / V4.1 Flash 处理长上下文、结构化提取、低成本批量整理。
当输出重点是 NPC 口吻、招募文案、风格化氛围段落或角色语气时，切换 Doubao-Seed-Character。
所有模型输出都必须走同一套 schema 校验、来源引用和 KP 确认流程。
```

- [ ] **Step 3: 结构化输出 schema**

AI 输出必须符合：

```json
{
  "clueDrafts": [
    { "title": "string", "content": "string", "source": "string", "visibility": "KP_ONLY" }
  ],
  "npcDrafts": [
    { "name": "string", "publicProfile": "string", "keeperNotes": "string", "status": "UNSEEN" }
  ],
  "sceneDrafts": [
    { "title": "string", "publicSummary": "string", "keeperNotes": "string", "atmosphere": "normal" }
  ],
  "openQuestions": ["string"],
  "prepChecklist": ["string"]
}
```

- [ ] **Step 4: 写入规则**

```text
AI 输出先保存为 AiJob.outputJson
KP 可逐条选择“创建为线索 / NPC / 场景”
未确认条目不进入正式调查档案
```

### Task 23: AI 调查日志整理员

**Files:**

- Create: `apps/server/src/modules/ai/ai-recap.service.ts`
- Create: `apps/web/src/pages/rooms/components/AiRecapDraftPanel.tsx`
- Modify: `apps/server/src/modules/rooms/session-recap.service.ts`

- [ ] **Step 1: 输入范围**

```text
最近一次 session 的 PUBLIC 调查日志
公开线索变化
公开 NPC 变化
场景切换
关键骰点
KP 手动标记的重要事件
```

- [ ] **Step 2: 输出**

```json
{
  "sessionRecap": "string",
  "currentObjective": "string",
  "openQuestions": ["string"],
  "importantClues": ["string"],
  "playerActionHighlights": ["string"],
  "nextSessionPrep": ["string"]
}
```

- [ ] **Step 3: 规则**

```text
生成结果是回顾草稿
KP 确认后才能写入上次回顾 / 当前目标
PL 不可请求包含 KP_ONLY 信息的回顾
```

### Task 24: AI 玩家公开摘要

**Files:**

- Create: `apps/server/src/modules/ai/ai-player-summary.service.ts`
- Create: `apps/web/src/pages/rooms/components/AiPlayerSummaryPanel.tsx`

- [ ] **Step 1: 玩家问题**

第一版只允许固定问题，不开放任意聊天：

```text
我现在知道什么？
当前场景发生了什么？
有哪些公开线索？
这个 NPC 的公开信息是什么？
我下次开团前要看什么？
```

- [ ] **Step 2: 输出规则**

```text
只能基于 ROOM_PUBLIC 或 PLAYER_VISIBLE 上下文
回答必须列出信息来源
无法确定时说“不确定”，不能补剧情
```

### Task 25: AI 素材工坊（Seedream 4.5）

**Files:**

- Create: `apps/server/src/modules/ai/ai-asset.service.ts`
- Create: `apps/web/src/pages/rooms/components/AiAssetWorkshopPanel.tsx`
- Modify: `apps/server/src/modules/uploads/upload.routes.ts`

- [ ] **Step 1: 支持素材类型**

```text
NPC_AVATAR
SCENE_IMAGE
HANDOUT
NEWSPAPER_CLIPPING
OLD_PHOTO
OCCULT_SYMBOL
```

- [ ] **Step 2: 模型路由**

```text
provider = "volcengine" 或 "byteplus"
model = "seedream-4.5" 对应的实际 modelId
实际 modelId 从服务端配置读取，不写死在前端。
```

- [ ] **Step 3: 生成流程**

```text
KP 选择用途
KP 输入描述
系统补充沉没之城视觉风格约束
AI 生成候选素材
保存为 AiAsset，approvalStatus = DRAFT
KP 选择关联 NPC / 线索 / 场景
KP 手动公开或丢弃
```

- [ ] **Step 4: 安全限制**

```text
不生成真人冒充
不生成版权角色
不生成过度血腥内容
AI 生成素材必须标记来源
默认 KP_ONLY
```

### Task 26: 语音大模型后期预留

**Files:**

- Create: `apps/server/src/modules/ai/ai-voice-reserved.service.ts`
- Create: `apps/web/src/pages/rooms/components/AiVoiceReservedPanel.tsx`

- [ ] **Step 1: 明确首轮不接入**

```text
voiceEnabled = false
ttsEnabled = false
sttEnabled = false
realtimeVoiceEnabled = false
```

第一轮不调用语音供应商，不生成音频，不做转录，不接入语音房控制。

- [ ] **Step 2: 预留未来能力位**

```text
场景描述 -> 旁白音频
上次回顾 -> 回顾音频
NPC 信件 -> 朗读音频
语音转录 -> 可检索文字笔记
实时语音助手 -> 后续独立评估
```

- [ ] **Step 3: 隐私和成本前置条件**

```text
未来真正启用语音前必须具备：
- 房间级语音开关
- 成员明确同意录音 / 转录
- 音频保存期限
- 语音费用额度
- 删除和导出入口
```

### Task 27: AI KP 私密提醒

**Files:**

- Create: `apps/server/src/modules/ai/ai-kp-reminder.service.ts`
- Create: `apps/web/src/pages/rooms/components/AiKpReminderPanel.tsx`

- [ ] **Step 1: 提醒类型**

```text
某玩家很久没发言
关键线索还未公开
当前场景停留过久
玩家可能忽略了某条公开线索
可以推进到下一个场景
恐怖氛围可加强
```

- [ ] **Step 2: 限制**

```text
只给 KP 显示
不自动发言
不自动公开线索
不自动改变房间状态
可关闭
```

### Task 28: AI 用量、审计和开关

**Files:**

- Create: `apps/server/src/modules/ai/ai-settings.service.ts`
- Create: `apps/web/src/pages/rooms/components/AiRoomSettingsPanel.tsx`
- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: 房间级开关**

```text
允许 AI 备团副手
允许 AI 摘要
允许 AI 图片素材
语音能力预留状态（只读关闭，第一轮不可开启）
允许 KP 私密提醒
允许 PL 公开摘要
```

- [ ] **Step 2: 额度**

```text
每日房间任务数
每日用户任务数
图片生成次数
语音分钟数（预留，第一轮不计费）
```

- [ ] **Step 3: 审计**

每个 AI 任务记录：

```text
发起用户
房间
任务类型
输入摘要
输出状态
可见性
关联素材
错误信息
创建时间
```

## 13. AI 执行顺序

推荐 AI 迭代不要抢在基础档案系统之前：

1. 先完成 Phase 1 调查档案、日志、场景、NPC、KP 便签。
2. 再做 Task 20-21：统一 AI 数据模型和上下文过滤。
3. 再做 Task 22-23：备团副手和日志整理。
4. 再做 Task 24：PL 公开摘要。
5. 再做 Task 25：Seedream 4.5 素材工坊。
6. 再做 Task 26：语音能力后期预留，不接真实语音模型。
7. 最后做 Task 27-28：KP 私密提醒、用量、审计和开关。

原因：先有结构化档案，再让 AI 整理档案；先有日志，再让 AI 摘要；先有场景/NPC/线索，再让 AI 生成或补全素材。

## 14. AI 验收标准

- 所有 AI 输出默认是草稿。
- AI 公开内容必须人工确认。
- PL 请求永远不能读取 KP 私密内容。
- AI 输出必须保留来源引用或输入摘要。
- AI 不能自动改房间生命周期、角色卡、结算、骰点或战斗状态。
- AI 素材必须记录用途、提示词、可见性和审批状态。
- 语音大模型、TTS、STT 和实时语音第一版不接入，只保留能力位。
- 所有 AI 任务有用量记录和失败记录。

## 15. AI 风险控制

- 成本风险：DeepSeek V4 / V4.1 Flash、Doubao-Seed-Character 和 Seedream 4.5 都必须有房间级和用户级额度；首轮不产生语音费用。
- 幻觉风险：结构化输出仍可能内容不准，因此摘要必须绑定来源，且公开前人工确认。
- 泄密风险：上下文过滤器必须先于任何 AI 功能落地。
- 氛围风险：AI 文案不能替代 KP 主持，只能作为草稿或建议。
- 隐私风险：STT 语音转录暂不进入第一版；未来必须要求成员同意。

## 16. 验证策略

默认只做轻量验证：

```powershell
cd apps/server
npm run typecheck
```

```powershell
cd apps/web
npm run typecheck
```

可选窄范围检查：

```powershell
git diff --check
```

不主动执行：

- 全站 E2E
- 深度 Playwright
- 生产写入型冒烟
- 官方规则相关测试
- 未经确认的真实 AI 付费调用

## 17. 推荐执行顺序

1. 数据模型和后端路由骨架。
2. 线索板服务。
3. NPC 档案服务。
4. 场景服务和场景切换日志。
5. 调查日志服务。
6. KP 私密便签服务。
7. 前端 contract 和 service。
8. 房间页 InvestigationDock。
9. 五个面板的最小可用 UI。
10. 团前准备和当前目标。
11. 通知中心、公告、排期和参加确认。
12. 房间邀请。
13. 发言 / 行动轮候队列和准备检查。
14. 招募、报名、风格标签和新手引导。
15. AI 数据模型和上下文过滤。
16. AI 备团副手和日志整理。
17. AI 玩家公开摘要。
18. AI 素材工坊（Seedream 4.5）。
19. 语音能力后期预留。
20. AI KP 私密提醒、用量、审计和开关。
21. 窄范围 typecheck。

## 18. 验收标准

- KP 能在房间里管理线索、NPC、场景、日志和私密便签。
- PL / OBSERVER 只能看到公开内容。
- 线索公开、NPC 公开、场景切换会自动进入调查日志。
- KP 私密便签不会出现在 PL、OBSERVER、报告公开区。
- 房间页不再只依赖聊天流承载调查信息。
- KP 能设置下次开团时间，PL 能确认参加、请假或待定。
- 房间公告和关键变更能进入站内通知。
- KP 能邀请玩家，玩家能接受或拒绝。
- 房间招募能表达风格、人数、时间和新手友好程度。
- PL 能看到当前焦点，不再完全依赖聊天流判断现在该做什么。
- AI 可以帮助 KP 生成线索、NPC、场景、回顾和当前目标草稿，但不会自动公开。
- AI 可以生成 Seedream 4.5 图片素材，但默认私密、可审计、可丢弃。
- 语音大模型、TTS、STT 和实时语音后期再做，首轮只保留数据结构、开关和审计位。
- AI 玩家摘要严格遵守可见性边界。
- 不改现有房间生命周期、Socket、骰点和结算行为。
- 不碰后台 admin。
- 不提交 `outputs/`。

## 19. 交给 UI/UX 专项会话的边界

UI/UX 专项会话负责：

- InvestigationDock 的视觉层级。
- 移动端抽屉或底部 sheet 表现。
- PC KP 工作台中的信息布局。
- 线索、NPC、场景、日志的档案馆风格。
- 可读性、超宽屏和 Surface 间距。

本功能迭代会话负责：

- 数据模型。
- API。
- 权限。
- 房间生命周期边界。
- 最小可用交互。

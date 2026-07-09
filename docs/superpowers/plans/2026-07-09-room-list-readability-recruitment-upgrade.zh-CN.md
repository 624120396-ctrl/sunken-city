# 房间列表页可读性与招募接口预留优化计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化房间列表页，让房间卡片更易读、更有区分度；招募版块只保留清晰入口和接口位，后续接入独立招募系统。

**Architecture:** 保留现有 `PageShell / Surface / Button / DataCard` 体系，不重新发明页面框架。把房间卡片从 `RoomListPage.tsx` 中拆成更清晰的局部组件；招募入口作为独立系统的占位接口存在，不在本线展开招募列表业务。样式继续落在 `rooms.css`，并沿用 `tokens-v2.css` 与现有材质素材。

**Tech Stack:** React + TypeScript + Vite，现有系统组件，Lucide 图标，`apps/web/src/styles/rooms.css`。

## Global Constraints

- 真实仓库路径：`C:\Users\29102\Documents\沉没之城`。
- 不碰后台/admin。
- 不改后端业务逻辑、Socket、骰点、战斗、私聊、生命周期写回。
- 除非用户主动要求，不做深度测试。
- 延续房间系统视觉语言：偏白羊皮纸、深绿玄武岩、氧化铜金线、档案卡片、仪式感字体。
- 禁止黑色透明卡片、廉价大面积纹理、AI 味装饰。
- 中文字体优先思源宋体 / Source Han Serif；小号数字和标签优先可读。
- 招募系统将独立为全站功能，不只服务站内房间，也覆盖站外、线下、任意形式跑团招募；本计划不实现该系统，只保留连接入口。

---

## 现状判断

截图与代码显示当前页面的主要问题集中在两处，但本线边界已调整：

1. 房间卡片过于接近普通浅色纸卡，标题、房间号、状态、角色、人数、招募状态都被压在同一层级里，用户很难快速判断“我能不能进、我是什么身份、是否招募、是否进行中”。
2. 招募公告现在放在右侧栏第二块，只在有 `roomSummaries.recruitment.status` 时列出最多 4 条。它更像附属信息；但由于招募系统将独立出来，本线不再把它做成房间列表页内部主模块。

本次优化不扩大业务范围。重点是重做房间卡片的信息层级；招募只保留未来独立系统入口。

## 设计 Brief

**核心用户动作：** 用户进入故事书后，应能快速判断每个房间的状态、身份、人数、是否可进入，并能通过明确入口跳转到未来独立招募系统。

**视觉方向：** 继续使用“沉没档案室”。列表区是明亮档案纸，房间卡片更像独立卷宗，而不是普通网格卡片。招募入口是“公告栏入口”，不是当前页面内的完整招募版。

**信息优先级：**

1. 房间名称与房间号。
2. 我的身份与房间状态。
3. 人数、观察者、下一场时间、KP 待办。
4. 招募系统入口。

**交互范围：** 不新增后端能力；仅重新布局、拆组件、调整样式、保留点击进入房间/输入房间号/筛选搜索等既有行为。招募入口先指向预留函数或占位路由，后续由独立招募系统接管。

---

## File Structure

### Create

- `apps/web/src/pages/rooms/components/RoomListStoryCard.tsx`
  - 负责单张房间卡片的结构、标签分组、状态文案。

- `apps/web/src/pages/rooms/components/RoomListRecruitmentEntry.tsx`
  - 负责独立招募系统的入口占位，不承载当前房间列表内招募业务。

### Modify

- `apps/web/src/pages/rooms/RoomListPage.tsx`
  - 移除内联卡片结构。
  - 接入 `RoomListStoryCard` 与 `RoomListRecruitmentEntry`。
  - 调整右侧栏招募公告的职责：只作为未来独立招募系统的入口，不在本页展示站内房间招募列表。

- `apps/web/src/styles/rooms.css`
  - 增加房间卷宗卡片样式。
  - 增加招募公告主模块样式。
  - 优化标签、状态、角色、人数、时间、招募状态的颜色与排版。

### Read-only reference

- `docs/sunken-city-ui-design-reference.zh-CN.md`
- `docs/room-visual-material-library.zh-CN.md`
- `apps/web/src/styles/tokens-v2.css`
- `apps/web/src/styles/system-v2.css`

---

## Task 1: 预留独立招募系统入口

**Files:**

- Create: `apps/web/src/pages/rooms/components/RoomListRecruitmentEntry.tsx`
- Modify: `apps/web/src/pages/rooms/RoomListPage.tsx`
- Modify: `apps/web/src/styles/rooms.css`

**Interfaces:**

- Consumes:
  - optional `onOpenRecruitmentHub: () => void`
- Produces:
  - `room-library-recruitment-entry`
  - `room-library-recruitment-entry__action`

**Plan:**

- [ ] 移除或弱化当前右侧栏内基于 `roomSummaries.recruitment` 的站内招募列表展示。
- [ ] 新建 `RoomListRecruitmentEntry.tsx`，只展示“跑团招募”入口说明。
- [ ] 文案明确：未来招募系统支持站内、站外、线下等任意跑团招募。
- [ ] 按钮先接入占位处理：如果正式路由未存在，点击可暂时跳转到预留路径或保持禁用说明，不能误导用户以为功能已完整上线。
- [ ] 预留接口命名，例如 `onOpenRecruitmentHub`，后续独立招募系统完成后直接替换跳转逻辑。

**Design details:**

- 招募入口可以放在右侧栏靠前位置，但不进入主房间卡片列表。
- 样式像“公告栏入口”，不是当前页面内完整招募市场。
- 使用深色工具台或浅色告示纸都可以，但必须和房间列表页材质同源。
- 不展示“暂无公开招募中的房间”作为最终态，因为未来招募不等于站内房间招募。

**Acceptance:**

- 房间列表页不再把招募误表达为“站内房间附属功能”。
- 页面上有明确、克制的招募系统入口位。
- 后续独立招募系统上线时，只需替换入口跳转，不需要重构房间卡片。

---

## Task 2: 重做房间卡片为“故事卷宗”结构

**Files:**

- Create: `apps/web/src/pages/rooms/components/RoomListStoryCard.tsx`
- Modify: `apps/web/src/pages/rooms/RoomListPage.tsx`
- Modify: `apps/web/src/styles/rooms.css`

**Interfaces:**

- Consumes:
  - `RoomListItem`
  - optional `RoomListOverviewItem`
  - `onOpen(roomId: string)`
- Produces:
  - `room-library-story-card`
  - `room-library-story-card__header`
  - `room-library-story-card__badges`
  - `room-library-story-card__footer`

**Plan:**

- [ ] 把当前 `ActionCard` 内联结构迁移到 `RoomListStoryCard`，避免 `RoomListPage.tsx` 继续膨胀。
- [ ] 卡片顶部改为三段式：
  - 左：身份图标章，区分主持/参与/观察/普通。
  - 中：房间名 + 房间号。
  - 右：生命周期状态章。
- [ ] 卡片正文只放房间简介，颜色加深，行高提高，最多两行。
- [ ] 卡片底部放结构化信息：
  - 我的身份。
  - 人数。
  - 观察者。
  - 下一场时间。
  - 招募状态。
  - KP 待办。
- [ ] “进入房间”改为清晰的右下角动作区，避免和 meta 信息混在一起。

**Design details:**

- 不使用粗侧边条，避免变成廉价状态条。
- 用顶部状态章、全卡边框色、角落小印章表达不同状态。
- 主持：暗金。
- 参与：海绿。
- 观察：氧化铜/灰金。
- 已结团：低饱和血红。
- 招募中：金色 + 轻微高亮。
- 准备中/进行中/已结团分别使用不同图标和底色。

**Acceptance:**

- 一眼能看出房间名、我的身份、房间状态。
- 标签不再全部长得一样。
- 卡片仍然属于沉没档案室材质，不变成普通 SaaS 卡片。

---

## Task 3: 统一标签系统，让状态更容易区分

**Files:**

- Modify: `apps/web/src/pages/rooms/components/RoomListStoryCard.tsx`
- Modify: `apps/web/src/pages/rooms/components/RoomListRecruitmentEntry.tsx`
- Modify: `apps/web/src/styles/rooms.css`

**Interfaces:**

- Produces:
  - `room-library-badge`
  - `room-library-badge[data-tone="gold"]`
  - `room-library-badge[data-tone="ocean"]`
  - `room-library-badge[data-tone="copper"]`
  - `room-library-badge[data-tone="blood"]`
  - `room-library-badge[data-tone="muted"]`

**Plan:**

- [ ] 建立统一 badge class，不再让标签都只是普通 inline text。
- [ ] 生命周期标签使用固定 tone：
  - 准备中：gold。
  - 进行中：ocean。
  - 已结团：muted/blood。
- [ ] 角色标签使用固定 tone：
  - KP/主持：gold。
  - 玩家/参与：ocean。
  - 观察：copper。
- [ ] 招募入口标签只使用固定 tone：
  - 跑团招募：gold。
  - 即将开放/独立系统：muted。
- [ ] 所有 badge 保持同一高度、圆角、字体大小、图标尺寸。

**Design details:**

- badge 背景透明度要低，文字对比要高。
- 不使用过亮纯色块。
- 标签内容短而稳定，避免撑破卡片。

**Acceptance:**

- 角色、生命周期、招募、时间、人数可以被快速扫读。
- 标签既有差异，又不破坏整体材质风格。

---

## Task 4: 调整列表密度与右侧栏主次

**Files:**

- Modify: `apps/web/src/pages/rooms/RoomListPage.tsx`
- Modify: `apps/web/src/styles/rooms.css`

**Plan:**

- [ ] 主内容区保留三列卡片，但卡片内部信息更有层级。
- [ ] 在 1600px 以上保持三列；中等桌面两列；移动端一列。
- [ ] 右侧栏顺序调整为：
  1. 快速进入。
  2. 跑团招募入口。
  3. 当前索引。
  4. 报告归档。
- [ ] 右侧招募模块不再承担站内房间招募展示，只承担独立招募系统入口说明。
- [ ] 搜索与筛选条保持现有位置，但筛选按钮增加状态数字可作为后续增强，不作为本轮必须项。

**Acceptance:**

- 首屏先看到招募公告和房间列表，而不是被右侧信息分散。
- 右侧栏仍有用，但不抢主路径。

---

## Task 5: 轻量验证与视觉审计

**Files:**

- No source files required beyond Tasks 1-4.

**Plan:**

- [ ] 运行轻量类型检查：
  - `pnpm --filter @sunken-city/web typecheck`
- [ ] 打开房间列表页，检查：
  - 招募入口是否明确但不抢占房间列表主路径。
  - 房间卡片标题、状态、身份、人数是否清晰。
  - 标签颜色是否能区分且不刺眼。
  - 招募入口是否没有误导用户以为站内招募功能已完整上线。
  - 1366px、1920px 两档宽度下是否不重叠。
- [ ] 如用户要求，再截图给用户确认。

**Acceptance:**

- 不做深度测试。
- 不触碰后端。
- 没有文本溢出、标签混乱、按钮不可识别。

---

## 推荐执行顺序

1. 先做 Task 1，把招募从站内房间附属列表改成独立系统入口位。
2. 再做 Task 2，把房间卡片结构拆出来并重排。
3. 然后做 Task 3，用统一 badge 解决标签难区分。
4. 最后做 Task 4 的密度和右侧栏微调。
5. 只跑 Task 5 的轻量验证。

## Product Design / impeccable 注意事项

- 当前 `impeccable` 上下文脚本报告 `apps/web` 下没有 `PRODUCT.md`。本计划先不新增产品总文档，因为用户本轮要求是房间列表页局部优化计划，不是建立全项目设计上下文。
- 如果后续要长期使用 `$impeccable craft/polish/live`，建议单独补 `PRODUCT.md` 和 `DESIGN.md`，避免每次都需要从代码反推产品语境。
- 本次优化必须沿用现有 `docs/sunken-city-ui-design-reference.zh-CN.md`，不要另起视觉风格。
- 招募系统独立化后，应另开产品/页面规划：它不只服务站内跑团，也应支持站外、线下、任意形式跑团招募。

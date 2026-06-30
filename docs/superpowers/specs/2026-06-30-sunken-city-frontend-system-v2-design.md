# 沉没之城前端系统 v2 设计规格

日期: 2026-06-30
状态: 待用户审阅
范围: `apps/web`

## 1. 背景

沉没之城当前前端已经具备明确的 COC 氛围、黑金视觉、深海背景、房间跑团、角色卡、论坛、市场、背包、商店、管理后台等完整功能。问题不在于缺少单个页面装饰，而在于前端系统经过多个版本叠加后缺少稳定的设计骨架。

当前主要问题来自三层:

1. 视觉层: 背景图过强，浅色背景与深色卡片混用，文字对比和字号不足，宽屏空间组织松散。
2. 架构层: `styles/index.css` 约 1200 行，混合多个版本的 token、组件类、内容区覆盖、导航、氛围主题和质感系统。
3. 组件层: Card、Button、Surface、List、Tab、Dialog 等基础范式不统一，页面各自维护样式，导致后续升级会持续放大成本。

本规格采用“设计系统优先”路线: 先建立沉没之城前端系统 v2，再逐步迁移页面。

## 2. 本轮目标

建立一套可长期演进的前端系统，而不是一次性重画全站。

目标包括:

- 统一全局布局: 顶栏、侧栏、内容区、背景层、移动端导航。
- 统一视觉 token: 色彩、字体、间距、圆角、边框、阴影、动效、层级。
- 统一核心组件: Surface、Card、Button、Input、Tabs、List、Stat、Modal、Toast、EmptyState、Skeleton。
- 优先提升可读性和可用性: 跑团平台需要长时间阅读、操作、比对信息，文本和控件必须清晰。
- 保留沉没之城的“深海旧日、黑金仪式、调查档案”气质，但降低装饰对内容的干扰。
- 通过页面迁移验证系统: 首页、故事书/房间列表、市场/旧日低语、调查员、房间内界面。
- 首页继续保留“我的调查员”，并保留当前调查员卡片的展示效果作为视觉基准。

## 3. 非目标

本阶段不做以下工作:

- 不重写后端 API。
- 不改 Socket.io 事件协议。
- 不改 COC7e 角色卡计算、骰子判定、战斗规则。
- 不处理 Project Lunar。
- 不把 `solo` / 幻影脚本作为本轮升级目标。
- 不删除生产数据库、上传文件或历史用户数据。
- 不用全站大重构替代渐进迁移。

## 4. 数据与附件保护红线

当前沉没之城处于暂停运营状态，可以采用比在线运营期更激进的前端重构策略。但“激进”只适用于前端代码、样式、组件、路由壳和构建流程，不适用于生产数据。

硬性红线:

- 生产 SQLite 数据库必须保留，不能被本地开发数据库覆盖。
- 用户、角色卡、房间、论坛、背包、市场、上传记录等生产数据不能丢失。
- `uploads/` 附件目录必须保留，不能被 `rsync --delete` 或 `cp -r dist/*` 清空。
- `.env`、API key、JWT secret 不进入 Git。
- 任何涉及数据库结构、生产部署、附件目录的操作前必须先备份。

生产保护对象:

- 数据库: `/opt/coc-platform-data/dev.db`
- 附件: `/opt/coc-platform/apps/server/public/uploads/`
- 生产环境变量: `/opt/coc-platform/apps/server/.env`

建议前端重构前置动作:

1. 备份 `/opt/coc-platform-data/dev.db`。
2. 备份 `/opt/coc-platform/apps/server/public/uploads/`。
3. 确认部署脚本排除 `.env`、数据库和 uploads。
4. 确认 Git 状态中不包含 `dev.db`、`.env`、`public/assets` 旧构建产物。

## 5. 设计原则

### 5.1 内容优先于背景

背景图只负责提供氛围，不应承担主要信息表达。所有页面必须有稳定的内容承载层，文字不能直接压在高对比背景上。

设计规则:

- 背景图统一进入 Background Layer。
- 背景选择是正式用户能力，不是临时装饰。
- 主内容使用 Surface Layer。
- 强内容区使用 Solid Surface，不使用过度透明玻璃。
- 需要沉浸感的页面可以降低内容层不透明度，但文本区域仍需保证对比。

### 5.2 黑金克制，不做满屏装饰

金色只作为强调色，用于主行动、重点数据、稀有度、当前选中、仪式感标题。避免所有边框、所有按钮、所有卡片都发光。

### 5.3 宽屏要服务跑团工作流

当前截图显示宽屏下大量内容集中在中间或左侧，右侧空白明显。新布局应支持信息分栏:

- 主页: 左侧行动入口，中部角色/房间状态，右侧公告/活动/快捷操作。
- 房间列表: 房间卡片与筛选/创建/最近活动并列。
- 房间内: 成员、聊天、场景、操作抽屉按任务组织。

### 5.4 统一组件，不继续扩展全局覆盖链

新增页面和迁移页面必须使用 v2 组件，不再直接组合旧 `.coc-card`、`.card-layer-2`、`.coc-card-v2`、`.content-area ... !important` 覆盖链。

### 5.5 高风险逻辑视觉外包裹

RoomPage、角色卡创建、骰子、战斗、上传、论坛编辑器是高风险区域。第一阶段只能替换它们的页面壳、布局容器、视觉组件外层，不改事件、数据结构和核心计算。

### 5.6 暂停运营期允许更激进的前端切换

因为当前无在线用户使用，本轮可以采用更激进的前端升级安排:

- 可以建立新 AppShell 后批量迁移低风险页面。
- 可以较早拆分 `styles/index.css`，不必长期兼容所有旧样式路径。
- 可以从导航中隐藏或弱化已迁出的 `solo` / `scenarios` 入口。
- 可以删除或隔离未引用的旧 UI 样式，但必须先确认引用关系。
- 可以在本地 staging 分支完成较大视觉切换，再一次性部署。

限制:

- 仍然不能覆盖生产数据库和附件。
- 仍然不能改 Socket 协议、骰子规则、战斗逻辑、角色卡计算。
- 仍然需要构建前备份和部署后回滚路径。

## 6. 视觉方向

关键词:

- 深海旧日
- 调查档案
- 黑金仪式
- 克制玻璃
- 高可读信息面板
- PC 端更酷炫、更沉浸
- 移动端房间优先、参与游戏优先

视觉参考来自当前截图，而非推翻重做:

- 保留侧边栏黑色石纹、红金选中态、沉没城市背景。
- 保留仪式感标题字体和金色重点信息。
- 降低背景亮度和饱和度，避免浅背景冲淡黑色卡片。
- 引入更清晰的信息面板与列表层级。

PC 端可以承担更强视觉表现:

- 完整品牌 logo、深海大背景、动态雾化、卡片悬浮、局部粒子、房间剧场感。
- 宽屏工作台布局，允许多面板并置。
- 首页和房间页可以有更强的世界观包装。

移动端必须克制:

- 以进入房间、看消息、发言、投骰、查看角色状态为主。
- 背景和动效降级，避免压低阅读效率。
- 不把 PC 的多面板硬缩到手机上。

## 7. 品牌资产

本轮确认两份正式品牌资产:

- Logo: `C:\Users\29102\Downloads\yasuo-cmlogo(1)2(1).png`
- Website icon: `C:\Users\29102\Downloads\cmicon1.png`

当前设计样稿:

- `docs/superpowers/assets/sunken-city-ui-v2-pc-mobile-concept.png`
- 用途: 表达 PC 端沉浸酷炫、移动端房间优先的双端方向。
- 约束: 样稿用于方向确认，不代表最终逐像素实现；真实实现必须使用正式 logo/icon 资源。

Logo 视觉特征:

- 金属质感中文“沉没之城”字标。
- 中央红色晶体作为高识别记忆点。
- 白色描边和尖锐字体结构，适合旧日、仪式、危险感。

Icon 视觉特征:

- 黑金圆角图标。
- 中央章鱼/旧日生物剪影。
- 红色菱形点缀与 logo 的红色晶体形成呼应。

使用规则:

- PC 顶栏和登录页可使用完整 logo。
- 桌面侧栏折叠态、浏览器 favicon、移动端顶栏和 PWA/快捷入口优先使用 icon。
- Logo 不应被压到过小尺寸；小于 160px 宽时改用 icon 或简化品牌文字。
- Icon 可作为加载态、空状态、站点标识和移动端房间入口的品牌锚点。
- 不重新设计 logo，不做近似替代，不用文字手写替代品牌资产。

建议进入项目后的规范路径:

- `apps/web/public/logo.png`
- `apps/web/public/favicon.png`
- `apps/web/public/app-icon.png`
- `apps/server/public/logo.png`
- `apps/server/public/favicon.png`

如需替换生产资源，必须保留原文件备份，且不得影响 uploads。

## 8. Token 系统

### 8.1 色彩

建议建立 CSS variables，并通过 Tailwind 映射。

基础色:

- `--coc-bg-abyss`: 最深全局背景。
- `--coc-bg-page`: 页面遮罩后的背景。
- `--coc-surface-0`: 顶栏/侧栏深色表面。
- `--coc-surface-1`: 普通卡片。
- `--coc-surface-2`: 强内容面板。
- `--coc-surface-muted`: 次级面板。
- `--coc-border-subtle`: 默认边框。
- `--coc-border-strong`: 强边框。

语义色:

- `--coc-accent-gold`: 主要强调。
- `--coc-accent-blood`: 危险、战斗、重要操作。
- `--coc-accent-madness`: SAN、神秘、异常状态。
- `--coc-accent-ocean`: 信息、链接、探索。
- `--coc-success`: 成功、在线。
- `--coc-warning`: 警告、待处理。
- `--coc-danger`: 删除、离开、失败。

文字色:

- `--coc-text-primary`: 主文本。
- `--coc-text-secondary`: 次文本。
- `--coc-text-muted`: 辅助说明。
- `--coc-text-inverse`: 浅底深字时使用。
- `--coc-text-gold`: 金色强调文本。

规则:

- 正文对比至少满足 4.5:1。
- 图标和次级文字至少满足 3:1。
- 不用颜色作为唯一状态表达，必须配合文本、图标或形态。

### 8.2 字体

保留现有字体分工，但收敛使用方式:

- 标题: `font-ritual`，用于页面标题、房间名、仪式感标签。
- 正文: `font-body`，用于长文、表单、说明、聊天。
- 数据: `font-mono` 或 `font-geist`，用于 HP/SAN/金币/骰点/时间。
- 手写: `font-whisper`，只用于低语、手札、特殊氛围，不用于主要 UI。

字号基线:

- 页面标题: 24-32px。
- 区块标题: 18-20px。
- 正文: 14-16px。
- 辅助说明: 12-13px。
- 按钮/标签: 13-14px。

禁止继续使用大量 10-11px 文本承载核心信息。

### 8.3 间距与尺寸

采用 4px/8px 间距节奏:

- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px
- `space-6`: 24px
- `space-8`: 32px

核心点击目标:

- 桌面按钮高度不低于 36px。
- 移动端触控目标不低于 44px。
- 图标按钮必须有可点击面积和可访问标签。

### 8.4 圆角与边框

沉没之城不应使用过度圆润的 SaaS 风格。

- 小控件: 4px。
- 卡片/面板: 6px 或 8px。
- 大型剧场容器: 8px。
- 弹窗: 8px。

边框应以低透明度金色、深灰、血红状态线表达，不做全卡片高亮描边。

### 8.5 动效

动效服务状态和空间关系，不做纯装饰堆叠。

规则:

- 微交互 150-250ms。
- 页面切换 220-320ms。
- 不动画宽高，优先 transform 和 opacity。
- 支持 `prefers-reduced-motion`。
- 入场可轻微 stagger，但不要让列表逐项慢速播放。

## 9. 全局布局系统

### 9.1 AppShell v2

新系统以 `AppShell` 为核心:

- 左侧: `SideNav`
- 顶部: `TopBar`
- 背景: `AppBackground`
- 主体: `MainSurface`
- 移动端: `MobileNav`

`AppShell` 只管理空间、背景和导航，不持有业务逻辑。

### 9.2 Background Layer

背景层负责:

- 加载用户偏好背景。
- 保存用户选择。
- 在当前背景加载失败时回退默认背景。
- 统一暗角、模糊、遮罩、色温。
- 提供页面级氛围变量。

建议拆出:

- `AppBackground.tsx`
- `BackgroundPicker.tsx`
- `background.css`
- `backgroundTokens.ts`

页面不再直接写 body 背景或额外 fixed 伪元素。

用户背景能力:

- 保留当前多背景选择器。
- 入口放在个人设置或用户菜单下，不放在首页主内容区。
- 每张背景必须有缩略图、名称、选中态和加载失败降级。
- 背景选择只改变背景层，不应破坏页面可读性。
- 默认背景可以继续使用 `bg-sunken`，但 v2 必须通过遮罩和 Surface 降低背景干扰。
- 背景偏好沿用现有 `user.preferredBackground` 数据，不改字段语义。

当前背景候选:

- 羊皮纸
- 沉没之城
- 深海蓝
- 废墟米
- 深海遗迹
- 水下城邦
- 虚空符文

### 9.3 Surface Layer

所有内容必须放在 Surface 上。

Surface variant:

- `base`: 普通页面区域。
- `panel`: 深色信息面板。
- `elevated`: 浮层、弹窗、菜单。
- `glass`: 轻玻璃，仅用于非核心短信息。
- `solid`: 核心长文和表单。
- `danger`: 危险确认。

### 9.4 导航

侧边栏保留现有垂直结构，但需要:

- 明确当前选中。
- 支持折叠状态。
- 图标和文字对齐。
- 去除过亮红色大面积发光，只保留当前页高亮。
- 移动端使用底部导航或抽屉，不把桌面侧栏硬塞到小屏。

顶栏负责:

- 全局搜索。
- 通知。
- 用户入口。
- 快捷命令入口。

顶栏不得与页面标题争抢主视觉。

## 10. 核心组件系统

### 10.1 Surface

所有卡片和页面面板的基础。

Props:

- `variant`: `base | panel | elevated | glass | solid | danger`
- `tone`: `neutral | gold | blood | ocean | madness`
- `padding`: `none | sm | md | lg`
- `interactive`: boolean

### 10.2 Card

替代旧 `.coc-card` 系列。

Variant:

- `default`: 普通内容。
- `featured`: 首页重点入口。
- `room`: 房间/故事卡。
- `character`: 调查员卡。
- `item`: 市场/背包物品。
- `log`: 论坛/旧日低语条目。

Card 不直接决定页面栅格，只负责自身结构和状态。

调查员卡片规则:

- 首页“我的调查员”必须保留。
- 当前调查员卡片的人物立绘、暗色卡面、HP/SAN 状态条、角色名和身份展示效果用户满意，应作为 v2 `CharacterCard` 的基准。
- v2 可以优化间距、响应式、可读性和状态 token，但不应推翻现有卡片气质。
- 在 Dashboard 中，调查员卡片应作为用户当前身份锚点，而不是被入口卡片或背景装饰挤掉。

### 10.3 Button

替代 `.coc-btn-*` 和零散按钮类。

Variant:

- `primary`: 主行动，金色。
- `secondary`: 次行动，深色。
- `danger`: 危险操作，血红。
- `ghost`: 工具栏/轻按钮。
- `icon`: 图标按钮。

State:

- default
- hover
- active
- focus-visible
- disabled
- loading

### 10.4 Tabs 与 Segmented Control

用于故事书、市场分类、角色卡详情页。

规则:

- Tabs 用于页面级内容切换。
- Segmented Control 用于同一数据视图内的过滤。
- 选中态使用金色底/边，不使用过强发光。

### 10.5 List 与 Data Row

用于论坛、旧日低语、房间活动、通知。

需要支持:

- 标题
- 元信息
- 状态标签
- 计数
- 右侧行动
- 空状态
- 骨架屏

### 10.6 Stat

用于角色属性、金币、SAN、HP、房间人数、帖子数量。

规则:

- 数字使用数据字体。
- 状态色必须语义化。
- 高密度页面中 stat 不能占用过大视觉权重。

### 10.7 Modal / Drawer / Popover

统一层级和遮罩:

- Modal: 阻塞性决策。
- Drawer: 辅助面板，例如 KP 工具、筛选、详情。
- Popover: 小型菜单、更多操作。

所有浮层必须:

- 可 Escape 关闭。
- 有焦点管理。
- 有明确标题。
- 遮罩不与氛围主题伪元素冲突。

## 11. 页面迁移顺序

### Phase 0: 准备与安全清理

目标:

- 先备份生产数据库和 uploads。
- 修复部署脚本清理 `public/assets` 旧构建产物。
- 确认 `solo` / Project Lunar 迁出策略，暂不在导航中强化入口。
- 建立 v2 token 与组件目录，不替换全站。
- 明确回滚方式: 前端代码可回滚到上一 Git 提交，生产数据不参与回滚覆盖。

建议文件:

- `apps/web/src/styles/tokens.css`
- `apps/web/src/styles/background.css`
- `apps/web/src/components/system/`
- `apps/web/src/components/layout/AppShellV2.tsx`

### Phase 1: 设计系统骨架

目标:

- 建立 `Surface`、`Card`、`Button`、`Tabs`、`ListRow`、`Stat`、`EmptyState`、`Skeleton`。
- 拆出背景层和内容层。
- 主布局使用新 AppShell 但保持旧路由。
- 保留并升级 BackgroundPicker。

不碰:

- Socket 事件。
- 角色卡规则。
- 战斗状态机。
- 后端 API。

### Phase 2: 低风险页面迁移

优先页面:

1. Dashboard 首页
2. RoomList 故事书/房间列表
3. Shop / Market 市场与背包入口
4. ForumList / ForumBoard 旧日低语列表
5. CharacterList 调查员列表

目标:

- 用 v2 组件替换旧卡片和按钮。
- 验证宽屏布局。
- 验证移动端基本可用。

### Phase 3: 中风险页面迁移

页面:

- CharacterDetail
- Inventory
- Ranks / Titles
- ForumPost / ForumNewPost
- AdminLayout 外壳

策略:

- 只重构视觉结构。
- 对 TipTap、上传、管理数据操作保守处理。

### Phase 4: 房间内界面升级

RoomPage 是最高价值路径，但必须最后进入。

升级目标:

- 左侧成员/角色状态可读。
- 主聊天/场景信息清晰。
- KP 操作、骰子、战斗、私聊、线索进入抽屉或工具栏。
- 输入区固定、可访问、状态明确。

限制:

- 不改 Socket 事件名。
- 不改消息数据结构。
- 不改投骰成功度算法。
- 不改战斗回合逻辑。

### Phase 5: CSS 债务收敛

当核心页面迁移稳定后:

- 拆分 `styles/index.css`。
- 移除 `.content-area ... !important` 覆盖链。
- 移除过时 v1/v1.7/v2.1 冗余类。
- 删除未引用 UI 组件。

## 12. 更激进的执行安排

暂停运营期可以把原计划压缩为更少批次:

1. 先做数据与附件备份、部署脚本保护、v2 token 和基础组件。
2. 同一轮完成 AppShell v2、背景层、移动端导航和 Dashboard 样板页。
3. 第二轮批量迁移 RoomList、CharacterList、Market、ForumList。
4. 第三轮处理 CSS 拆分和旧全局样式删除。
5. 最后进入 RoomPage 外壳升级。

这样可以减少新旧系统长期并存造成的样式冲突。代价是每轮改动更大，因此每轮都必须保留可回滚提交点。

## 13. 高危边界

### 不直接重写

- `pages/rooms/RoomPage.tsx`
- `hooks/useSocket.ts`
- `components/room/DiceTheater.tsx`
- `components/room/QuickRollBar.tsx`
- `hooks/useCombat.ts`
- `pages/characters/CharacterCreateV2Page.tsx`
- `services/upload.service.ts`
- TipTap 编辑器配置

### 可先包裹后替换

- `MainLayout.tsx`
- `TopNav.tsx`
- `DashboardPage.tsx`
- `RoomListPage.tsx`
- `ShopPage.tsx`
- `RelicMarketPage.tsx`
- `ForumListPage.tsx`
- `CharacterListPage.tsx`

## 14. 资源与性能要求

- 背景图预加载失败必须降级。
- 大背景只在背景层加载，不在页面重复加载。
- 背景缩略图应使用小图或压缩图，不直接加载完整大图。
- 非首屏图片 lazy load。
- 列表页保留骨架屏和空状态。
- 旧 Vite assets 在部署时清理。
- Google Fonts 后续应优化为 `preconnect` + `font-display` 或本地化策略。

## 15. 移动端访问策略

断点:

- `sm`: 375px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1440px
- `2xl`: 1920px

移动端不是 PC 端缩小版，而是“房间优先的参团客户端”。策略是“房间参与优先，其他功能可访问但降级”:

1. 第一优先级: 登录、进入房间、房间列表、房间内参与。
2. 第二优先级: 查看当前调查员、HP/SAN/MP/Luck、快速投骰、线索查看、私聊/公开发言。
3. 第三优先级: 论坛、市场、背包、个人资料，保证可访问即可，不追求 PC 端完整酷炫体验。
4. 复杂页面改为单列主流程，次要面板进入抽屉或折叠区。
5. 房间内移动端不追求桌面同屏信息量，优先保证聊天、投骰、成员状态、KP/玩家核心操作可用。
6. 房间页底部固定输入区，旁边提供骰子、角色状态、更多工具入口。
7. 成员列表、线索、战斗、KP 工具进入底部 Sheet 或侧向 Drawer。
8. 移动端默认使用 icon 品牌，不强塞完整 logo。
9. 背景在移动端进一步弱化，减少固定大图导致的性能和可读性问题。
10. 所有主要按钮和图标按钮触控目标不低于 44px。
11. 不禁止缩放，不制造横向滚动。

桌面:

- 侧栏固定。
- 顶栏固定。
- 主内容最大宽度按页面类型控制，不一律居中窄容器。

移动端:

- 侧栏变抽屉或底部导航。
- 主要按钮触控目标不低于 44px。
- 列表单列。
- 背景弱化，内容优先。

## 16. 可访问性要求

- 所有图标按钮必须有 `aria-label`。
- 所有表单字段必须有可见 label 或明确辅助文本。
- focus-visible 必须可见。
- 弹窗必须处理 Escape 和焦点回收。
- Toast 使用 aria-live。
- 不依赖颜色表达唯一状态。

## 17. 第一阶段验收标准

Phase 1 完成时必须满足:

- 已确认生产数据库与 uploads 备份流程。
- 新 token 文件存在，并能被 Tailwind/全局 CSS 使用。
- Logo 与 icon 进入明确资源规范，不再散落引用。
- 新 `Surface`、`Card`、`Button`、`Tabs`、`ListRow`、`Stat` 组件可用。
- AppShell v2 能承载现有页面，不破坏路由。
- BackgroundPicker 保留并使用 v2 背景层，入口位于个人设置或用户菜单。
- Dashboard 或 RoomList 至少一个页面完成 v2 迁移样板。
- Dashboard 保留“我的调查员”，并沿用当前调查员卡片展示效果。
- 不修改 Socket、角色卡计算、骰子、战斗逻辑。
- `npm run typecheck` 或等价类型检查通过。
- 仅做用户要求的轻量验证，不进行深度测试。

## 18. 打开问题

1. 是否在第一阶段从导航中隐藏或弱化 `/solo` 与 `/scenarios`。
2. 是否要为新系统引入组件文档页面，替代正式 Storybook。
3. RoomPage 升级前是否先修复 `socket.service.ts` 空实现。
4. 背景默认值是否继续使用 `沉没之城`，或改为更暗但仍可由用户切换的默认背景。

## 19. 推荐下一步

下一步进入实现计划阶段，建议计划拆成三个小批次:

1. 保护线: 备份数据库和 uploads，修复部署清理规则。
2. 设计系统基础: token、Surface、Button、Card、ListRow、Tabs、Stat。
3. 品牌资产接入: logo/icon 路径规范、顶栏/侧栏/移动端使用规则。
4. AppShell 与背景层: AppShell v2、Background Layer、TopNav/SideNav/MobileNav 适配；BackgroundPicker 放入个人设置。
5. 首个样板页: Dashboard 或 RoomList 二选一。

推荐首个样板页为 Dashboard，因为它展示性强、风险低、能快速验证视觉系统。Dashboard 样板必须保留“我的调查员”区域，并以当前调查员卡片为设计基准。

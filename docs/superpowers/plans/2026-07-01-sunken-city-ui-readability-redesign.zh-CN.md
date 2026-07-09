# 沉没之城 UI/UX 可读性基础实施方案

> **执行要求：** 本文档现在作为前端 UI/UX 的可读性基础边界。后续视觉主方向以 `2026-07-04-sunken-city-luminous-archive-visual-upgrade.zh-CN.md` 为准；image2 资产生产与入库以 `2026-07-04-sunken-city-ui-asset-pipeline.zh-CN.md` 为准。实施时推荐使用 `superpowers:subagent-driven-development` 或 `superpowers:executing-plans` 逐阶段推进。每一阶段都必须形成独立提交、可截图验收、可回滚。除非用户主动要求，不进行深度测试。

**版本日期：** 2026-07-01  
**项目：** 沉没之城 / Sunken City  
**当前阶段：** 前端 UI/UX v2 重构中  
**核心问题：** 旧界面依赖全局暗色遮罩保证可读性；当背景允许用户选择明亮/暗色风格后，页面可读性、层级和视觉一致性同时失效。  
**核心策略：** 背景层只负责氛围，Surface 层负责可读性，页面壳负责信息结构，组件系统负责一致交互。

**2026-07-04 更新：** 用户已确认“更明亮的深海秘仪档案馆”视觉稿作为后续迭代方向。执行顺序从“先做可读性系统再迁移页面”调整为“先做官方内置 image2 纹理资产与材质化 Surface，再迁移页面”。本文件保留背景档位、权限边界、移动端优先级和轻量验收规则，不再单独决定页面迁移顺序。

---

## 0. 方法来源与插件/技能分工

本方案按 4 个已指定插件/技能共同约束整理：

| 来源 | 在本文档中的作用 | 落地结果 |
| --- | --- | --- |
| `product-design` | 定义产品目标、关键用户、核心旅程与可验收体验 | PC/KP 与移动端/PL 分层；房间聊天与骰点优先；页面按任务流重排 |
| `creative-production` | 建立视觉路线与氛围关键词 | “更明亮的深海秘仪档案馆”：深海冷雾、明亮档案纸、浅色湿石、氧化铜边框、克制金色仪式感、非纯黑克苏鲁 |
| `superpowers` | 将设计判断转化为可执行工程计划 | 分阶段、可提交、可回滚、可截图验收；禁止无授权深度测试 |
| `ui-ux-pro-max` | 约束响应式、可读性、控件密度与交互细节 | 背景档位、Surface 系统、移动端抽屉、PC 沉浸控制台、按钮和卡片规格 |

执行时以本文中文方案为准。英文文档只作为 companion 版本，方便非中文协作或工具读取。

## 1. 产品设计简报

### 1.1 产品定位

沉没之城是一个以 CoC 跑团为核心的 Web 应用，兼具：

- PC 端跑团管理台：适合 KP、管理员、重度玩家进行完整操作。
- 移动端 PL 参与端：适合玩家快速进入房间、查看聊天、参与骰点和基础互动。
- 氛围化社区与成长系统：调查员、故事书、无名集市、旧日低语等共同构成沉浸式世界。

### 1.2 关键用户

| 用户 | 主要设备 | 核心目标 | UI 优先级 |
| --- | --- | --- | --- |
| KP | PC | 创建/管理房间、推进剧情、处理战斗/线索/私聊 | 信息密度、操作效率、状态清晰 |
| PL | 移动端/PC | 快速进房、看聊天、骰点、查看角色状态 | 主聊天优先、少遮挡、少层级 |
| 管理员 | PC | 管理用户、角色、内容、系统资源 | 稳定、可扫描、低误操作 |
| 普通浏览用户 | PC/移动端 | 查看角色、市场、论坛、个人设置 | 清晰入口、视觉吸引、低学习成本 |

### 1.3 本轮升级目标

1. 让用户选择明亮背景时，页面仍清晰可读。
2. 让暗色背景保留克苏鲁氛围，但不等同于“全站黑幕”。
3. 建立可复用的 Surface、PageShell、ActionCard、ReadablePanel 组件。
4. 停止逐页补遮罩的返工模式。
5. PC 端继续向“酷炫沉浸控制台”升级。
6. 移动端围绕“进入房间并参与游戏”优化。
7. 保证现有数据、附件、角色卡、房间消息、骰点、战斗逻辑不受影响。

## 2. 设计原则

### 2.1 视觉路线

采用 **发光的秘仪档案馆** 作为主视觉方向。

关键词：

- 深海冷雾
- 明亮档案纸与浅色湿石 Surface
- 克制金色仪式感
- 适量血红警示与禁忌感
- 非纯黑克苏鲁
- 明暗背景可切换
- PC 酷炫沉浸
- 移动端 PL 优先

色彩比例建议：

- 深海蓝黑、烟熏灰、羊皮纸暖白作为大面积背景与 Surface 基底。
- 金色作为品牌、稀有度、仪式感、主行动强调。
- 血红色作为少量高强度强调，不超过单屏主要 UI 面积的 5%-8%。
- 紫色/诡异色用于疯狂、神秘、旧日力量等状态，不与血红争夺主警示语义。

血红色适用场景：

- 战斗、伤害、濒死、危险确认。
- 禁忌物、污染、诅咒、理智崩坏边缘状态。
- 关键警告、失败反馈、不可逆操作。
- 房间内的紧急状态提示，例如战斗开始、HP 过低、重要骰点失败。

血红色不适用场景：

- 大面积背景遮罩。
- 普通正文、普通按钮、普通卡片边框。
- 与金色同时高亮同一信息，造成主次冲突。
- 明亮背景下的低透明红字。

避免：

- 全局黑幕遮罩
- 灰底灰字
- 低透明金色正文
- 大面积血红背景导致廉价恐怖感
- 逐页补丁式修复
- 移动端信息堆叠
- 背景图与正文直接竞争

### 2.2 背景不是可读性手段

背景层只做三件事：

1. 展示用户选择的背景图。
2. 提供轻量氛围处理，例如轻微色温、微弱暗角、加载失败回退。
3. 暴露当前背景的可读性档位给页面系统。

背景层不得再承担：

- 为所有页面统一压暗。
- 替页面文字兜底。
- 用一层黑色遮罩让所有背景看起来一样。

### 2.3 Surface 才是可读性核心

所有有意义的内容都必须放在 Surface 上。Surface 必须保证：

- 主文本对比度稳定。
- 次文本不消失。
- 边框与阴影能表达层级。
- hover/active/disabled 状态明确。
- 明亮和暗色背景下均可用。

### Surface 粘连反模式

禁止两个大面积 Surface 在同宽、同色、同圆角的情况下上下紧贴。工具条、状态条、内容列表、游戏舞台之间必须通过 `coc-section-stack` 或 `coc-section-group` 建立段落关系。验收时如果截图中两块卡片被读成连续黑色横条，即视为不通过。

### 2.4 页面壳决定信息结构

页面不再随意堆卡片。每个页面至少包含：

- 页面标题区：告诉用户当前在哪里。
- 主任务区：承载当前页面最重要操作。
- 次级信息区：统计、筛选、辅助说明、快捷入口。
- 状态区：空状态、加载、错误、权限不足。

### 2.5 移动端策略

移动端不是 PC 缩小版。

移动端优先级：

1. 房间聊天与骰点记录。
2. 返回、房间状态、角色状态。
3. 工具抽屉。
4. 成员、线索、私聊、更多操作。
5. 装饰性标题和氛围内容。

## 3. 背景档位系统

### 3.1 背景档位

为每张背景增加 `readabilityProfile`：

| 档位 | 适用背景 | 设计目标 |
| --- | --- | --- |
| `luminous` | 羊皮纸、废墟米 | 保持明亮质感，Surface 稍强，文字偏深或强对比 |
| `balanced` | 沉没之城、深海蓝、水下城邦 | 保留冷雾层次，Surface 中等强度 |
| `dark` | 深海遗迹、虚空符文 | 保留深色氛围，Surface 可略轻但文字仍需高对比 |

### 3.2 背景配置建议

| 背景 | 档位 | 备注 |
| --- | --- | --- |
| 羊皮纸 | `luminous` | 页面需偏档案纸质感，避免透明灰块 |
| 沉没之城 | `balanced` | 默认背景，保留冷雾与蓝色层次 |
| 深海蓝 | `balanced` | 可作为中性冷色背景 |
| 废墟米 | `luminous` | 明亮背景，Surface 必须更实 |
| 深海遗迹 | `dark` | 可保留暗色氛围 |
| 水下城邦 | `balanced` | 与沉没之城接近，但更蓝 |
| 虚空符文 | `dark` | 允许更强对比与神秘感 |

### 3.3 技术落点

修改：

- `apps/web/src/components/background/backgroundOptions.ts`
- `apps/web/src/components/background/AppBackground.tsx`
- `apps/web/src/styles/background-v2.css`
- `apps/web/src/styles/tokens-v2.css`

建议接口：

```ts
export type BackgroundReadabilityProfile = 'luminous' | 'balanced' | 'dark';

export interface BackgroundOption {
  id: string;
  name: string;
  url: string;
  readabilityProfile: BackgroundReadabilityProfile;
}
```

`AppBackground` 输出：

```tsx
<div className="coc-app-bg" data-profile={selected.readabilityProfile}>
```

## 4. Surface 系统

### 4.1 Surface 类型

| 类型 | 用途 | 背景强度 |
| --- | --- | --- |
| `page` | 页面 hero、主标题区 | 中强 |
| `panel` | 列表、卡片、侧栏 | 中 |
| `solid` | 长文、表单、说明、帖子正文 | 强 |
| `glass` | 短信息、装饰、预览 | 弱，不用于正文 |
| `elevated` | 弹窗、抽屉、菜单、命令面板 | 强 |
| `danger` | 删除、离开、危险确认 | 强，带危险语义 |

### 4.2 Surface token

需要在 `tokens-v2.css` 增加或重构：

```css
:root {
  --coc-surface-page: rgba(16, 18, 22, 0.78);
  --coc-surface-panel: rgba(12, 15, 20, 0.82);
  --coc-surface-solid: rgba(9, 11, 15, 0.92);
  --coc-surface-glass: rgba(16, 22, 28, 0.46);
  --coc-surface-elevated: rgba(8, 10, 14, 0.96);

  --coc-on-surface-primary: #f8eed8;
  --coc-on-surface-secondary: #dccda9;
  --coc-on-surface-muted: #aa9a7d;
  --coc-on-light-primary: #1c1b18;
  --coc-on-light-secondary: #4e4738;

  --coc-accent-gold: #d6aa22;
  --coc-accent-blood: #b21f2d;
  --coc-accent-blood-strong: #e13a4a;
  --coc-accent-blood-muted: #7a1a22;
  --coc-accent-blood-surface: rgba(124, 18, 28, 0.18);
}

[data-bg-profile="luminous"] {
  --coc-surface-page: rgba(250, 244, 224, 0.82);
  --coc-surface-panel: rgba(245, 238, 214, 0.88);
  --coc-surface-solid: rgba(255, 250, 235, 0.94);
  --coc-on-surface-primary: #1d1b16;
  --coc-on-surface-secondary: #4d4638;
  --coc-on-surface-muted: #71664e;
  --coc-accent-blood: #9b1824;
  --coc-accent-blood-strong: #bd2432;
  --coc-accent-blood-surface: rgba(155, 24, 36, 0.14);
}
```

注意：这只是方向示例，实施时需要结合现有 CSS 变量命名收敛，避免一口气引入过多重复 token。

### 4.3 组件 API

`Surface` 建议升级为：

```ts
type SurfaceVariant = 'page' | 'panel' | 'solid' | 'glass' | 'elevated' | 'danger';
type SurfaceTone = 'neutral' | 'gold' | 'blood' | 'ocean' | 'madness';
type SurfaceDensity = 'compact' | 'normal' | 'spacious';
```

`blood` tone 的使用边界：

- 可用于 `danger` Surface、战斗状态条、HP 低值、失败骰点、危险徽章和破坏性操作确认。
- 不可用于普通导航激活态；普通激活态仍优先使用金色或中性高亮。
- 在移动端房间页中，血红只提示紧急状态，不应占用聊天主区域。

原则：

- 不追求一次性做成完整设计系统。
- 优先支撑当前页面迁移。
- API 不要过度抽象。

## 5. 核心组件规划

### 5.1 `PageShell`

用途：

- 统一页面最大宽度、间距、标题区、操作区、主/侧栏布局。
- 避免每个页面重复写 hero 和容器。

建议 props：

```ts
interface PageShellProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  layout?: 'single' | 'with-aside';
}
```

### 5.2 `ReadablePanel`

用途：

- 长说明。
- 表单。
- 帖子正文。
- 商店介绍。
- 房间公告。

规则：

- 默认使用 `solid` Surface。
- 正文字号不小于 14px，移动端不小于 15/16px。
- 行高 1.6 左右。

### 5.3 `ActionCard`

用途：

- 首页功能入口。
- 故事入口。
- 可点击内容卡片。

规则：

- 图片可以明亮或暗色，但文字必须有独立文字层或 Surface。
- 不允许只靠图片暗角承载文字。
- hover 可以有轻微上浮和金色边框，但不能改变布局尺寸。

### 5.4 `DataCard`

用途：

- 统计数字。
- 用户资产。
- 位阶/印记。
- 市场/背包信息块。

规则：

- 数字使用 tabular figures。
- 单卡只表达一个主指标。
- 图标、数字、说明层级固定。

## 6. 信息架构与导航调整

### 6.1 左侧导航

已确定：

- `商店 / 背包 / 市场` 合并为 `无名集市`。
- 内部仍可保留商店、背包、市场三个二级区。

后续规则：

- 左侧导航只放一级目的地。
- 二级操作放页面内部导航。
- 暂停运营或废弃模块不要继续争抢主导航位置。

### 6.2 PC 端

PC 端目标：

- 更酷炫。
- 更沉浸。
- 信息密度更高。
- KP 操作完整。

实现方式：

- 保留左侧导航。
- 顶栏压低存在感。
- 页面内部使用强层级 Surface。
- 重要操作固定在页面右上或工具栏。

### 6.3 移动端

移动端目标：

- PL 快速进入和参与游戏。
- 少层级。
- 少遮挡。
- 主聊天区域最大化。

实现方式：

- 房间页工具收进抽屉。
- 房间标题和房间号压缩为小字号状态行。
- 成员、角色、线索、私聊、更多操作放入工具抽屉或底部 sheet。

## 7. 页面迁移路线

### Phase 1：可读性基础系统

**目标：** 先建立背景档位、Surface、PageShell 和核心组件。

**修改文件：**

- `apps/web/src/styles/tokens-v2.css`
- `apps/web/src/styles/background-v2.css`
- `apps/web/src/styles/system-v2.css`
- `apps/web/src/components/background/backgroundOptions.ts`
- `apps/web/src/components/background/AppBackground.tsx`
- `apps/web/src/components/system/Surface.tsx`

**新增文件：**

- `apps/web/src/components/system/PageShell.tsx`
- `apps/web/src/components/system/ReadablePanel.tsx`
- `apps/web/src/components/system/ActionCard.tsx`
- `apps/web/src/components/system/DataCard.tsx`

**步骤：**

- [ ] 增加 `readabilityProfile` 类型。
- [ ] 为七张背景配置档位。
- [ ] `AppBackground` 输出背景档位。
- [ ] 背景 CSS 从“统一遮罩”改为“档位化氛围层”。
- [ ] 增加 Surface token。
- [ ] 扩展 `Surface`。
- [ ] 新增 `PageShell`。
- [ ] 新增 `ReadablePanel`。
- [ ] 新增 `ActionCard`。
- [ ] 新增 `DataCard`。
- [ ] 运行 `npm run lint`。
- [ ] 运行 `npm run typecheck`。
- [ ] 运行 `npm run build`。
- [ ] 截图 `/`、`/rooms`、`/shop`，只做轻量视觉核验。
- [ ] 提交：`feat: add readable ui surface system`。

### Phase 2：故事书与无名集市

**目标：** 优先修复当前截图暴露的问题。

**修改文件：**

- `apps/web/src/pages/rooms/RoomListPage.tsx`
- `apps/web/src/components/economy/EconomyPageShell.tsx`
- `apps/web/src/pages/shop/ShopPage.tsx`
- `apps/web/src/pages/inventory/InventoryPage.tsx`
- `apps/web/src/pages/market/RelicMarketPage.tsx`

**步骤：**

- [ ] 用 `PageShell` 重建故事书标题区。
- [ ] 用 `Surface` 重建故事书筛选区。
- [ ] 用 `ActionCard` 或专用 RoomCard 重建房间卡片。
- [ ] 用 `ReadablePanel` 重建快速进入与索引统计。
- [ ] 用 `PageShell` 重建无名集市页面壳。
- [ ] 内部二级导航保留“拉莱耶遗珍 / 背包 / 市场”。
- [ ] 商品卡片改为稳定可读面板。
- [ ] 背包和市场弹窗改用 `elevated` Surface。
- [ ] 运行 `npm run lint`。
- [ ] 运行 `npm run typecheck`。
- [ ] 运行 `npm run build`。
- [ ] 截图 `/rooms`、`/shop`、`/inventory`、`/market`。
- [ ] 提交：`feat: migrate gateway and economy surfaces`。

### Phase 3：首页与调查员

**目标：** 统一首页和角色页，同时保留用户满意的调查员卡片。

**修改文件：**

- `apps/web/src/pages/dashboard/DashboardPage.tsx`
- `apps/web/src/pages/characters/CharacterListPage.tsx`
- `apps/web/src/pages/characters/CharacterDetailPage.tsx`
- `apps/web/src/pages/characters/CharacterCreateV2Page.tsx`
- `apps/web/src/pages/characters/CharacterGrowthPage.tsx`

**步骤：**

- [ ] 首页 hero 改为 `PageShell`。
- [ ] 首页功能入口改为 `ActionCard`。
- [ ] 保留“我的调查员”卡片主体视觉效果。
- [ ] 调查员列表迁移到 Surface 系统。
- [ ] 角色详情 header 和属性区迁移。
- [ ] 创建/成长表单迁移到 `ReadablePanel`。
- [ ] 运行 `npm run lint`。
- [ ] 运行 `npm run typecheck`。
- [ ] 运行 `npm run build`。
- [ ] 截图首页、调查员列表、角色详情。
- [ ] 提交：`feat: migrate dashboard and character surfaces`。

### Phase 4：论坛、位阶、印记、个人设置

**目标：** 清理次级页面旧 Surface 债务。

**修改文件：**

- `apps/web/src/pages/forum/ForumListPage.tsx`
- `apps/web/src/pages/forum/ForumBoardPage.tsx`
- `apps/web/src/pages/forum/ForumPostPage.tsx`
- `apps/web/src/pages/forum/ForumNewPostPage.tsx`
- `apps/web/src/pages/ranks/RanksPage.tsx`
- `apps/web/src/pages/titles/TitlesPage.tsx`
- `apps/web/src/pages/profile/ProfilePage.tsx`
- `apps/web/src/components/background/BackgroundPicker.tsx`

**步骤：**

- [ ] 论坛列表和版块卡片迁移。
- [ ] 帖子正文和回复区迁移，不改编辑器数据流。
- [ ] 位阶和印记卡片迁移。
- [ ] 个人设置页面迁移。
- [ ] 背景选择器增加“明亮 / 平衡 / 暗色”说明。
- [ ] 运行 `npm run lint`。
- [ ] 运行 `npm run typecheck`。
- [ ] 运行 `npm run build`。
- [ ] 截图论坛、个人设置、背景选择器。
- [ ] 提交：`feat: migrate forum and profile surfaces`。

### Phase 5：房间内游戏界面

**目标：** 最后处理最高价值、最高风险页面。

**修改文件：**

- `apps/web/src/pages/rooms/RoomPage.tsx`
- `apps/web/src/components/room/*`

**严禁修改：**

- Socket 事件名。
- 消息数据结构。
- 骰点成功度算法。
- 战斗回合逻辑。
- 私聊数据流。

**步骤：**

- [ ] 先标记 `RoomPage` 中纯视觉区块。
- [ ] PC 端形成稳定跑团控制台：成员/角色栏、主日志、输入区、工具栏。
- [ ] 移动端主聊天/骰点记录优先。
- [ ] 工具抽屉默认收起。
- [ ] 房间标题压缩为状态行。
- [ ] 聊天消息和骰点记录迁移到可读 Surface。
- [ ] 运行 `npm run lint`。
- [ ] 运行 `npm run typecheck`。
- [ ] 运行 `npm run build`。
- [ ] 截图桌面房间和移动端房间。
- [ ] 提交：`feat: migrate room gameplay shell`。

### Phase 6：旧 CSS 债务清理

**目标：** 在页面迁移稳定后，删除旧覆盖链。

**修改文件：**

- `apps/web/src/styles/index.css`
- `apps/web/src/styles/system-v2.css`

**步骤：**

- [ ] 运行 `rg -n "card-layer-2|coc-glass-v2|coc-card-v2|!important" apps/web/src`。
- [ ] 逐项确认是否仍被页面使用。
- [ ] 将剩余旧类替换为系统组件。
- [ ] 分批删除 `.content-area ... !important` 覆盖链。
- [ ] 运行 `npm run lint`。
- [ ] 运行 `npm run typecheck`。
- [ ] 运行 `npm run build`。
- [ ] 提交：`refactor: remove legacy surface overrides`。

## 8. 验收矩阵

每阶段至少检查以下背景：

| 页面 | 羊皮纸 | 沉没之城 | 虚空符文 | 移动端 |
| --- | --- | --- | --- | --- |
| 首页 | 必查 | 必查 | 必查 | 截图 |
| 故事书 | 必查 | 必查 | 必查 | 截图 |
| 无名集市 | 必查 | 必查 | 必查 | 可选 |
| 调查员 | 必查 | 必查 | 可选 | 可选 |
| 论坛 | 可选 | 必查 | 可选 | 可选 |
| 房间页 | 必查 | 必查 | 必查 | 必查 |

验收标准：

- 主文本清晰。
- 次文本可辨认。
- 按钮状态明确。
- 卡片和背景有足够分离。
- 页面不依赖全局黑幕。
- 移动端不遮挡主聊天/骰点。

## 9. 风险与回滚

### 9.1 风险

- Surface token 一次改动过大可能影响全站。
- 明亮背景下旧页面残留样式会暴露更多问题。
- RoomPage 体积大，容易误碰业务逻辑。
- 服务器当前 `master` 与 `origin/develop` 分叉，不能直接跑旧部署脚本。

### 9.2 控制方式

- 每阶段只迁移明确页面。
- 每阶段独立提交。
- 每阶段只做轻量截图和构建验证。
- RoomPage 放到最后。
- 部署继续使用已验证的前端静态资源流程。

### 9.3 回滚方式

- 前端代码回滚到上一阶段提交。
- 服务器端可恢复上一份 `apps/web/dist.prev-codex-*`。
- 数据库和 uploads 每次部署前都有备份。

## 10. 部署规则

在服务器分支问题解决前，继续使用前端静态部署：

1. 本地运行 `npm run lint`。
2. 本地运行 `npm run typecheck`。
3. 本地运行 `npm run build`。
4. 提交并推送 `codex/frontend-system-v2-phase1`。
5. 服务器备份 `/opt/coc-platform-data/dev.db`。
6. 服务器备份 `/opt/coc-platform/apps/server/public/uploads/`。
7. 上传 `apps/web/dist`。
8. 替换 `apps/server/public/index.html` 和 `apps/server/public/assets`。
9. 健康检查 `http://localhost:3001/health`。

不直接运行现有服务器 `deploy.sh`，直到 `master` 与 `origin/develop` 的分叉被明确处理。

## 11. 立即执行建议

2026-07-04 后，下一步不再建议直接执行旧 **Phase 1 + Phase 2**。

新的执行顺序：

1. 先执行 `2026-07-04-sunken-city-ui-asset-pipeline.zh-CN.md`：定义资产规格卡，使用 Codex 官方内置 image2 生成候选纹理，筛选并处理可入库素材。
2. 再执行 `2026-07-04-sunken-city-luminous-archive-visual-upgrade.zh-CN.md` 的 Phase 0 + Phase 1：建立明亮材质化 Surface、纹理 token 和组件 API。
3. 然后再回到本文的页面迁移路线，把故事书、无名集市、首页、调查员、论坛和房间页逐步迁移到新 Surface 系统。

理由：

- 旧 Phase 1 解决“可读性”，但不能单独解决“AI 味”和“黑色透明卡片”问题。
- 新 Phase 0 / Phase 1 先解决材质、纹理、明亮度和 Surface 语义，能避免页面迁移后再返工。
- 页面迁移必须建立在新材质系统上，否则会继续产生逐页补丁。

建议提交顺序：

1. `docs: define sunken city ui asset pipeline`
2. `feat: add luminous archive material tokens`
3. `feat: migrate first visual sample page`

部署仍非本 UI/UX 规划阶段默认事项；除非用户明确要求，本会话原则上不部署。

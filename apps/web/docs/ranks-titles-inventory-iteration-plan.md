# 位阶天梯 · 印记图鉴 · 背包 前端迭代方案

> 基于沉没之城 V2.1 设计系统制定
> 核心原则：三层光影层级、card-layer-2、克制奢华、动画即信息

---

## 一、位阶天梯 (RanksPage) 迭代

### 1.1 当前问题诊断

| 问题 | 严重度 |
|------|--------|
| 大量使用 `RuneBorder` 双边框符文卡片，视觉重量过重 | 🔴 |
| `coc-bg-parchment` 等旧颜色类名残留 | 🟡 |
| 无页面入场动画 | 🟡 |
| 位阶天梯网格无 hover 反馈 | 🟡 |
| 经验来源列表样式老旧 | 🟢 |

### 1.2 改动清单

#### P0 — 材质替换
- [ ] 顶部导航栏：`bg-coc-abyss/95 backdrop-blur-sm` → `overlay-layer-3`（加 blur）
- [ ] 当前位阶展示：`RuneBorder` → `card-layer-2` + 金色微光边框
- [ ] 位阶天梯卡片：`RuneBorder` → `card-layer-2`，保留当前选中金色边框
- [ ] 选中详情面板：`RuneBorder` → `card-layer-2`
- [ ] 经验来源面板：`RuneBorder` → `card-layer-2`

#### P1 — 动画系统
- [ ] 页面整体 `motion.div` 淡入入场（`opacity: 0→1, y: 12→0`, 500ms）
- [ ] 当前位阶头像呼吸光效（`animate-pulse` 或 `breathe` 动画）
- [ ] 位阶天梯卡片 stagger 入场（间隔 40ms）
- [ ] 经验来源列表 stagger 入场
- [ ] 选中详情面板展开动画（`AnimatePresence` 高度/透明度过渡）

#### P1 — 交互优化
- [ ] 位阶卡片 hover：上浮 2px + 金色微光边框（`card-layer-2:hover` 已有）
- [ ] 未解锁位阶：降低透明度 + 灰色图标，hover 不触发金色光效
- [ ] 当前位阶：左侧金色竖线指示器（类似论坛精华帖）

#### P2 — 细节打磨
- [ ] 经验来源数值标签改为金色小胶囊（已合格，可保留）
- [ ] 特权列表加 `Sparkles` 图标（已有，保留）

---

## 二、印记图鉴 (TitlesPage) 迭代

### 2.1 当前问题诊断

| 问题 | 严重度 |
|------|--------|
| 大量使用 `RuneBorder` | 🔴 |
| `coc-bg-parchment` 旧颜色 | 🟡 |
| 进度圆环简陋（SVG 手写，无质感） | 🟡 |
| 筛选器按钮样式老旧（`bg-coc-void`） | 🟡 |
| 印记网格无入场动画 | 🟡 |
- [ ] 选中详情缺少展开动画 | 🟢 |

### 2.2 改动清单

#### P0 — 材质替换
- [ ] 顶部导航栏 → `overlay-layer-3`
- [ ] 收集进度面板：`RuneBorder` → `card-layer-2`
- [ ] 印记网格卡片：`RuneBorder` → `card-layer-2`
- [ ] 选中详情面板：`RuneBorder` → `card-layer-2`

#### P1 — 进度圆环重构
当前：手写 SVG circle，无质感。
目标：
- 外圈：`border-4` + `border-coc-border` 底色
- 进度弧：`border-4` + `border-coc-gold` + 端点圆角
- 中心数字：`font-ritual` + `text-3xl text-coc-gold`
- 整体加 `shadow-lg` 制造悬浮感
- 可选：进度变更时弧线带 `transition-all duration-700`

#### P1 — 筛选器样式统一
当前：`bg-coc-void` + 选中 `bg-coc-gold`
目标：
- 未选中：`border border-coc-border bg-coc-bg-elevated text-coc-text-muted`
- 选中：`bg-coc-gold text-coc-abyss border-coc-gold`
- hover：`border-coc-gold/50 text-coc-parchment`
- 统一所有筛选按钮为 `btn-v2` 或最小化圆角（`rounded-md`）

#### P1 — 动画系统
- [ ] 页面整体淡入入场
- [ ] 进度圆环加载时从 0% → 实际百分比动画（`motion.circle` 或 CSS transition）
- [ ] 印记网格 stagger 入场（40ms 间隔）
- [ ] 稀有度颜色标签带微光呼吸（低优先级）
- [ ] 选中详情 `AnimatePresence` 展开/收起

#### P1 — 交互优化
- [ ] 印记卡片 hover：上浮 + 金色微光（`card-layer-2:hover` 已有）
- [ ] 已解锁印记：hover 显示 "设为展示" 快捷按钮（不展开详情即可操作）
- [ ] 当前展示印记：左上角金色小皇冠标记，无需 hover
- [ ] 未解锁印记：
  - 图标变为灰色剪影（`grayscale` + `opacity-40`）
  - 名称显示为 `???` 或暗色
  - hover 显示解锁条件 Tooltip

#### P2 — 隐藏印记处理
- [ ] 未解锁的隐藏印记：图标用 `HelpCircle` 占位符替代原图标
- [ ] 名称显示为 `???`
- [ ] 解锁后才有入场动画揭示

---

## 三、背包 (InventoryPage) 迭代

### 3.1 当前问题诊断

| 问题 | 严重度 |
|------|--------|
| `RuneBorder` 包裹标签页内容 | 🔴 |
| 稀有度发光颜色使用紫/橙/红渐变，与 V2.1 配色冲突 | 🟡 |
| Tab 切换无动画 | 🟢 |
| 开箱弹窗视觉层级不够 | 🟢 |
| 缺少空状态插画（已有 EmptyState，但样式需检查） | 🟢 |

### 3.2 改动清单

#### P0 — 材质替换
- [ ] Tab 内容区：`RuneBorder` → `card-layer-2`
- [ ] 开箱弹窗外层：`bg-black/85` → `overlay-layer-3`
- [ ] 弹窗本体：加 `modal-layer-3` 样式（`box-shadow: 0 24px 64px rgba(0,0,0,0.6)`）

#### P1 — 稀有度配色统一
当前发光系统（与 V2.1 不一致）：
```
rare:    蓝色光晕 (59,130,246)     → 改为金色微光
epic:    紫色光晕 (168,85,247)     → 改为血色微光
legendary: 橙色光晕 (251,146,60)   → 改为暗金色光晕（更高饱和度）
mythical:  红色光晕 (244,63,94)    → 保留，但降低透明度至 0.35
```

V2.1 规范：发光效果只用于 `gold` 和 `blood`，透明度 ≤ 15%。
遗物/开箱稀有度可以适度放宽至 25-30%，但禁用紫/橙渐变。

#### P1 — Tab 切换动画
- [ ] Tab 切换时内容区 `AnimatePresence` 淡入滑动（`opacity: 0→1, x: 8→0`）
- [ ] Tab 按钮活跃状态加底部 2px 金色指示条

#### P1 — 开箱弹窗优化
- [ ] 弹窗标题："旧日低语已兑现" 用 `font-ritual text-xl text-coc-gold`
- [ ]  flavor 文字：打字机效果（复用 `TypewriterText`）
- [ ] 遗物卡片 stagger 揭示动画（已有的 `visibleRelics` 逻辑可保留，加 `motion.div`）
- [ ] 高稀有度（legendary/mythical）闪光效果保留，但颜色改为金色/血色
- [ ] 收下按钮：`MagneticButton` 或至少 `btn-v2`

#### P2 — 遗物绑定交互
- [ ] 绑定按钮改为 `MagneticButton` 样式
- [ ] 绑定成功时触发 `ParticleBurst` 金色粒子（复用商店组件）

---

## 四、通用组件复用清单

| 组件 | 来源 | 复用点 |
|------|------|--------|
| `card-layer-2` | `styles/index.css` | 三个页面所有卡片 |
| `overlay-layer-3` | `styles/index.css` | 顶部导航栏、弹窗遮罩 |
| `modal-layer-3` | `styles/index.css` | 选中详情弹窗、开箱弹窗 |
| `TypewriterText` | `SceneCard.tsx` | 开箱 flavor 文字 |
| `ParticleBurst` | `ParticleBurst.tsx` | 遗物绑定成功 |
| `motion` 入场 | `DashboardPage.tsx` | 三个页面整体入场 |
| `AnimatePresence` | `ParticleBurst.tsx` | 详情弹窗展开收起 |

---

## 五、实施优先级

| 周 | 内容 |
|----|------|
| **Day 1** | 三个页面 `RuneBorder` → `card-layer-2` 材质替换 |
| **Day 2** | 位阶天梯 + 印记图鉴动画系统（入场 + stagger） |
| **Day 3** | 印记图鉴筛选器样式 + 进度圆环重构 |
| **Day 4** | 背包稀有度配色统一 + Tab 动画 + 开箱弹窗优化 |
| **Day 5** | 遗物绑定粒子效果 + 空状态检查 + 测试部署 |

---

## 六、验收标准

- [ ] 三个页面零 `RuneBorder` 使用
- [ ] 三个页面零 `coc-bg-parchment` 旧颜色类名
- [ ] 所有卡片使用 `card-layer-2`，hover 有上浮 + 金色微光
- [ ] 页面入场带淡入动画
- [ ] 列表/网格 stagger 入场（间隔 ≤ 50ms）
- [ ] 印记筛选器按钮样式统一
- [ ] 稀有度发光颜色符合 V2.1 规范（禁用紫/橙渐变）
- [ ] 开箱弹窗 flavor 文字带打字机效果
- [ ] 所有空状态使用 `EmptyState` 组件

---

*版本：V2.1-子页面迭代*
*制定时间：2026-05-23*

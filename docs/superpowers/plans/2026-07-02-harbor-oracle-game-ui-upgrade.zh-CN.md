# 黑水港与溺者之牌游戏化升级实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将黑水港和溺者之牌从普通功能页升级为沉没之城的游戏化试验田，并把“相邻卡片紧贴成黑条”固化为设计系统级防回归规则。

**Architecture:** 先补 UI 系统约束，再分别升级两个非核心系统。黑水港采用“港口小游戏作业台”架构，溺者之牌采用“仪式牌阵游戏台”架构；每一轮都保留现有后端接口，前端先通过状态、动效、音画节奏和可读 Surface 改善体验。

**Tech Stack:** React + TypeScript + Vite、Tailwind utility classes、现有 `@components/system` Surface/PageShell/Button/Tabs、Lucide icons、CSS animation、Playwright targeted screenshots。

---

## 0.0 2026-07-04 视觉方向更新

本计划的交互节奏仍有效，但视觉材质必须服从新主计划：

- `2026-07-04-sunken-city-luminous-archive-visual-upgrade.zh-CN.md`
- `2026-07-04-sunken-city-ui-asset-pipeline.zh-CN.md`

执行黑水港和溺者之牌时，不再以黑色透明卡片、烟熏玻璃或大面积暗色恐怖背景作为默认方向。应改为：

- 黑水港：明亮深海港口小游戏台，使用浅色湿石、水面冷雾、氧化铜边框和少量血红咬钩警示。
- 溺者之牌：明亮仪式牌桌，使用档案纸、旧金细纹、低对比牌背纹理和清晰解牌档案。

image2 素材必须先经过资产规格卡和入库规则，不得直接把概念图或未筛选纹理写入页面。

## 0. Product Design Brief

**产品/页面：** 沉没之城 Web 应用的 `/dream` 溺者之牌、`/fishing` 黑水港，以及相关 UI 系统约束。

**视觉目标：** 明亮的深海秘仪档案馆、深海冷雾、档案纸与浅色湿石材质、氧化铜边框、克制金色仪式感、适量血红警示。两个非核心系统允许更游戏化、更酷炫，但不能牺牲文字可读性。

**交互目标：** 保持现有功能可用，先做前端游戏化升级。黑水港强调“等待、咬钩、收竿、渔获账本”的小游戏节奏；溺者之牌强调“入梦、选牌、翻牌、解牌、深度效应”的仪式感。

**设备目标：** PC 端更沉浸，移动端仍可单手操作，不出现横向溢出。

---

## 1. 错误反馈：禁止相邻 Surface 贴住成黑条

### 1.1 错误描述

当前截图暴露的问题是：两个相邻卡片之间虽然在 DOM 上可能存在 `gap`，但视觉上仍然贴住，因为它们同时满足：

- 同色或近似同色的 `Surface` 背景；
- 同宽、同边界、同圆角；
- 中间没有可见的空间、分组标题、分隔线或背景层级变化；
- 下一个模块顶边与上一个模块底边在视觉上形成连续黑色横条。

这不是单页样式问题，而是 UI 系统反模式。后续所有页面迁移都必须避免。

### 1.2 设计规则

- 相邻的主要 `Surface` 之间必须至少满足一项：
  - 有 `gap >= 16px` 且背景对比明显；
  - 下方内容包在独立 section 容器中，并带标题或状态标签；
  - 两个 Surface 的宽度、内边距或背景层级不同；
  - 用 `divider/header/footer` 明确表达它们属于同一个复合组件。
- 禁止把两个大面积 `panel/elevated/glass` Surface 直接上下堆叠，并且都占满 PageShell 宽度。
- 在移动端，工具条和内容列表之间必须保留可识别的段落关系，不允许只靠 8px 以下间距分隔。

### 1.3 防回归策略

建立一个明确的工具类和合约检查：

- 新增推荐类名：`coc-section-stack`，用于页面主内容模块之间。
- 新增推荐类名：`coc-section-group`，用于“工具条下面接列表/舞台”的复合分组。
- 更新 `check-ui-system-contract.mjs`：对 `/friends`、`/dream`、`/fishing` 检查是否使用 section group 或明确的 `mt-` 间距。
- 更新中文 UI 方案文档：把该问题登记为“Surface 粘连反模式”。

---

## 2. 文件结构

### 修改文件

- `apps/web/src/styles/system-v2.css`
  - 添加 `coc-section-stack`、`coc-section-group`、`coc-section-group__header`、`coc-section-group__body`。
- `apps/web/scripts/check-ui-system-contract.mjs`
  - 加入 Surface 粘连防回归检查。
- `docs/superpowers/plans/2026-07-01-sunken-city-ui-readability-redesign.zh-CN.md`
  - 增补“Surface 粘连反模式”。
- `apps/web/src/pages/friends/FriendListPage.tsx`
  - 使用统一 section group，替代临时手写容器。
- `apps/web/src/pages/dreaming/DreamingPage.tsx`
  - 升级为两阶段游戏化牌阵。
- `apps/web/src/pages/fishing/FishingPage.tsx`
  - 升级为三阶段港口小游戏。
- `apps/web/src/styles/fishing.css`
  - 扩展水面、浮标、咬钩、收竿、渔获反馈动效。
- `outputs/visual-tests/harbor-oracle-game-ui-20260702/`
  - 本地截图输出目录，不提交。

### 可选新增文件

- `apps/web/src/styles/dreaming.css`
  - 如果 DreamingPage 内联样式继续膨胀，拆出牌阵、雾层、翻牌、星尘粒子样式。
- `apps/web/src/components/dreaming/OracleCard.tsx`
  - 如果牌面展示重复超过两处，抽为组件。
- `apps/web/src/components/fishing/HarborHud.tsx`
  - 如果黑水港状态仪表重复或页面继续增长，抽为组件。

---

## 3. 实施任务

### Task 1: 固化 Surface 粘连防回归规则

**Files:**
- Modify: `apps/web/src/styles/system-v2.css`
- Modify: `apps/web/scripts/check-ui-system-contract.mjs`
- Modify: `docs/superpowers/plans/2026-07-01-sunken-city-ui-readability-redesign.zh-CN.md`

- [ ] **Step 1: 添加 section group 样式**

在 `apps/web/src/styles/system-v2.css` 添加：

```css
.coc-section-stack {
  display: grid;
  gap: 1.25rem;
}

.coc-section-group {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--coc-border-subtle);
  border-radius: var(--coc-radius-panel);
  background: color-mix(in srgb, var(--coc-surface-panel) 82%, transparent);
  box-shadow: var(--coc-shadow-panel);
}

.coc-section-group::before {
  content: "";
  position: absolute;
  inset-inline: 1.5rem;
  top: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--coc-accent-gold) 45%, transparent), transparent);
  pointer-events: none;
}

.coc-section-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1rem 0.75rem;
}

.coc-section-group__body {
  padding: 0 1rem 1rem;
}
```

- [ ] **Step 2: 增加 UI 合约检查**

在 `apps/web/scripts/check-ui-system-contract.mjs` 增加：

```js
for (const [name, source] of Object.entries({
  FriendListPage: friendListPage,
  DreamingPage: dreamingPage,
  FishingPage: fishingPage,
})) {
  assertContract(
    source.includes('coc-section-group') || source.includes('coc-section-stack'),
    `${name} must use section spacing primitives to prevent adjacent Surface collision.`
  );
}
```

- [ ] **Step 3: 文档登记反模式**

在中文 UI 方案“设计原则”后追加：

```markdown
### Surface 粘连反模式

禁止两个大面积 Surface 在同宽、同色、同圆角的情况下上下紧贴。工具条、状态条、内容列表、游戏舞台之间必须通过 `coc-section-stack` 或 `coc-section-group` 建立段落关系。验收时如果截图中两块卡片被读成连续黑色横条，即视为不通过。
```

- [ ] **Step 4: 验证**

Run:

```powershell
npm run check:ui-system
npm run typecheck
npm run lint
```

Expected:

```text
UI system contract check passed.
tsc --noEmit exits 0
eslint exits 0
```

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/styles/system-v2.css apps/web/scripts/check-ui-system-contract.mjs docs/superpowers/plans/2026-07-01-sunken-city-ui-readability-redesign.zh-CN.md
git commit -m "fix: add section spacing contract"
```

### Task 2: 修复好友页当前粘连问题

**Files:**
- Modify: `apps/web/src/pages/friends/FriendListPage.tsx`

- [ ] **Step 1: 用 section group 替换临时容器**

将联系人列表外层替换为：

```tsx
<div className="coc-section-group">
  <div className="coc-section-group__header">
    <div>
      <div className="text-xs font-bold uppercase text-[var(--coc-accent-gold-strong)]">CONTACT ROSTER</div>
      <div className="mt-1 text-sm text-[var(--coc-text-secondary)]">
        {activeTab === 'online' ? '当前在线联络人' : search ? '搜索结果' : '全部同步联络人'}
      </div>
    </div>
    <span className="rounded border border-[var(--coc-border-subtle)] bg-black/25 px-3 py-1 text-xs text-[var(--coc-text-secondary)]">
      {filteredFriends.length} 条记录
    </span>
  </div>
  <div className="coc-section-group__body">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 [@media(min-width:2200px)]:grid-cols-4">
      {/* existing friend cards */}
    </div>
  </div>
</div>
```

- [ ] **Step 2: 确认工具条与列表不是同色硬贴**

工具条保留 `Surface variant="panel"`；联系人列表使用 `coc-section-group`，卡片使用更深的 `bg-[#0b1218]/88`。这三层必须在截图中可分辨。

- [ ] **Step 3: Targeted screenshot**

Run:

```powershell
node outputs\visual-tests\targeted-polish-20260702\run-targeted-check.mjs
```

Expected:

```text
friends-desktop.png 中工具条与 CONTACT ROSTER 之间存在清晰分段
friends-mobile.png 中搜索框、联络人数、联系人列表不贴边
no horizontal overflow
```

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/pages/friends/FriendListPage.tsx
git commit -m "fix: separate friend toolbar and roster surfaces"
```

### Task 3: 溺者之牌 Phase A - 游戏化牌阵舞台

**Files:**
- Modify: `apps/web/src/pages/dreaming/DreamingPage.tsx`
- Create: `apps/web/src/styles/dreaming.css`
- Modify: `apps/web/src/styles/index.css`

- [ ] **Step 1: 引入 dreaming.css**

在 `apps/web/src/styles/index.css` 添加：

```css
@import './dreaming.css';
```

- [ ] **Step 2: 创建牌阵舞台样式**

创建 `apps/web/src/styles/dreaming.css`：

```css
.oracle-stage {
  position: relative;
  overflow: hidden;
  min-height: 32rem;
}

.oracle-stage::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 18%, rgba(168, 85, 247, 0.22), transparent 34%),
    radial-gradient(circle at 20% 80%, rgba(201, 162, 39, 0.14), transparent 30%);
  pointer-events: none;
}

.oracle-card-ring {
  position: absolute;
  inset: 2rem;
  border: 1px solid rgba(201, 162, 39, 0.18);
  border-radius: 999px;
  transform: rotate(-7deg);
  pointer-events: none;
}

.oracle-card-choice {
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.oracle-card-choice:hover {
  transform: translateY(-6px) scale(1.02);
  border-color: rgba(201, 162, 39, 0.55);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45), 0 0 28px rgba(168, 85, 247, 0.24);
}
```

- [ ] **Step 3: 使用 `oracle-stage`**

将今日占卜主 `Surface` 内层添加 `oracle-stage`，并在舞台中加入：

```tsx
<div className="oracle-card-ring" />
```

- [ ] **Step 4: 三张候选牌使用 `oracle-card-choice`**

候选牌按钮增加：

```tsx
className="oracle-card-choice group relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-purple-200/20 bg-[#080b13]/80 shadow-lg shadow-black/40 backdrop-blur-md"
```

- [ ] **Step 5: 验收**

桌面端 `/dream` 应表现为“仪式牌阵舞台”，不是普通表单区。移动端必须单列滚动，牌面不横向溢出。

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/pages/dreaming/DreamingPage.tsx apps/web/src/styles/dreaming.css apps/web/src/styles/index.css
git commit -m "feat: add oracle card ritual stage"
```

### Task 4: 溺者之牌 Phase B - 翻牌与解牌反馈

**Files:**
- Modify: `apps/web/src/pages/dreaming/DreamingPage.tsx`
- Modify: `apps/web/src/styles/dreaming.css`

- [ ] **Step 1: 增加前端抽牌阶段状态**

在 `DreamingPage` 中增加：

```tsx
const [selectingKey, setSelectingKey] = useState<string | null>(null);
```

- [ ] **Step 2: 选择牌时先播放短反馈**

在 `handleSelect` 开始处加入：

```tsx
setSelectingKey(key);
await new Promise((resolve) => window.setTimeout(resolve, 260));
```

在 `finally` 中加入：

```tsx
setSelectingKey(null);
```

- [ ] **Step 3: 添加选中态样式**

在 `dreaming.css` 添加：

```css
.oracle-card-choice[data-selecting="true"] {
  transform: translateY(-10px) rotateY(10deg) scale(1.04);
  border-color: rgba(201, 162, 39, 0.75);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.5), 0 0 44px rgba(201, 162, 39, 0.28);
}

.oracle-reveal-panel {
  animation: oracle-reveal-in 420ms ease both;
}

@keyframes oracle-reveal-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 4: 将解牌结果 Surface 加入 `oracle-reveal-panel`**

普通解牌和深度解牌结果 `Surface` 增加：

```tsx
className="oracle-reveal-panel"
```

- [ ] **Step 5: 验收**

选择牌时必须有明确反馈；解牌内容出现时不应突兀跳出。`prefers-reduced-motion` 下动画可以简化但不能破坏布局。

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/pages/dreaming/DreamingPage.tsx apps/web/src/styles/dreaming.css
git commit -m "feat: add oracle draw feedback"
```

### Task 5: 黑水港 Phase A - 港口小游戏 HUD

**Files:**
- Modify: `apps/web/src/pages/fishing/FishingPage.tsx`
- Modify: `apps/web/src/styles/fishing.css`

- [ ] **Step 1: 强化状态 HUD**

将四个状态卡片包进：

```tsx
<div className="coc-section-stack">
  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {/* status cards */}
  </div>
</div>
```

- [ ] **Step 2: 为当前状态添加语义色**

在 `FishingPage` 增加：

```tsx
const stateTone: Record<FishingState, string> = {
  idle: 'text-[var(--coc-text-primary)]',
  casting: 'text-cyan-200',
  waiting: 'text-[var(--coc-accent-gold)]',
  biting: 'text-[var(--coc-accent-blood)]',
  reeling: 'text-cyan-100',
  result: 'text-[var(--coc-accent-gold)]',
};
```

状态文本使用：

```tsx
<div className={`mt-2 font-bold ${stateTone[state]}`}>{stateLabel[state]}</div>
```

- [ ] **Step 3: 添加咬钩警示层**

在舞台内部、结果层之前添加：

```tsx
{state === 'biting' && (
  <div className="fishing-bite-alert">
    <span>咬钩</span>
  </div>
)}
```

在 `fishing.css` 添加：

```css
.fishing-bite-alert {
  position: absolute;
  inset: 1rem;
  z-index: 15;
  display: grid;
  place-items: center;
  border: 1px solid rgba(159, 28, 43, 0.55);
  background: radial-gradient(circle, rgba(159, 28, 43, 0.18), transparent 45%);
  color: #f4d7d7;
  font-weight: 800;
  pointer-events: none;
  animation: fishing-bite-pulse 520ms ease-in-out infinite alternate;
}

@keyframes fishing-bite-pulse {
  from { opacity: 0.62; }
  to { opacity: 1; }
}
```

- [ ] **Step 4: 验收**

玩家在等待、咬钩、收竿三个阶段必须能从视觉上立刻分辨当前状态。

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/pages/fishing/FishingPage.tsx apps/web/src/styles/fishing.css
git commit -m "feat: add harbor fishing hud states"
```

### Task 6: 黑水港 Phase B - 渔获与结算反馈

**Files:**
- Modify: `apps/web/src/components/fishing/CatchReveal.tsx`
- Modify: `apps/web/src/styles/fishing.css`

- [ ] **Step 1: 读取 CatchReveal 现状**

Run:

```powershell
Get-Content apps/web/src/components/fishing/CatchReveal.tsx
```

- [ ] **Step 2: 结果卡增加稀有度视效**

在结果根节点增加：

```tsx
data-rarity={item.rarity}
className="catch-reveal"
```

- [ ] **Step 3: 添加稀有度样式**

在 `fishing.css` 添加：

```css
.catch-reveal {
  animation: catch-reveal-in 360ms ease both;
}

.catch-reveal[data-rarity="ELDRITCH"] {
  box-shadow: 0 0 42px rgba(159, 28, 43, 0.32), 0 20px 70px rgba(0, 0, 0, 0.5);
}

.catch-reveal[data-rarity="RARE"] {
  box-shadow: 0 0 34px rgba(201, 162, 39, 0.28), 0 20px 70px rgba(0, 0, 0, 0.45);
}

@keyframes catch-reveal-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

- [ ] **Step 4: 验收**

钓获结果必须比普通侧栏卡片更像游戏结算弹窗；出售和保留按钮保持 40px 以上可点击高度。

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/fishing/CatchReveal.tsx apps/web/src/styles/fishing.css
git commit -m "feat: add fishing catch reveal feedback"
```

### Task 7: 目标截图与部署

**Files:**
- Modify or Create: `outputs/visual-tests/harbor-oracle-game-ui-20260702/run-targeted-check.mjs`

- [ ] **Step 1: 目标截图覆盖**

截图只覆盖：

```text
/friends
/dream
/fishing
```

视口：

```text
1366x768
390x844
2560x1080
```

- [ ] **Step 2: 检查项**

脚本必须检查：

```js
const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
if (overflow > 1) throw new Error(`horizontal overflow ${overflow}`);
```

人工验收截图时必须确认：

```text
相邻主要 Surface 没有贴成连续黑条
黑水港 idle/waiting/biting/result 状态视觉可区分
溺者之牌 today/collection/history 三个 tab 都像同一套游戏系统
移动端主行动按钮不低于 40px 高
正文文字没有低透明金色或灰底灰字
```

- [ ] **Step 3: 最终验证**

Run:

```powershell
npm run check:ui-system
npm run typecheck
npm run lint
npm run build
```

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src pages docs apps/web/scripts apps/web/src/styles
git commit -m "feat: gameify harbor and oracle interfaces"
```

如果命令中的路径因 shell 展开失败，使用显式文件列表替代，不提交 `outputs/`。

- [ ] **Step 5: 静态前端部署**

沿用当前已验证流程：只替换服务器静态前端资源，保留 `/opt/coc-platform/apps/server/public/uploads`，不运行旧 `deploy.sh`，不重启后端。

---

## 4. 迭代顺序建议

1. **先修 Surface 粘连防回归。** 这是系统质量问题，会继续污染后续页面。
2. **再做好友页当前问题。** 这个问题截图明确，修复成本低，适合验证新 section group。
3. **溺者之牌先做仪式感。** 牌阵、翻牌、解牌反馈能快速提升“游戏感”。
4. **黑水港再做小游戏状态。** 等待、咬钩、收竿和渔获结算是它的核心节奏。
5. **最后统一截图验收和部署。** 不做全站深度测试，除非用户明确要求。

---

## 5. Self-Review

**Spec coverage:**

- 已覆盖用户指出的“两个卡片紧紧贴着”问题。
- 已将该问题升级为 UI 系统反模式和合约检查。
- 已覆盖黑水港更像游戏的 HUD、状态反馈、咬钩警示、渔获结算。
- 已覆盖溺者之牌更像游戏的牌阵舞台、选牌反馈、解牌动画、图鉴/历史统一体验。
- 已保留“不主动做深度测试”的约束，只要求目标截图和轻量验证。

**Placeholder scan:** 本计划没有 `TBD`、`TODO`、`implement later`。每个任务都有文件、代码片段、命令和验收结果。

**Type consistency:** 使用现有 `FishingState`、`DreamingPage`、`Surface`、`Button`、`Tabs`、`check-ui-system-contract.mjs` 命名，未引入无法定位的后端字段。

---

Plan complete and saved to `docs/superpowers/plans/2026-07-02-harbor-oracle-game-ui-upgrade.zh-CN.md`.

Recommended execution: use `superpowers:subagent-driven-development` for Tasks 1-7 with review after each task, or use `superpowers:executing-plans` inline when keeping all context in this thread is more important than speed.

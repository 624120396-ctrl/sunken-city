# 沉没之城前端系统 v2 Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **2026-07-04 status:** This is a historical Phase 1 implementation plan. Keep it as implementation history and low-level component context, but do not copy its black translucent card examples into new UI work. Current visual direction is governed by `2026-07-04-sunken-city-luminous-archive-visual-upgrade.zh-CN.md`; image2 assets are governed by `2026-07-04-sunken-city-ui-asset-pipeline.zh-CN.md`.

**Goal:** 建立沉没之城前端系统 v2 的第一阶段骨架，并以 Dashboard 作为首个样板页，同时保留现有数据、附件、路由和调查员卡片气质。

**Architecture:** Phase 1 采用“新增 v2 系统层，再逐步接入”的方式。先新增 token、背景层、基础组件和 AppShell v2，再迁移 Dashboard；不改 Socket、角色卡计算、骰子、战斗、上传、数据库 schema。背景选择继续使用现有 `preferredBackground` 字段，但入口只放在个人设置或用户菜单内。

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router, lucide-react, motion/react.

---

## 0. 计划审计结论

当前设计规格可以进入实施计划阶段，没有发现阻断性问题。需要在执行中收紧以下边界:

1. “激进”只用于前端代码和样式，不用于生产数据库、附件和后端数据结构。
2. 当前 `ProfilePage` 已有全局背景选择，Phase 1 不是新增后端能力，而是把背景选项抽到共享模块，并交给 v2 背景层渲染。
3. 当前 `usePageBackground` 直接写 `document.body.style.backgroundImage`，这会和 AppShell 背景层冲突。Phase 1 应新增 `AppBackground` 并在接入后停止依赖 body 背景。
4. Dashboard 中“我的调查员”卡片效果已满足用户偏好，迁移时必须提取并保留该视觉基准，不重画成普通资料卡。
5. `/solo` 和 `/scenarios` 已迁出到 Project Lunar，Phase 1 只隐藏或弱化入口，不删除路由文件。
6. 移动端首要目标是进入房间并参与游戏，因此移动底栏应优先保留 `/rooms`，其他低频功能可以进入用户菜单或侧栏。
7. 本项目已有旧 v2.1/v2.3 样式，Phase 1 不一次性删除 `styles/index.css` 大段旧样式，只新增 v2 系统文件并把样板页接入。

## 1. 文件结构

### 新增文件

- `apps/web/src/styles/tokens-v2.css`  
  v2 CSS variables、语义色、间距、圆角、阴影、动效变量。

- `apps/web/src/styles/background-v2.css`  
  AppBackground、背景遮罩、暗角、弱化移动端背景、reduced-motion 处理。

- `apps/web/src/styles/system-v2.css`  
  Surface、Card、Button、Tabs、ListRow、Stat 的低层类名，不继续把所有样式堆进 `index.css`。

- `apps/web/src/components/system/index.ts`  
  v2 系统组件统一导出。

- `apps/web/src/components/system/Surface.tsx`  
  页面、面板、浮层的基础承载层。

- `apps/web/src/components/system/Card.tsx`  
  v2 卡片基础组件，包含 `character` variant 但不直接决定栅格。

- `apps/web/src/components/system/Button.tsx`  
  v2 按钮，覆盖 primary、secondary、danger、ghost、icon、loading、disabled。

- `apps/web/src/components/system/Tabs.tsx`  
  Tabs 与 SegmentedControl 的第一阶段实现。

- `apps/web/src/components/system/ListRow.tsx`  
  列表行，供论坛、房间活动、通知后续复用。

- `apps/web/src/components/system/Stat.tsx`  
  数值展示组件，供 Dashboard 和角色状态使用。

- `apps/web/src/components/system/EmptyState.tsx`  
  空状态组件。

- `apps/web/src/components/system/CharacterCard.tsx`  
  从当前 Dashboard “我的调查员”视觉提取，保留人物立绘、左侧磨砂、HP/SAN 状态条、角色名和职业。

- `apps/web/src/components/background/backgroundOptions.ts`  
  背景 id、名称、url、默认值。替代 `usePageBackground.ts` 和 `ProfilePage.tsx` 各自维护列表。

- `apps/web/src/components/background/AppBackground.tsx`  
  全局背景层，读取用户 `preferredBackground`，负责遮罩、暗角和加载失败回退。

- `apps/web/src/components/background/BackgroundPicker.tsx`  
  背景选择器 UI，迁入个人设置/用户菜单。

- `apps/web/src/components/layout/AppShellV2.tsx`  
  v2 主站布局壳，承载 TopNav、SideNav、MobileNav、AppBackground 和内容区。

- `apps/web/src/components/layout/SideNavV2.tsx`  
  桌面侧栏，保留现有导航气质，隐藏或弱化 Project Lunar 迁出入口。

- `apps/web/src/components/layout/MobileNavV2.tsx`  
  移动端底栏，房间优先。

### 修改文件

- `apps/web/src/styles/index.css`  
  只增加 v2 css import，不删除旧样式。

- `apps/web/src/App.tsx`  
  停止调用 `usePageBackground()`，主站路由从 `MainLayout` 切换到 `AppShellV2`。管理后台暂不迁移。

- `apps/web/src/components/layout/TopNav.tsx`  
  保留现有功能，补充用户菜单中的背景入口或承载 `BackgroundPicker` 的弹出入口。

- `apps/web/src/pages/profile/ProfilePage.tsx`  
  替换内联背景选择网格为 `BackgroundPicker`，保留保存逻辑和 API `/auth/me`。

- `apps/web/src/pages/dashboard/DashboardPage.tsx`  
  使用 v2 Surface/Card/Button/Stat/CharacterCard 重组页面，保留现有数据请求和 socket 在线人数逻辑。

- `apps/web/src/hooks/usePageBackground.ts`  
  第一阶段改为兼容导出背景常量，或在 AppShell 接入后停止使用。不要继续写 body 背景。

### 不修改文件

- `apps/server/prisma/dev.db`
- `apps/server/prisma/database.sqlite`
- `apps/server/public/uploads/**`
- `apps/server/src/modules/rooms/**`
- `apps/web/src/hooks/useSocket.ts`
- `apps/web/src/hooks/useCombat.ts`
- `apps/web/src/pages/rooms/RoomPage.tsx`
- `apps/web/src/services/upload.service.ts`
- `apps/web/src/pages/characters/CharacterCreateV2Page.tsx`

## 2. 执行任务

### Task 1: 安全边界与资源接入检查

**Files:**
- Modify: `docs/superpowers/plans/2026-06-30-sunken-city-frontend-system-v2-phase1.md`
- Inspect only: `deploy.sh`
- Inspect only: `scripts/deploy.sh`
- Inspect only: `apps/web/public/logo.png`
- Inspect only: `apps/web/public/favicon.png`
- Inspect only: `apps/web/public/app-icon.png`

- [ ] **Step 1: 确认工作区不混入生产数据**

Run:

```powershell
git status --short --branch
```

Expected:

```text
## master...origin/master [ahead 1]
```

允许出现本计划文件和后续前端源码改动；不得出现 `dev.db`、`.env`、`uploads/`、`public/assets/` 被 staged。

- [ ] **Step 2: 检查部署脚本是否保护 uploads 和数据库**

Run:

```powershell
rg -n "uploads|dev\.db|database\.sqlite|public/assets|rsync|delete" deploy.sh scripts/deploy.sh
```

Expected:

```text
deploy.sh 或 scripts/deploy.sh 中能看到 uploads/database/env 保护或排除逻辑。
```

如果输出显示部署会删除 `apps/server/public/uploads/` 或覆盖生产数据库，先停止实施，只修部署保护。

- [ ] **Step 3: 确认品牌资源路径**

Run:

```powershell
Get-Item "apps\web\public\logo.png","apps\web\public\favicon.png","apps\web\public\app-icon.png" | Select-Object FullName,Length
```

Expected:

```text
三个资源均存在，Length 大于 0。
```

如需替换为用户提供的新 logo/icon，先复制原文件为 `.bak`，再替换公共资源，不改 uploads。

- [ ] **Step 4: Commit 安全检查结果或资源替换**

Run:

```powershell
git add apps/web/public/logo.png apps/web/public/favicon.png apps/web/public/app-icon.png
git commit -m "chore: align frontend brand assets"
```

Expected:

```text
[master <hash>] chore: align frontend brand assets
```

如果资源无需替换，则跳过本 commit。

### Task 2: 建立 v2 token 与样式入口

**Files:**
- Create: `apps/web/src/styles/tokens-v2.css`
- Create: `apps/web/src/styles/background-v2.css`
- Create: `apps/web/src/styles/system-v2.css`
- Modify: `apps/web/src/styles/index.css`

- [ ] **Step 1: 创建 v2 token 文件**

Create `apps/web/src/styles/tokens-v2.css`:

```css
:root {
  --coc-bg-abyss: #06070b;
  --coc-bg-page: #0a0d12;
  --coc-surface-0: rgba(8, 9, 14, 0.94);
  --coc-surface-1: rgba(16, 18, 26, 0.86);
  --coc-surface-2: rgba(22, 24, 34, 0.94);
  --coc-surface-muted: rgba(21, 24, 31, 0.72);
  --coc-border-subtle: rgba(212, 197, 168, 0.12);
  --coc-border-strong: rgba(201, 162, 39, 0.34);
  --coc-accent-gold: #c9a227;
  --coc-accent-gold-strong: #e8d4a0;
  --coc-accent-blood: #8b2635;
  --coc-accent-blood-strong: #b94355;
  --coc-accent-madness: #7a4fa1;
  --coc-accent-ocean: #3d8fa3;
  --coc-success: #4fa36a;
  --coc-warning: #d5a643;
  --coc-danger: #c44857;
  --coc-text-primary: #f4ead4;
  --coc-text-secondary: #c9b894;
  --coc-text-muted: #8e826b;
  --coc-text-inverse: #090a0f;
  --coc-text-gold: #e8d4a0;
  --coc-radius-control: 4px;
  --coc-radius-card: 8px;
  --coc-shadow-panel: 0 18px 48px rgba(0, 0, 0, 0.38);
  --coc-shadow-glow-gold: 0 0 24px rgba(201, 162, 39, 0.12);
  --coc-motion-fast: 150ms;
  --coc-motion-base: 220ms;
  --coc-motion-slow: 320ms;
  --coc-ease-out: cubic-bezier(0.22, 1, 0.36, 1);
}
```

- [ ] **Step 2: 创建背景样式**

Create `apps/web/src/styles/background-v2.css`:

```css
.coc-app-bg {
  position: fixed;
  inset: 0;
  z-index: -2;
  background-color: var(--coc-bg-abyss);
  overflow: hidden;
}

.coc-app-bg__image {
  position: absolute;
  inset: -24px;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  filter: saturate(0.84) contrast(1.05) brightness(0.72);
  transform: scale(1.02);
}

.coc-app-bg__veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 20%, rgba(201, 162, 39, 0.08), transparent 28%),
    linear-gradient(90deg, rgba(4, 5, 8, 0.84), rgba(4, 5, 8, 0.46) 45%, rgba(4, 5, 8, 0.74)),
    linear-gradient(180deg, rgba(4, 5, 8, 0.76), rgba(4, 5, 8, 0.18) 36%, rgba(4, 5, 8, 0.86));
}

@media (max-width: 767px) {
  .coc-app-bg__image {
    filter: saturate(0.72) contrast(1) brightness(0.52);
  }
}

@media (prefers-reduced-motion: reduce) {
  .coc-app-bg__image {
    transform: none;
  }
}
```

- [ ] **Step 3: 创建系统样式**

Create `apps/web/src/styles/system-v2.css`:

```css
.coc-surface-v2 {
  border: 1px solid var(--coc-border-subtle);
  border-radius: var(--coc-radius-card);
  background: var(--coc-surface-1);
  box-shadow: var(--coc-shadow-panel);
}

.coc-surface-v2[data-variant="solid"] {
  background: var(--coc-surface-2);
}

.coc-surface-v2[data-variant="glass"] {
  background: rgba(12, 15, 22, 0.62);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.coc-card-v2 {
  position: relative;
  border-radius: var(--coc-radius-card);
  border: 1px solid var(--coc-border-subtle);
  background: rgba(10, 11, 17, 0.72);
  box-shadow: 0 10px 34px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.coc-card-v2[data-interactive="true"] {
  transition: transform var(--coc-motion-base) var(--coc-ease-out), border-color var(--coc-motion-base), box-shadow var(--coc-motion-base);
}

.coc-card-v2[data-interactive="true"]:hover {
  transform: translateY(-2px);
  border-color: rgba(201, 162, 39, 0.26);
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.44), var(--coc-shadow-glow-gold);
}

.coc-focus-ring:focus-visible {
  outline: 2px solid var(--coc-accent-gold);
  outline-offset: 2px;
}
```

- [ ] **Step 4: 接入样式入口**

Modify the top of `apps/web/src/styles/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import './tokens-v2.css';
@import './background-v2.css';
@import './system-v2.css';
```

If Vite/PostCSS rejects `@import` after Tailwind directives, move the imports before Tailwind:

```css
@import './tokens-v2.css';
@import './background-v2.css';
@import './system-v2.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: 轻量验证**

Run:

```powershell
cd apps/web
npm run typecheck
```

Expected:

```text
tsc --noEmit
```

TypeScript should complete without new errors. This is a light type check, not a deep browser test.

- [ ] **Step 6: Commit**

Run:

```powershell
git add apps/web/src/styles/tokens-v2.css apps/web/src/styles/background-v2.css apps/web/src/styles/system-v2.css apps/web/src/styles/index.css
git commit -m "feat: add frontend v2 design tokens"
```

Expected:

```text
[master <hash>] feat: add frontend v2 design tokens
```

### Task 3: 建立 v2 基础组件

**Files:**
- Create: `apps/web/src/components/system/Surface.tsx`
- Create: `apps/web/src/components/system/Card.tsx`
- Create: `apps/web/src/components/system/Button.tsx`
- Create: `apps/web/src/components/system/Tabs.tsx`
- Create: `apps/web/src/components/system/ListRow.tsx`
- Create: `apps/web/src/components/system/Stat.tsx`
- Create: `apps/web/src/components/system/EmptyState.tsx`
- Create: `apps/web/src/components/system/index.ts`

- [ ] **Step 1: 创建 Surface**

Create `apps/web/src/components/system/Surface.tsx`:

```tsx
import { cn } from '@lib/utils';

type SurfaceVariant = 'base' | 'panel' | 'elevated' | 'glass' | 'solid' | 'danger';
type SurfacePadding = 'none' | 'sm' | 'md' | 'lg';

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SurfaceVariant;
  padding?: SurfacePadding;
  interactive?: boolean;
}

const paddingClass: Record<SurfacePadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4 md:p-5',
  lg: 'p-5 md:p-6',
};

export function Surface({
  variant = 'panel',
  padding = 'md',
  interactive = false,
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      data-variant={variant}
      data-interactive={interactive ? 'true' : 'false'}
      className={cn('coc-surface-v2', paddingClass[padding], className)}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: 创建 Card**

Create `apps/web/src/components/system/Card.tsx`:

```tsx
import { cn } from '@lib/utils';

type CardVariant = 'default' | 'featured' | 'room' | 'character' | 'item' | 'log';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

export function Card({
  variant = 'default',
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      data-variant={variant}
      data-interactive={interactive ? 'true' : 'false'}
      className={cn('coc-card-v2', className)}
      {...props}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: 创建 Button**

Create `apps/web/src/components/system/Button.tsx`:

```tsx
import { Loader2 } from 'lucide-react';
import { cn } from '@lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--coc-accent-gold)] text-[var(--coc-text-inverse)] hover:bg-[var(--coc-accent-gold-strong)]',
  secondary: 'bg-black/35 text-[var(--coc-text-primary)] border border-[var(--coc-border-subtle)] hover:border-[var(--coc-border-strong)]',
  danger: 'bg-[var(--coc-accent-blood)] text-white hover:bg-[var(--coc-accent-blood-strong)]',
  ghost: 'bg-transparent text-[var(--coc-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)]',
  icon: 'bg-black/25 text-[var(--coc-text-secondary)] border border-[var(--coc-border-subtle)] hover:text-[var(--coc-text-primary)]',
};

const sizeClass: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const isIconOnly = variant === 'icon' && !children;

  return (
    <button
      className={cn(
        'coc-focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--coc-radius-control)] font-medium transition disabled:pointer-events-none disabled:opacity-50',
        variantClass[variant],
        isIconOnly ? 'h-10 w-10 p-0' : sizeClass[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}
```

- [ ] **Step 4: 创建 Tabs**

Create `apps/web/src/components/system/Tabs.tsx`:

```tsx
import { cn } from '@lib/utils';

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs({ items, value, onChange, ariaLabel, className }: TabsProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn('inline-flex rounded-md border border-[var(--coc-border-subtle)] bg-black/30 p-1', className)}>
      {items.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={cn(
              'coc-focus-ring min-h-9 rounded px-3 text-sm transition',
              selected
                ? 'bg-[var(--coc-accent-gold)] text-[var(--coc-text-inverse)]'
                : 'text-[var(--coc-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)]'
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="ml-1 opacity-70">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: 创建 ListRow**

Create `apps/web/src/components/system/ListRow.tsx`:

```tsx
import { cn } from '@lib/utils';

interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  meta?: React.ReactNode;
  description?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export function ListRow({ title, meta, description, leading, trailing, className, ...props }: ListRowProps) {
  return (
    <div
      className={cn('flex min-h-14 items-center gap-3 border-b border-[var(--coc-border-subtle)] px-3 py-2 last:border-b-0', className)}
      {...props}
    >
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium text-[var(--coc-text-primary)]">{title}</div>
          {meta && <div className="shrink-0 text-xs text-[var(--coc-text-muted)]">{meta}</div>}
        </div>
        {description && <div className="mt-0.5 line-clamp-2 text-xs text-[var(--coc-text-secondary)]">{description}</div>}
      </div>
      {trailing && <div className="shrink-0">{trailing}</div>}
    </div>
  );
}
```

- [ ] **Step 6: 创建 Stat**

Create `apps/web/src/components/system/Stat.tsx`:

```tsx
import { cn } from '@lib/utils';

type StatTone = 'gold' | 'blood' | 'madness' | 'ocean' | 'neutral';

interface StatProps {
  label: string;
  value: React.ReactNode;
  tone?: StatTone;
  className?: string;
}

const toneClass: Record<StatTone, string> = {
  gold: 'text-[var(--coc-accent-gold-strong)]',
  blood: 'text-[var(--coc-accent-blood-strong)]',
  madness: 'text-[var(--coc-accent-madness)]',
  ocean: 'text-[var(--coc-accent-ocean)]',
  neutral: 'text-[var(--coc-text-primary)]',
};

export function Stat({ label, value, tone = 'neutral', className }: StatProps) {
  return (
    <div className={cn('rounded-md border border-[var(--coc-border-subtle)] bg-black/20 px-3 py-2', className)}>
      <div className={cn('font-mono text-lg font-bold leading-none', toneClass[tone])}>{value}</div>
      <div className="mt-1 text-[11px] text-[var(--coc-text-muted)]">{label}</div>
    </div>
  );
}
```

- [ ] **Step 7: 创建 EmptyState**

Create `apps/web/src/components/system/EmptyState.tsx`:

```tsx
import { cn } from '@lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-[var(--coc-border-subtle)] bg-black/24 px-6 py-10 text-center', className)}>
      {icon && <div className="mb-3 text-[var(--coc-text-muted)]">{icon}</div>}
      <div className="font-medium text-[var(--coc-text-primary)]">{title}</div>
      {description && <div className="mt-1 max-w-md text-sm text-[var(--coc-text-muted)]">{description}</div>}
      {actionLabel && onAction && (
        <Button type="button" variant="primary" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 8: 创建统一导出**

Create `apps/web/src/components/system/index.ts`:

```ts
export { Surface } from './Surface';
export { Card } from './Card';
export { Button } from './Button';
export { Tabs, type TabItem } from './Tabs';
export { ListRow } from './ListRow';
export { Stat } from './Stat';
export { EmptyState } from './EmptyState';
```

- [ ] **Step 9: 轻量验证并提交**

Run:

```powershell
cd apps/web
npm run typecheck
```

Expected: TypeScript passes or reports only pre-existing errors. If errors are caused by these new components, fix before commit.

Commit:

```powershell
git add apps/web/src/components/system apps/web/src/styles/system-v2.css
git commit -m "feat: add frontend v2 system components"
```

### Task 4: 建立背景层与背景选择器

**Files:**
- Create: `apps/web/src/components/background/backgroundOptions.ts`
- Create: `apps/web/src/components/background/AppBackground.tsx`
- Create: `apps/web/src/components/background/BackgroundPicker.tsx`
- Modify: `apps/web/src/hooks/usePageBackground.ts`
- Modify: `apps/web/src/pages/profile/ProfilePage.tsx`

- [ ] **Step 1: 创建背景选项模块**

Create `apps/web/src/components/background/backgroundOptions.ts`:

```ts
export interface BackgroundOption {
  id: string;
  name: string;
  url: string;
}

export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: 'bg-vellum', name: '羊皮纸', url: '/bg-vellum.png' },
  { id: 'bg-sunken', name: '沉没之城', url: '/bg-sunken.png' },
  { id: 'bg-ocean-blue', name: '深海蓝', url: '/bg-ocean-blue.png' },
  { id: 'bg-ruins-beige', name: '废墟米', url: '/bg-ruins-beige.png' },
  { id: 'bg-deep-sea', name: '深海遗迹', url: '/bg-deep-sea.png' },
  { id: 'bg-underwater-city', name: '水下城邦', url: '/bg-underwater-city.png' },
  { id: 'bg-void-runes', name: '虚空符文', url: '/bg-void-runes.png' },
];

export const DEFAULT_BACKGROUND_ID = 'bg-sunken';

export function getBackgroundById(id?: string | null): BackgroundOption {
  return BACKGROUND_OPTIONS.find((item) => item.id === id) ?? BACKGROUND_OPTIONS.find((item) => item.id === DEFAULT_BACKGROUND_ID)!;
}
```

- [ ] **Step 2: 创建 AppBackground**

Create `apps/web/src/components/background/AppBackground.tsx`:

```tsx
import { useState } from 'react';
import { useAuthStore } from '@stores/auth.store';
import { getBackgroundById, DEFAULT_BACKGROUND_ID } from './backgroundOptions';

export function AppBackground() {
  const preferredBackground = useAuthStore((state) => state.user?.preferredBackground);
  const [failed, setFailed] = useState(false);
  const selected = getBackgroundById(failed ? DEFAULT_BACKGROUND_ID : preferredBackground);

  return (
    <div className="coc-app-bg" aria-hidden="true">
      <div
        key={selected.id}
        className="coc-app-bg__image"
        style={{ backgroundImage: `url("${selected.url}")` }}
      >
        <img
          src={selected.url}
          alt=""
          className="hidden"
          onError={() => setFailed(true)}
          onLoad={() => setFailed(false)}
        />
      </div>
      <div className="coc-app-bg__veil" />
    </div>
  );
}
```

- [ ] **Step 3: 创建 BackgroundPicker**

Create `apps/web/src/components/background/BackgroundPicker.tsx`:

```tsx
import { Check, Save } from 'lucide-react';
import { BACKGROUND_OPTIONS } from './backgroundOptions';
import { Button, Surface } from '@components/system';

interface BackgroundPickerProps {
  value: string;
  saving?: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

export function BackgroundPicker({ value, saving = false, onChange, onSave }: BackgroundPickerProps) {
  return (
    <Surface variant="glass" padding="lg">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-[var(--coc-text-gold)]">
        全局背景
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {BACKGROUND_OPTIONS.map((bg) => {
          const selected = value === bg.id;
          return (
            <button
              key={bg.id}
              type="button"
              onClick={() => onChange(bg.id)}
              className="coc-focus-ring relative overflow-hidden rounded-md border transition"
              style={{ borderColor: selected ? 'var(--coc-accent-gold)' : 'var(--coc-border-subtle)' }}
              aria-pressed={selected}
            >
              <img src={bg.url} alt={bg.name} className="h-24 w-full object-cover" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 text-left">
                <span className="text-xs text-[var(--coc-text-primary)]">{bg.name}</span>
              </div>
              {selected && (
                <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--coc-accent-gold)] text-black">
                  <Check size={14} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      <Button className="mt-4" variant="primary" loading={saving} icon={<Save size={16} />} onClick={onSave}>
        {saving ? '保存中...' : '保存背景'}
      </Button>
    </Surface>
  );
}
```

- [ ] **Step 4: 改造 `usePageBackground` 为兼容导出**

Modify `apps/web/src/hooks/usePageBackground.ts`:

```ts
import { BACKGROUND_OPTIONS, DEFAULT_BACKGROUND_ID, getBackgroundById } from '@components/background/backgroundOptions';

export const BG_OPTIONS = Object.fromEntries(
  BACKGROUND_OPTIONS.map((item) => [item.id, { name: item.name, url: item.url }])
);

export const DEFAULT_BG = getBackgroundById(DEFAULT_BACKGROUND_ID).url;

export function usePageBackground() {
  return;
}
```

- [ ] **Step 5: 在个人中心使用 BackgroundPicker**

In `apps/web/src/pages/profile/ProfilePage.tsx`, replace the inline background grid with:

```tsx
<BackgroundPicker
  value={selectedBackground}
  saving={savingBackground}
  onChange={setSelectedBackground}
  onSave={handleSaveBackground}
/>
```

Add imports:

```tsx
import { BackgroundPicker } from '@components/background/BackgroundPicker';
import { DEFAULT_BACKGROUND_ID } from '@components/background/backgroundOptions';
```

Change state initialization:

```tsx
const [selectedBackground, setSelectedBackground] = useState(user?.preferredBackground || DEFAULT_BACKGROUND_ID);
```

Remove now-unused `ImageIcon` import if TypeScript reports it unused.

- [ ] **Step 6: 轻量验证并提交**

Run:

```powershell
cd apps/web
npm run typecheck
```

Commit:

```powershell
git add apps/web/src/components/background apps/web/src/hooks/usePageBackground.ts apps/web/src/pages/profile/ProfilePage.tsx
git commit -m "feat: add frontend v2 background layer"
```

### Task 5: 建立 AppShell v2 与导航

**Files:**
- Create: `apps/web/src/components/layout/AppShellV2.tsx`
- Create: `apps/web/src/components/layout/SideNavV2.tsx`
- Create: `apps/web/src/components/layout/MobileNavV2.tsx`
- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: 创建 SideNavV2**

Create `apps/web/src/components/layout/SideNavV2.tsx`:

```tsx
import { BookOpen, User, Home, ShoppingBag, MessageSquare, Backpack, Store, Users, Fish, Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@lib/utils';
import { Tooltip } from '@components/ui/Tooltip';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/characters', label: '调查员', icon: User },
  { path: '/rooms', label: '故事书', icon: BookOpen },
  { path: '/friends', label: '好友', icon: Users },
  { path: '/fishing', label: '黑水港', icon: Fish },
  { path: '/dream', label: '溺者之牌', icon: Moon },
  { path: '/shop', label: '拉莱耶遗珍', icon: ShoppingBag },
  { path: '/inventory', label: '背包', icon: Backpack },
  { path: '/market', label: '市场', icon: Store },
  { path: '/forums', label: '旧日低语', icon: MessageSquare },
];

interface SideNavV2Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function SideNavV2({ collapsed, onToggle }: SideNavV2Props) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <aside className={cn('fixed bottom-0 left-0 top-14 z-40 flex flex-col border-r border-[var(--coc-border-subtle)] bg-black/70 backdrop-blur-xl transition-all', collapsed ? 'w-14' : 'w-56')}>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const link = (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'coc-focus-ring flex items-center rounded-md transition',
                collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-2.5',
                active ? 'bg-[rgba(139,38,53,0.72)] text-[var(--coc-text-gold)] shadow-[0_0_18px_rgba(139,38,53,0.22)]' : 'text-[var(--coc-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)]'
              )}
            >
              <Icon size={20} className="shrink-0" />
              <span className={cn('whitespace-nowrap transition', collapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100')}>{item.label}</span>
            </Link>
          );

          return collapsed ? <Tooltip key={item.path} content={item.label} position="right">{link}</Tooltip> : link;
        })}
      </nav>
      <div className="border-t border-[var(--coc-border-subtle)] p-2">
        <button type="button" onClick={onToggle} className={cn('coc-focus-ring flex w-full items-center rounded-md text-[var(--coc-text-muted)] hover:bg-white/[0.06]', collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-2.5')}>
          {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /><span className="text-sm">收起导航</span></>}
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: 创建 MobileNavV2**

Create `apps/web/src/components/layout/MobileNavV2.tsx`:

```tsx
import { BookOpen, Home, User, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@lib/utils';

const items = [
  { path: '/rooms', label: '房间', icon: BookOpen },
  { path: '/', label: '首页', icon: Home },
  { path: '/characters', label: '调查员', icon: User },
  { path: '/forums', label: '低语', icon: MessageSquare },
  { path: '/profile', label: '我的', icon: User },
];

export function MobileNavV2() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(3.75rem+env(safe-area-inset-bottom))] items-center justify-around border-t border-[var(--coc-border-subtle)] bg-black/78 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.path);
        return (
          <Link key={item.path} to={item.path} className={cn('coc-focus-ring flex min-h-11 min-w-12 flex-col items-center justify-center gap-1 rounded-md px-2 text-[11px]', active ? 'text-[var(--coc-text-gold)]' : 'text-[var(--coc-text-muted)]')}>
            <Icon size={20} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: 创建 AppShellV2**

Create `apps/web/src/components/layout/AppShellV2.tsx`:

```tsx
import { useEffect } from 'react';
import { cn } from '@lib/utils';
import { useLayoutStore } from '@stores/layout.store';
import { AppBackground } from '@components/background/AppBackground';
import { TopNav } from './TopNav';
import { SideNavV2 } from './SideNavV2';
import { MobileNavV2 } from './MobileNavV2';

interface AppShellV2Props {
  children: React.ReactNode;
}

export function AppShellV2({ children }: AppShellV2Props) {
  const { sidebarCollapsed, isMobile, setMobile, toggleSidebar } = useLayoutStore();

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [setMobile]);

  return (
    <div className="relative min-h-[100dvh] text-[var(--coc-text-primary)]">
      <AppBackground />
      <TopNav />
      {!isMobile && <SideNavV2 collapsed={sidebarCollapsed} onToggle={toggleSidebar} />}
      <main
        className={cn(
          'fixed bottom-0 right-0 top-14 z-0 overflow-auto transition-all',
          isMobile ? 'left-0 px-3 pb-[calc(4.25rem+env(safe-area-inset-bottom))] pt-3' : sidebarCollapsed ? 'left-14 p-5' : 'left-56 p-5'
        )}
      >
        {children}
      </main>
      {isMobile && <MobileNavV2 />}
    </div>
  );
}
```

- [ ] **Step 4: 在 App.tsx 接入 AppShellV2**

In `apps/web/src/App.tsx`:

```tsx
import { AppShellV2 } from '@components/layout/AppShellV2';
```

Remove:

```tsx
import { usePageBackground } from '@hooks/usePageBackground';
import { MainLayout } from '@components/layout/MainLayout';
```

Remove the call:

```tsx
usePageBackground();
```

Replace:

```tsx
<MainLayout>
```

with:

```tsx
<AppShellV2>
```

Replace:

```tsx
</MainLayout>
```

with:

```tsx
</AppShellV2>
```

- [ ] **Step 5: 轻量验证并提交**

Run:

```powershell
cd apps/web
npm run typecheck
```

Commit:

```powershell
git add apps/web/src/components/layout/AppShellV2.tsx apps/web/src/components/layout/SideNavV2.tsx apps/web/src/components/layout/MobileNavV2.tsx apps/web/src/App.tsx
git commit -m "feat: add frontend v2 app shell"
```

### Task 6: 提取调查员卡片并迁移 Dashboard 样板

**Files:**
- Create: `apps/web/src/components/system/CharacterCard.tsx`
- Modify: `apps/web/src/components/system/index.ts`
- Modify: `apps/web/src/pages/dashboard/DashboardPage.tsx`

- [ ] **Step 1: 创建 CharacterCard，保留现有展示效果**

Create `apps/web/src/components/system/CharacterCard.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { OccultBadge } from '@components/ui/OccultBadge';
import { CthulhuProgress } from '@components/ui/CthulhuProgress';

export interface CharacterCardData {
  id: string;
  name: string;
  occupation: string;
  hp: number;
  san: number;
  maxHp: number;
  maxSan: number;
  portraitUrl?: string | null;
}

interface CharacterCardProps {
  character: CharacterCardData;
}

export function CharacterCard({ character }: CharacterCardProps) {
  return (
    <Link to={`/characters/${character.id}`} className="group block">
      <div className="relative h-full min-h-[180px] overflow-hidden rounded-lg border border-[#3a3a3a]/40 bg-black/50 shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-[#8b2635]/30 hover:shadow-[0_0_30px_rgba(139,38,53,0.12)]">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={character.portraitUrl || '/dashboard-character-default.png'}
            alt=""
            className="h-[120%] w-full object-cover object-top animate-character-pan"
            draggable={false}
          />
        </div>
        <div
          className="absolute inset-y-0 left-0 w-[45%] bg-[#0a0a0f]/40 backdrop-blur-[13px]"
          style={{
            maskImage: 'linear-gradient(to right, black 60%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 60%, transparent 100%)',
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-[#8b2635]/30 via-[#8b2635]/10 to-transparent" />
        <div className="absolute left-[15%] right-[15%] top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative flex h-full min-h-[180px] max-w-[55%] flex-col p-5">
          <div className="mb-2">
            <h3 className="text-base font-bold tracking-wide text-[#f5f0e6]">{character.name}</h3>
            <p className="mt-0.5 text-xs tracking-wider text-[#a69b85]">{character.occupation}</p>
          </div>
          <div className="mt-auto space-y-2">
            <CthulhuProgress type="status" variant="hp" current={character.hp} max={character.maxHp} />
            <CthulhuProgress type="status" variant="san" current={character.san} max={character.maxSan} />
          </div>
          {character.san < 30 && (
            <div className="mt-2">
              <OccultBadge type="eye2" size="sm" pulse label="疯狂" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: 导出 CharacterCard**

Modify `apps/web/src/components/system/index.ts`:

```ts
export { CharacterCard, type CharacterCardData } from './CharacterCard';
```

- [ ] **Step 3: Dashboard 使用 CharacterCard**

In `apps/web/src/pages/dashboard/DashboardPage.tsx`, add:

```tsx
import { CharacterCard } from '@components/system';
```

Replace the repeated character card markup inside `characters.map` with:

```tsx
<CharacterCard character={char} />
```

Keep the surrounding `motion.div`, `className="flex-shrink-0 w-80"` and loading/empty states.

- [ ] **Step 4: 弱化 Project Lunar 迁出入口**

In the Dashboard `quickActions` array, remove the `/solo` action from the primary 2x2 grid:

```tsx
const quickActions = [
  { to: '/characters/new', icon: User, title: '记录命运', subtitle: '创建调查员', bgImage: '/dashboard-card-character.png', glowColor: 'from-[#8b2635]/40 via-transparent' },
  { to: '/rooms', icon: Scroll, title: '开启故事', subtitle: '创建跑团房间', bgImage: '/dashboard-card-room.png', glowColor: 'from-[#8b2635]/40 via-transparent' },
  { to: '/rooms', icon: Sparkles, title: '进入深渊', subtitle: '加入已有跑团', bgImage: '/dashboard-card-abyss.png', glowColor: 'from-[#8b2635]/40 via-transparent' },
];
```

This keeps routes available but stops presenting solo as a main Phase 1 entry.

- [ ] **Step 5: 轻量验证并提交**

Run:

```powershell
cd apps/web
npm run typecheck
```

Commit:

```powershell
git add apps/web/src/components/system/CharacterCard.tsx apps/web/src/components/system/index.ts apps/web/src/pages/dashboard/DashboardPage.tsx
git commit -m "feat: migrate dashboard investigator cards to v2"
```

### Task 7: Phase 1 收尾检查

**Files:**
- Inspect: `apps/web/src/App.tsx`
- Inspect: `apps/web/src/pages/dashboard/DashboardPage.tsx`
- Inspect: `apps/web/src/pages/profile/ProfilePage.tsx`
- Inspect: `apps/web/src/components/background/*`
- Inspect: `apps/web/src/components/system/*`
- Inspect: `apps/web/src/components/layout/*V2.tsx`

- [ ] **Step 1: 搜索禁止触碰区域**

Run:

```powershell
git diff --name-only HEAD~5..HEAD
```

Expected:

```text
Only apps/web frontend style/component/layout/dashboard/profile/public resource files.
```

If `apps/server/prisma/dev.db`、`uploads/`、`RoomPage.tsx`、`useSocket.ts`、`useCombat.ts` appear, stop and inspect before continuing.

- [ ] **Step 2: 搜索残留 body 背景写入**

Run:

```powershell
rg -n "document\.body\.style\.backgroundImage|usePageBackground\\(" apps/web/src
```

Expected:

```text
No matches, or only the inert compatibility hook definition.
```

- [ ] **Step 3: 搜索临时文本与调试残留**

Run:

```powershell
rg -n "FIXME|临时|待处理|console\\.log\\(|debugger" apps/web/src/components/background apps/web/src/components/system apps/web/src/components/layout apps/web/src/pages/dashboard apps/web/src/pages/profile
```

Expected:

```text
No matches, except pre-existing Dashboard socket console logging if it remains unchanged.
```

- [ ] **Step 4: TypeScript 轻量检查**

Run:

```powershell
cd apps/web
npm run typecheck
```

Expected:

```text
tsc --noEmit
```

- [ ] **Step 5: Git 差异检查**

Run:

```powershell
git diff --check
git status --short --branch
```

Expected:

```text
git diff --check exits 0 or only reports Windows line-ending warnings.
No untracked build artifacts are staged.
```

- [ ] **Step 6: Final commit if any cleanup was needed**

Run:

```powershell
git add apps/web/src
git commit -m "chore: finalize frontend v2 phase 1 shell"
```

Expected:

```text
[master <hash>] chore: finalize frontend v2 phase 1 shell
```

Skip this commit if no cleanup changed files.

## 3. Phase 1 验收标准

Phase 1 完成后必须满足:

- `AppShellV2` 承载主站页面，管理后台仍走旧 `AdminLayout`。
- `AppBackground` 负责背景渲染，`usePageBackground` 不再写 body。
- `BackgroundPicker` 位于个人中心或用户菜单，不出现在 Dashboard 主内容。
- Dashboard 保留“我的调查员”，并使用从现有效果提取的 `CharacterCard`。
- 移动底栏以房间访问为第一优先级。
- `/solo` 不再作为 Dashboard 主入口。
- 不修改后端数据库、uploads、Socket、骰子、战斗、角色卡计算和上传服务。
- 只运行轻量检查: `npm run typecheck`、`rg`、`git diff --check`、`git status`。

## 4. 回滚方式

如果 Phase 1 视觉或布局接入出现问题:

1. 用 Git 回退最近的前端提交。
2. 恢复 `App.tsx` 中 `MainLayout` 接入。
3. 保留数据库和 uploads 不参与回滚。
4. 如果仅背景层有问题，先回退 `AppBackground` 接入，让页面回到旧 body 背景。

## 5. 执行建议

推荐先按 Task 1 到 Task 5 执行并停一次，确认 Dashboard 和个人设置方向正确后，再执行 Task 6 和 Task 7。  
当前项目暂停运营，可以接受较大前端改动，但每个任务完成后都应独立提交，便于回滚。

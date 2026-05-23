# 沉没之城 · 全局视觉改造方案 v1.7.1（整合版）

> **设计方向**: 暗黑克苏鲁奢华风 — 维多利亚神秘主义 × 现代数字界面
> **参考**: 即梦设计稿、极乐迪斯科思维阁、博德之门3 UI
> **日期**: 2026-05-24
> **状态**: 方案定稿，待实施

---

## 一、设计哲学

### 核心定位
沉没之城不是「工具型跑团平台」，而是**「一座数字化的克苏鲁神殿」**。

玩家进入界面时，应该感受到：
- 神秘、古老、不可名状的压迫感
- 金色铭牌暗示「珍贵知识」与「禁忌文本」
- 羊皮纸白内容区提供可阅读的叙事空间
- 血色用于警告和疯狂值，而非装饰

---

## 二、色彩系统

### 2.1 核心色板（5色定律）

只使用5种颜色，所有渐变和辅助色从这5种衍生：

| 名称 | Hex | 用途 | 使用频率 |
|------|-----|------|---------|
| **深渊黑** | `#0a0a0f` | 导航栏、卡片背景、阴影 | 60% |
| **羊皮纸白** | `#FFFEFC` | 内容区背景、主文字 | 20% |
| **腐败金** | `#c9a227` | 选中高亮、强调、装饰 | 12% |
| **血红** | `#8b2635` | 危险状态、SAN值、错误 | 5% |
| **石碑灰** | `#6b6558` | 次要文字、禁用状态 | 3% |

### 2.2 导航栏配色

```css
/* 导航栏背景 — 页岩纹理 + 深色遮罩 */
--nav-bg: linear-gradient(
  to bottom,
  rgba(10, 10, 15, 0.92) 0%,
  rgba(10, 10, 15, 0.88) 100%
);
--nav-bg-image: url('/images/nav-texture.jpg');
--nav-bg-blend: multiply;

/* 默认文字 — 在纹理背景上需要更高对比度 */
--nav-text: #8b8375;
--nav-text-hover: #c4b9a0;

/* 选中铭牌 */
--nav-active-bg: url('/images/gold-brush-stroke.png');
--nav-active-text: #0f0f14;
--nav-active-glow: 0 0 16px rgba(201, 162, 39, 0.25);
```

### 2.3 内容区配色

```css
/* 内容区背景 */
--content-bg: linear-gradient(180deg, #FDFDF9 0%, #F2F3EE 100%);
--content-text: #1a1a1a;
--content-text-muted: #6b6558;
--content-text-link: #8b6914;

/* 内容区卡片 */
--content-card-bg: rgba(10, 10, 15, 0.75);
--content-card-border: rgba(201, 162, 39, 0.15);
--content-card-glow: 0 4px 24px rgba(0, 0, 0, 0.45);

/* 恐怖/危险状态 */
--content-horror-bg: rgba(139, 38, 53, 0.08);
--content-horror-border: rgba(139, 38, 53, 0.3);
```

### 2.4 渐变色规范

**允许使用的渐变（仅限3种）**：

1. **金色铭牌渐变**（导航选中，CSS fallback）
2. **顶部微光渐变**（铭牌内部高光）
3. **Hover 扫光渐变**（悬停效果）

**禁止使用**：紫色/蓝色渐变、彩虹渐变、全屏大渐变背景。

---

## 三、排版系统

### 3.1 字体选择

| 层级 | 字体 | 字重 | 用途 |
|------|------|------|------|
| **Display** | Cinzel / Noto Serif SC | 600-700 | 页面大标题、LOGO |
| **Heading** | Geist / Noto Sans SC | 500-600 | 卡片标题、面板标题 |
| **Body** | Geist / Noto Sans SC | 400 | 正文、描述、聊天消息 |
| **Mono** | JetBrains Mono | 400 | 数值、代码、骰子结果 |

### 3.2 字号层级

| Token | 大小 | 行高 | 用途 |
|-------|------|------|------|
| `text-display` | 32px | 1.2 | 页面主标题 |
| `text-heading` | 20px | 1.3 | 面板标题 |
| `text-subheading` | 16px | 1.4 | 卡片标题 |
| `text-body` | 14px | 1.6 | 正文 |
| `text-caption` | 12px | 1.5 | 辅助说明 |

---

## 四、布局系统（混合结构）

```
┌─────────────────────────────────────────────────────────┐
│ 顶部导航栏 (TopNav)                                        │  h-14
│  [LOGO]          [搜索栏]              [通知] [头像▼]      │
├──────────┬────────────────────────────────────────────────┤
│          │                                                │
│ 左侧导航  │              内容区 (Content)                   │
│ (SideNav) │         #FDFDF9 → #F2F3EE 渐变背景              │
│  w-56    │                                                │
│  展开/收起│                                                │
│          │                                                │
│          │                                                │
├──────────┴────────────────────────────────────────────────┤
```

### 4.1 TopNav（固定顶部）

- **高度**: `h-14` (56px)
- **背景**: 页岩纹理 `nav-texture.jpg` + 深色渐变遮罩
- **定位**: `fixed top-0 left-0 right-0 z-50`
- **左侧**: LOGO（`logo-gold.png` 图片，高度 40px，带金色微光阴影）
- **中间**: 搜索栏（圆角、placeholder "搜索房间、调查员、遗物..."）
- **右侧**: 通知铃铛 + 用户头像（圆形 32px）+ 下拉菜单

### 4.2 SideNav（固定左侧）

- **宽度**: 展开 `w-56` (224px) / 收起 `w-14` (56px)
- **背景**: 页岩纹理 `nav-texture.jpg` + 深色渐变遮罩
- **定位**: `fixed top-14 left-0 bottom-0 z-40`
- **导航项**: 10个功能入口，高度 `h-11` (44px)
- **选中**: 金色笔触 `gold-brush-stroke.png` 背景

### 4.3 Content（剩余空间）

- **背景**: 渐变 `#FDFDF9` → `#F2F3EE`
- **定位**: `fixed top-14 left-56 right-0 bottom-0 overflow-auto`
- **内边距**: `p-6` (24px)

---

## 五、全局背景图系统

### 5.1 4张21:9克苏鲁风格背景图

| 背景图 | 文件 | 色调 | 使用场景 |
|--------|------|------|---------|
| **沉没之城经典** | `/images/bg05.png` | 暗色深渊 | 默认全局背景 |
| **深海城市** | `/images/bg-underwater.png` | 海蓝色调 | 黑水港、溺者之牌 |
| **幻梦境** | `/images/bg-dreamscape.png` | 紫蓝漩涡+符文 | 梦境系统、个人资料 |
| **异界深渊** | `/images/bg-eldritch.png` | 暗色+银白漩涡 | 登录页、SAN崩溃状态 |

### 5.2 场景绑定

| 页面/场景 | 背景图 | 理由 |
|-----------|--------|------|
| 默认（首页、调查员等） | bg05.png | 经典沉没之城氛围 |
| 黑水港、溺者之牌 | bg-underwater.png | 深海主题匹配 |
| 梦境系统、个人资料 | bg-dreamscape.png | 幻梦境氛围 |
| SAN崩溃、恐怖剧情 | bg-eldritch.png | 异界疯狂感 |
| 登录/注册 | bg-eldritch.png | 第一印象震撼 |

### 5.3 SAN崩溃动画

```css
.san-broken {
  background-image: url('/images/bg-eldritch.png');
  animation: sanity-flicker 4s ease-in-out infinite;
}

@keyframes sanity-flicker {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(0.7) hue-rotate(10deg); }
}
```

---

## 六、素材清单

### 6.1 全局背景图（4张）

| 素材 | 文件 | 用途 |
|------|------|------|
| 沉没之城经典 | `/images/bg05.png` | 默认全局背景 |
| 深海城市 | `/images/bg-underwater.png` | 黑水港、溺者之牌 |
| 幻梦境 | `/images/bg-dreamscape.png` | 梦境系统 |
| 异界深渊 | `/images/bg-eldritch.png` | 登录页、SAN崩溃 |

### 6.2 导航/纹理（1张）

| 素材 | 文件 | 用途 |
|------|------|------|
| 黑白页岩纹理 | `/images/nav-texture.jpg` | TopNav + SideNav 背景 |

### 6.3 金色底纹（4张）

| 素材 | 文件 | 用途 |
|------|------|------|
| 金色笔触 | `/images/gold-brush-stroke.png` | 导航选中铭牌（主推） |
| 金色大理石 | `/images/gold-marble.jpg` | 铭牌光泽叠加、主按钮 |
| 破碎金箔 | `/images/gold-shards.jpg` | 危险区域、SAN相关 |
| 金色油画 | `/images/gold-paint.jpg` | 标题背景、特殊卡片 |

### 6.4 金箔装饰线（3张）

| 素材 | 文件 | 用途 |
|------|------|------|
| 金箔枝叶（简洁） | `/images/gold-vine-simple.png` | 分隔线、标题下划线 |
| 金箔藤蔓（华丽） | `/images/gold-vine-ornate.png` | 卡片顶部装饰 |
| 金箔几何 | `/images/gold-geometry.png` | 列表标记、步骤指示器 |

### 6.5 暗色大理石（4张）

| 素材 | 文件 | 用途 |
|------|------|------|
| 暗金大理石 | `/images/dark-marble-gold.jpg` | 重要卡片、VIP区域 |
| 暗金裂纹 | `/images/dark-marble-veins.jpg` | 通用卡片背景 |
| 黑白大理石 | `/images/dark-marble-white.jpg` | 标准卡片背景 |
| 深灰大理石 | `/images/dark-marble-gray.jpg` | 次要卡片、信息面板 |

### 6.6 神秘学符号（6张）

| 素材 | 文件 | 用途 |
|------|------|------|
| 神秘学太阳 | `/images/occult-sun.png` | 成就徽章、通知图标 |
| 神秘学月亮 | `/images/occult-moon.png` | SAN值指示器 |
| 全视之眼 | `/images/occult-eye.png` | 洞察/侦查技能图标 |
| 金色骷髅 | `/images/occult-skull.png` | 死亡/危险状态标记 |
| 骷髅+主教冠 | `/images/occult-death-crown.png` | 页面角落装饰 |
| 全视之眼2 | `/images/occult-eye-2.png` | 备用眼睛图标 |

### 6.7 血迹/恐怖元素（3张）

| 素材 | 文件 | 用途 |
|------|------|------|
| 血手印 | `/images/blood-hands.png` | 致命错误、死亡页面 |
| 血飞溅 | `/images/blood-splatter.png` | 危险操作、战斗受伤 |
| 滴血手印 | `/images/blood-hand-drip.png` | 持续掉血、恐怖场景 |

### 6.8 品牌标识（2张）

| 素材 | 文件 | 用途 |
|------|------|------|
| **应用图标** | `/images/app-icon.png` | PWA图标、浏览器favicon、通知图标 |
| **金色LOGO** | `/images/logo-gold.png` | TopNav品牌展示、登录页、加载画面 |

**应用图标**:
- 克苏鲁触手图腾 + 金色圆环 + 中央红宝石
- 暗黑神秘感，辨识度极高
- 用于 favicon、PWA manifest、通知小图标

**金色LOGO**:
- "沉没之城"哥特金属字体
- 中央红宝石装饰
- 黑底金色，可直接用于深色导航栏背景
- TopNav左侧品牌区直接使用

**TopNav Logo 使用**:
```css
.topnav-logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 1rem;
}

.topnav-logo img {
  height: 40px;
  width: auto;
  filter: drop-shadow(0 0 8px rgba(201, 162, 39, 0.3));
}

.topnav-logo-mobile img {
  height: 32px;
}
```

### 素材总计

全部素材 **29张**：
- 4 张全局背景图
- 1 张导航纹理
- 4 张金色底纹
- 3 张金箔装饰线
- 4 张暗色大理石
- 6 张神秘学符号
- 3 张血迹元素
- 2 张品牌标识

---

## 七、组件规范

### 7.1 金色铭牌导航项（核心）

**未选中**:
```
背景: transparent
文字: #8b8375
图标: #8b8375
```

**Hover**:
```
背景: rgba(201, 162, 39, 0.04)
文字: #c4b9a0
扫光动画: 金色微光从左到右 (0.3s)
```

**选中**:
```css
.nav-item-active {
  background-image: url('/images/gold-brush-stroke.png');
  background-size: 100% 100%;
  color: #0f0f14;
  font-weight: 600;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 16px rgba(201, 162, 39, 0.25);
}
```

### 7.2 主按钮（参考 UIverse elijahgummer）

```css
.coc-btn-gold {
  padding: 0.75rem 1.5rem;
  font-family: 'Cinzel', 'Noto Serif SC', serif;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #0f0f14;
  
  /* 金色笔触背景 */
  background-image: url('/images/gold-brush-stroke.png');
  background-size: 100% 100%;
  
  /* 3D阴影 */
  box-shadow: 
    0 3px 6px rgba(0, 0, 0, 0.3),
    0 3px 6px rgba(110, 80, 20, 0.4),
    inset 0 -2px 5px 1px rgba(139, 66, 8, 0.8),
    inset 0 -1px 1px 3px rgba(250, 227, 133, 0.5);
  
  border: 1px solid rgba(201, 162, 39, 0.6);
  border-radius: 0.5rem;
  transition: all 0.2s ease-in-out;
}

.coc-btn-gold:hover {
  background-image: url('/images/gold-marble.jpg');
  box-shadow: 
    0 10px 20px rgba(0, 0, 0, 0.4),
    0 6px 6px rgba(0, 0, 0, 0.3),
    inset 0 -2px 5px 1px rgba(177, 125, 16, 0.9),
    inset 0 -1px 1px 3px rgba(250, 227, 133, 0.7);
  transform: translateY(-1px);
}
```

### 7.3 玻璃卡片（参考 UIverse codebykay101）

```css
.coc-card-glass {
  background: linear-gradient(
    135deg,
    rgba(18, 18, 26, 0.7) 0%,
    rgba(10, 10, 15, 0.8) 100%
  );
  backdrop-filter: blur(12px);
  border: 1px solid rgba(201, 162, 39, 0.15);
  border-radius: 12px;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.coc-card-glass:hover {
  border-color: rgba(201, 162, 39, 0.3);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(201, 162, 39, 0.1);
  transform: translateY(-3px);
}

/* 大理石纹理叠加 */
.coc-card-glass::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/images/dark-marble-white.jpg');
  background-size: cover;
  opacity: 0.08;
  pointer-events: none;
  mix-blend-mode: overlay;
  border-radius: inherit;
}
```

### 7.4 重要卡片（参考 UIverse Smit-Prajapati）

```css
.coc-card-important {
  background: linear-gradient(
    135deg,
    rgba(18, 18, 26, 0.85) 0%,
    rgba(10, 10, 15, 0.9) 100%
  );
  border: 1px solid rgba(201, 162, 39, 0.2);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  transition: all 0.5s ease-in-out;
  overflow: hidden;
}

/* 金色边框动画层 */
.coc-card-important .gold-border {
  position: absolute;
  inset: 0;
  border: 2px solid #c9a227;
  border-radius: 12px;
  opacity: 0;
  transform: rotate(5deg) scale(1.05);
  transition: all 0.5s ease-in-out;
  pointer-events: none;
}

.coc-card-important:hover {
  transform: scale(1.02);
}

.coc-card-important:hover .gold-border {
  inset: 8px;
  opacity: 1;
  transform: rotate(0deg) scale(1);
  border-radius: 8px;
}
```

### 7.5 搜索栏

```css
.coc-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  color: #a69b85;
  transition: all 0.3s ease;
}

.coc-search:focus-within {
  border-color: rgba(201, 162, 39, 0.4);
  box-shadow: 
    0 0 0 3px rgba(201, 162, 39, 0.1),
    0 0 16px rgba(201, 162, 39, 0.15);
}
```

### 7.6 危险/恐怖按钮

```css
.coc-btn-danger {
  background: linear-gradient(135deg, #6b1a26 0%, #8b2635 50%, #a03040 100%);
  color: #FFFEFC;
  font-weight: 600;
  border: 1px solid rgba(139, 38, 53, 0.6);
  border-radius: 0.5rem;
  box-shadow: 
    0 3px 6px rgba(0, 0, 0, 0.3),
    0 0 12px rgba(139, 38, 53, 0.3),
    inset 0 -2px 5px 1px rgba(107, 26, 38, 0.8);
}

/* 恐怖状态 - 带血迹 */
.coc-btn-horror {
  position: relative;
  overflow: hidden;
}

.coc-btn-horror::before {
  content: '';
  position: absolute;
  top: -10px; right: -10px;
  width: 80px; height: 80px;
  background-image: url('/images/blood-hand-drip.png');
  background-size: contain;
  opacity: 0.3;
  pointer-events: none;
}
```

### 7.7 血迹元素使用规范

| 场景 | 素材 | 效果 |
|------|------|------|
| 致命错误 | blood-hands.png | 弹窗边缘双手血印 |
| SAN归零 | blood-hand-drip.png | 警告框滴血手印 |
| 战斗受伤 | blood-splatter.png | 卡片边缘血涂抹 |
| 死亡页面 | blood-hands + occult-skull | 全屏血印+金色骷髅 |
| 恐怖场景 | blood-splatter.png | 内容区角落低透明度 |

**克制原则**: 只在 SAN<30、死亡、重伤、恐怖剧情、系统错误时使用。

---

## 八、动画规范

### 8.1 动画原则

- **克制**: 动画只用于状态变化，不用于装饰
- **快速**: 200-300ms，ease-out
- **有意义**: 每个动画传递信息（亮起=激活，闪烁=警告）

### 8.2 动画库分工

| 库 | 负责场景 | 禁止使用 |
|----|---------|---------|
| **motion/react** | 页面切换、列表stagger、抽屉开关、导航滑块跟随 | 复杂时间轴 |
| **anime.js** | 骰子弹跳序列、暴击粒子、线索翻转、复杂时间轴 | 简单fadeIn/fadeOut |
| **CSS @keyframes** | 金色扫光、SAN闪烁、hover过渡 | 复杂编排 |

### 8.3 具体使用场景

| 动画场景 | 使用库 | 实现方式 |
|----------|--------|---------|
| 页面入场 | motion/react | `<motion.div initial/animate>` |
| 列表 stagger | motion/react | `staggerChildren: 0.04` |
| 抽屉开关 | motion/react | `<AnimatePresence>` + spring |
| 导航选中切换 | motion/react | `layoutId="activeNav"` |
| 卡片 hover | CSS transition | `transition: all 0.3s` |
| 骰子弹跳 | anime.js | `anime.timeline()` |
| 暴击粒子 | anime.js | 粒子 targets 动画 |
| 线索翻转 | anime.js | `rotateY` 时间轴 |
| 金色扫光 | CSS @keyframes | `background-position` |
| SAN闪烁 | CSS @keyframes | `filter: brightness()` |

### 8.4 导航选中动画

```
入场: opacity 0.6 → 1.0 (0.25s ease-out)
退场: opacity 1.0 → 0.6 (0.15s ease-out)
无: transform位移、scale缩放、spring弹动（禁止）
```

### 8.5 缓动函数

```css
--ease-abyss: cubic-bezier(0.22, 1, 0.36, 1);    /* 入场 */
--ease-swift: cubic-bezier(0.4, 0, 0.2, 1);       /* 切换 */
--ease-breathe: ease-in-out;                       /* 呼吸 */
```

---

## 九、纹理系统

### 9.1 铭牌纹理（三层叠加）

```css
.nav-item-active {
  /* 层1: 金色笔触背景 */
  background-image: url('/images/gold-brush-stroke.png');
  
  /* 层2: 水平细条纹（金属拉丝） */
  background-image:
    url('/images/gold-brush-stroke.png'),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(255,255,255,0.03) 2px,
      rgba(255,255,255,0.03) 4px
    );
  
  /* 层3: 径向高光 */
  position: relative;
}

.nav-item-active::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 30%,
    rgba(255,255,255,0.08) 0%,
    transparent 60%
  );
  pointer-events: none;
}
```

### 9.2 血迹纹理叠加

```css
/* 轻度恐怖 - 边缘血迹 */
.horror-light::before {
  background-image: url('/images/blood-splatter.png');
  opacity: 0.1;
}

/* 中度恐怖 - 角落血印 */
.horror-medium::before {
  background-image: url('/images/blood-hand-drip.png');
  opacity: 0.2;
}

/* 重度恐怖 - 全屏血印 */
.horror-severe::before {
  background-image: url('/images/blood-hands.png');
  opacity: 0.3;
}
```

---

## 十、四角装饰花纹

```svg
<!-- 四角SVG花纹（12x12px） -->
<!-- 左上: 折线 + 金色圆点 -->
<svg width="12" height="12">
  <path d="M0 8 L0 0 L8 0" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" fill="none"/>
  <circle cx="3" cy="3" r="1" fill="rgba(201,162,39,0.3)"/>
</svg>
```

实现方式：CSS伪元素 + background-image (SVG Data URI)。

---

## 十一、响应式规则

### 11.1 断点

| 断点 | 宽度 | 布局变化 |
|------|------|---------|
| Desktop | ≥ 1024px | 完整布局（TopNav + SideNav展开 + Content） |
| Tablet | 768-1023px | SideNav收起为图标栏 (w-14) |
| Mobile | < 768px | SideNav隐藏，底部Tab栏 + 抽屉 |

### 11.2 桌面端（≥1024px）

- SideNav展开 w-56，显示图标+文字
- Content left: 224px
- 搜索栏可见

### 11.3 平板端（768-1023px）

- SideNav收起 w-14，只显示图标
- Content left: 56px
- 导航项hover显示Tooltip

### 11.4 移动端（<768px）

- SideNav完全隐藏
- 底部Tab栏：5个主要入口
- "更多"展开抽屉显示其余入口
- TopNav简化：LOGO + 汉堡菜单
- 抽屉从左侧滑入，宽度280px，遮罩rgba(0,0,0,0.5)

---

## 十二、Z-Index层级

| 层级 | z-index | 元素 |
|------|---------|------|
| 背景图 | -1 | body background-image |
| 内容区 | 0 | Content Area |
| 导航栏 | 40 | SideNav |
| 顶部栏 | 50 | TopNav |
| 遮罩层 | 40 | 抽屉遮罩 |
| 抽屉 | 50 | 移动端抽屉 |
| 下拉菜单 | 60 | 用户头像下拉 |
| 弹窗 | 70 | Modal / Dialog |
| 通知 | 80 | Toast / Notification |
| 全屏 | 90 | 全屏覆盖 |

---

## 十三、实施路线图

### Phase 1: 基础架构（2小时）

| 文件 | 改动 |
|------|------|
| `styles/index.css` | 新增色彩Token、铭牌样式、纹理、动画 |
| `MainLayout.tsx` | 重构为 TopNav + SideNav + Content 三层 |
| `App.tsx` | 内容区背景改为渐变 |

**交付**: 布局框架跑通，导航栏可切换，铭牌效果可见

### Phase 2: 组件落地（2小时）

| 文件 | 改动 |
|------|------|
| `TopNav.tsx`（新建） | 搜索栏、通知、头像下拉、页岩纹理 |
| `SideNav.tsx`（提取） | 导航项铭牌效果、收放逻辑、响应式 |
| 各页面入口 | 卡片去半透明，适配白色背景 |

**交付**: 所有页面视觉上统一，没有突兀的深色块

### Phase 3: 打磨抛光（1小时）

- 四角花纹SVG精细调整
- 纹理对比度微调
- 动画时间参数调优
- 移动端底部Tab栏
- 背景图切换逻辑

**交付**: 即梦稿风格还原度90%+

---

## 十四、检查清单

### 设计质量
- [ ] 导航栏页岩纹理，内容区渐变背景
- [ ] 金色铭牌有纹理（金色笔触素材）
- [ ] 四角花纹精致
- [ ] 动画克制（只有亮暗变化）
- [ ] 没有紫色/蓝色渐变

### 技术实现
- [ ] CSS变量统一管理
- [ ] 铭牌效果纯CSS
- [ ] 纹理使用CSS多重背景
- [ ] 响应式三端适配
- [ ] prefers-reduced-motion尊重

### 用户体验
- [ ] 导航项Hover有反馈
- [ ] 选中状态一眼可辨
- [ ] 搜索栏聚焦有金色光晕
- [ ] 移动端底部Tab可用
- [ ] 背景图切换流畅

---

*方案整合完成。确认后进入Phase 1实施。*

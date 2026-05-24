# 沉没之城 UI 质感升级方案 V2.3（终版）
## 确认决策：技术驱动 + 现代化布局 + 动效进度条

**已确认决策：**
- ✅ 浅色主内容区保留（`#F7F4E9 → #F3F0E6`）
- ✅ 中文字体沿用当前
- ✅ R3F Canvas **按需挂载**（非全局）
- ✅ 磨砂玻璃 `backdrop-filter: blur(10px)` **保留叠加**
- ✅ **不需要性能降级**（全开效果）
- ✅ 进度条组件需要迭代优化（增加动效、强化质感）
- ✅ **卡片不堆叠** — 采用现代化网格布局
- ✅ 引入现代化设计元素

---

## 一、布局革命：从卡片堆叠到 Bento Grid

### 当前问题
Dashboard 各区域垂直堆叠：用户信息→功能入口→公告→位阶→调查员→深渊广场，像一叠扑克牌摊开，缺乏视觉节奏。

### 改造方案：Bento Grid + 非对称布局

**参考：Apple Bento、Linear Dashboard、Vercel Deployment Cards**

```
┌──────────────────────────────────────────────────────────┐
│  用户信息面板（横跨全宽，大）                               │
├────────────────────────┬─────────────────────────────────┤
│                        │  公告/旧日低语（竖高卡片）          │
│  四大功能入口（2x2）    │  ────────────────                │
│  ┌────┐  ┌────┐        │  位阶天梯（中）                   │
│  │记录│  │开启│        ├─────────────────────────────────┤
│  │命运│  │故事│        │  深渊广场横幅（横跨，血氛围）      │
│  ├────┤  ├────┤        └─────────────────────────────────┘
│  │进入│  │幻影│
│  │深渊│  │剧本│
│  └────┘  └────┘
├────────────────────────┴─────────────────────────────────┤
│  调查员横条卡片（横向滚动 or 网格）                         │
└──────────────────────────────────────────────────────────┘
```

**关键变化：**
1. **左侧2x2功能入口** + **右侧竖高卡片（公告+位阶）** — 形成非对称平衡
2. **深渊广场独立横幅** — 像游戏主界面的"继续冒险"大入口
3. **调查员改为横向卡片条** — 类似Netflix横向滚动，节省纵向空间
4. **网格间隙统一 16px（gap-4）** — 紧凑但不拥挤

### 各页面布局策略

| 页面 | 布局方式 |
|------|---------|
| **Dashboard** | Bento Grid：用户信息(1×宽) + 功能2x2 + 公告竖条 + 深渊横幅 + 调查员横条 |
| **论坛** | 瀑布流/ masonry：板块卡片大小交错，大卡片突出热门板块 |
| **背包** | 标签页切换 + 列表式卡片（不堆叠，横向展开信息） |
| **好友** | 横向卡片条（在线优先）+ 空状态居中 |
| **故事书** | 2列网格（平板3列），stagger入场 |
| **调查员** | 横向角色卡片条 + "记录命运"大按钮 |

---

## 二、现代化设计元素引入

### 2.1 玻璃拟态升级（Glassmorphism V2）

当前磨砂玻璃是基础版，升级为：

```css
.glass-v2 {
  background: rgba(18, 18, 26, 0.7);
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  border: 1px solid rgba(212, 168, 83, 0.08);
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05); /* 顶部内高光 */
}
```

**升级点：**
- blur从10px提升到16px（更清晰背景+更明显的磨砂感）
- 增加 `saturate(120%)` — 让背景色更浓郁
- 增加内阴影顶部高光 — 制造玻璃厚度感
- 边框从纯色改为极低透明度金色

### 2.2 磁吸按钮（Magnetic Button）

```tsx
const MagneticButton = ({ children }) => {
  const ref = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const x = (clientX - left - width / 2) * 0.3; // 30%位移
    const y = (clientY - top - height / 2) * 0.3;
    setPosition({ x, y });
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={() => setPosition({ x: 0, y: 0 })}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: 'spring', stiffness: 350, damping: 15, mass: 0.5 }}
    >
      {children}
    </motion.button>
  );
};
```

**应用：** 所有主要按钮（进入房间、抛竿、占卜、添加好友）

### 2.3 骨架屏升级（Shimmer Effect）

```tsx
const ShimmerSkeleton = () => (
  <div className="relative overflow-hidden bg-[#1A1A24] rounded-lg">
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4A853]/5 to-transparent"
      animate={{ x: ['-100%', '100%'] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
);
```

### 2.4 渐变色文字（Gradient Text）

```css
.gradient-gold {
  background: linear-gradient(135deg, #D4A853 0%, #E8C87A 50%, #D4A853 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.gradient-blood {
  background: linear-gradient(135deg, #8B1A1A 0%, #A52A2A 50%, #8B1A1A 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

**应用：** 页面大标题、重要数字、用户昵称

### 2.5 微交互系统（Micro-interactions）

每个可交互元素必须有反馈：

| 元素 | 默认 | Hover | Active/Click |
|------|------|-------|-------------|
| 卡片 | 静态 | 3D倾斜 + 边框发光 + 抬升2px | 按下0.98缩放 |
| 按钮 | 静态 | 磁吸位移 + 流光扫过 + 抬升 | 弹簧按下 + 涟漪 |
| 输入框 | 暗底 | 金色边框显现 + 内发光 | 波纹扩散 |
| 标签页 | 静态 | 文字金色 | 指示器滑动 |
| 头像 | 静态 | 暗金ring发光 + 轻微放大 | — |
| 图标 | 静态 | 颜色变金 + 轻微弹跳 | — |

### 2.6 视差滚动（Parallax Scrolling）

```tsx
const ParallaxSection = ({ children, speed = 0.5 }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 500 * speed]);

  return (
    <motion.div style={{ y }}>
      {children}
    </motion.div>
  );
};
```

**应用：** Dashboard各区块以不同速度滚动，制造深度感

---

## 三、进度条组件重构 `CthulhuProgress`

### 3.1 XP/等级进度条（Dashboard顶部）

```tsx
const XPProgress = ({ current, max, label }) => {
  const progress = (current / max) * 100;

  return (
    <div className="relative w-full">
      {/* 暗底轨道 */}
      <div className="h-2 bg-[#1A1A24] rounded-full overflow-hidden border border-[#242430]/50">
        {/* 金色填充 */}
        <motion.div
          className="h-full rounded-full relative overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, #8B6914 0%, #D4A853 50%, #E8C87A 100%)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          {/* 流光扫过 */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* 粒子溢出（顶端金色微光） */}
          <div className="absolute -top-1 right-0 w-2 h-4 bg-[#D4A853] rounded-full blur-sm opacity-60" />
        </motion.div>
      </div>
      {/* 标签 */}
      <div className="flex justify-between mt-1 text-xs text-[#C4B8A5]">
        <span>{label}</span>
        <span className="text-[#D4A853]">{current} / {max}</span>
      </div>
    </div>
  );
};
```

**特征：**
- 填充增长动画（1.5s easeOut，像经验值在"注入"）
- 内部持续流光扫过（像能量流动）
- 顶端粒子溢出效果（进度头部发光）
- 暗底轨道带微妙边框

### 3.2 HP/MP/SAN 状态条（角色卡、战斗HUD）

```tsx
const StatusBar = ({ type, current, max }) => {
  const colors = {
    hp: { fill: ['#4a1515', '#8B1A1A'], glow: '#8B1A1A' },
    mp: { fill: ['#0a1a2a', '#1a3a5a'], glow: '#3a6a9a' },
    san: { fill: ['#2a0a3a', '#5a1a7a'], glow: '#7a3a9a' },
  };
  const c = colors[type];
  const progress = (current / max) * 100;
  const isLow = progress < 30;

  return (
    <div className="relative">
      {/* 轨道 */}
      <div className={`h-2 rounded-full overflow-hidden ${isLow ? 'animate-pulse-slow' : ''}`}
        style={{
          background: '#1A1A24',
          boxShadow: isLow ? `0 0 8px ${c.glow}40` : 'none',
        }}
      >
        {/* 填充 */}
        <motion.div
          className="h-full rounded-full relative"
          style={{
            background: `linear-gradient(90deg, ${c.fill[0]}, ${c.fill[1]})`,
          }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          {/* 低值警告脉冲 */}
          {isLow && (
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [`0 0 0px ${c.glow}00`, `0 0 12px ${c.glow}60`, `0 0 0px ${c.glow}00`],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>
      {/* 数值变化动画 */}
      <motion.span
        key={current}
        initial={{ scale: 1.3, color: '#fff' }}
        animate={{ scale: 1, color: isLow ? '#8B1A1A' : '#C4B8A5' }}
        className="text-xs absolute -top-5 right-0"
      >
        {current}/{max}
      </motion.span>
    </div>
  );
};
```

**特征：**
- HP低值（<30%）：整个条脉冲 + 红色发光
- 数值变化时：数字弹跳缩放（从1.3到1）+ 颜色闪烁
- 弹簧物理填充动画（不像线性的，像液体注入）
- 三种状态色：血红/深蓝/暗紫

### 3.3 收集进度条（背包/图鉴/成就）

```tsx
const CollectionProgress = ({ collected, total, label }) => {
  const segments = Array.from({ length: total }, (_, i) => i < collected);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-sm">
        <span className="text-[#C4B8A5]">{label}</span>
        <span className="text-[#D4A853]">{collected}/{total}</span>
      </div>
      <div className="flex gap-1">
        {segments.map((isCollected, i) => (
          <motion.div
            key={i}
            className="h-2 flex-1 rounded-full"
            style={{
              background: isCollected
                ? 'linear-gradient(90deg, #B8923A, #D4A853)'
                : '#1A1A24',
            }}
            initial={isCollected ? { scale: 0 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
          >
            {isCollected && (
              <motion.div
                className="w-full h-full rounded-full"
                animate={{
                  boxShadow: ['0 0 0px #D4A85300', '0 0 4px #D4A85360', '0 0 0px #D4A85300'],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
```

**特征：**
- 分段式（像成就徽章格子）
- 已获得段逐个弹簧弹出（stagger 0.1s）
- 已获得段持续微发光
- 未完成段暗底无边框

---

## 四、核心组件库（终版清单）

### UI 层（6个组件）

| 组件 | 核心能力 | 文件 |
|------|---------|------|
| `CthulhuCard3D` | 3D倾斜 + conic-gradient旋转边框 + 弹簧物理 + Bento Grid适配 | `ui/CthulhuCard3D.tsx` |
| `CthulhuButton` | 磁吸位移 + 流光扫过 + 弹簧按下 + 3变体（主/危险/幽灵） | `ui/CthulhuButton.tsx` |
| `AnimatedBorder` | CSS `@property` 旋转边框（hover触发/持续旋转） | `ui/AnimatedBorder.tsx` |
| `GoldOrnament` | 金色装饰线/四角/分隔线（纯CSS程序化） | `ui/GoldOrnament.tsx` |
| `CthulhuProgress` | XP流光/状态脉冲/收集分段（三合一） | `ui/CthulhuProgress.tsx` |
| `OccultBadge` | 克苏鲁徽章系统 + CSS mask-image纹理化 | `ui/OccultBadge.tsx` |

### 氛围层（按需挂载）

| 组件 | 页面 | R3F内容 |
|------|------|---------|
| `DashboardParticles` | Dashboard | 50金色Sparkles + 3扭曲符文(Float) + Bloom |
| `ForumTentacles` | 论坛 | 暗绿MeshDistortMaterial触手几何体(慢速Float) |
| `HarborBubbles` | 黑水港 | 蓝色气泡粒子上浮 + 水下光线 distortion |
| `CardFlipSpace` | 溺者之牌 | 暗紫Sparkles + 卡牌mesh翻转空间 |
| `AbyssAtmosphere` | 深渊广场 | 血红粒子 + 暗角Vignette加重 |

### 动效工具（4个Hooks）

| Hook | 用途 |
|------|------|
| `useMouseTilt` | 鼠标位置 → 3D旋转角度 |
| `useMagnetic` | 鼠标位置 → 磁吸位移 |
| `useGlow` | hover状态管理（发光/边框） |
| `useScrollParallax` | 滚动位置 → 视差偏移 |

---

## 五、具体页面改造（技术+布局双升级）

### P0 — Dashboard（Bento Grid布局）

```
┌──────────────────────────────────────────────────────┐ 用户信息面板（宽×短）
│  头像 + 昵称 + 等级徽章  │  SP 1595  ⚡60  │ 每日签到 │  XP进度条（流光）
├──────────────────────┬─────────────────────────────────┤
│  功能入口（2×2）      │  公告 + 位阶（竖高）             │
│  ┌────┐  ┌────┐    │  ┌─────────────┐                │
│  │记录│  │开启│    │  │  旧日低语    │                │
│  │命运│  │故事│    │  │  公告内容... │                │
│  ├────┤  ├────┤    │  ├─────────────┤                │
│  │进入│  │幻影│    │  │  位阶天梯    │                │
│  │深渊│  │剧本│    │  │  进度条...   │                │
│  └────┘  └────┘    │  └─────────────┘                │
├──────────────────────┴─────────────────────────────────┤
│  深渊广场横幅（全宽，血氛围，大按钮）                    │
├──────────────────────────────────────────────────────┤
│  调查员横条 ← ← 雷·克尔杰 │ 张三 │ 李四 │ → →        │
└──────────────────────────────────────────────────────┘
```

**技术实现：**
- 用户信息面板：`CthulhuCard3D`（无3D倾斜，只做边框发光） + `CthulhuProgress(XP)`
- 功能入口：4个 `CthulhuCard3D` + 磁吸按钮 `CthulhuButton` + stagger入场
- 公告/位阶：右侧竖高 `CthulhuCard3D variant-parchment` + `CthulhuProgress(收集)`
- 深渊广场：横幅 `CthulhuCard3D variant-blood` + `AnimatedBorder` 持续旋转 + 磁吸大按钮
- 调查员：横向滚动容器 + `CthulhuCard3D` × N + 拖拽/滚轮交互
- 全局：`DashboardParticles` R3F氛围 + 磨砂玻璃叠加

### P1 — 论坛（Masonry瀑布流）

- 板块卡片：`CthulhuCard3D` + 不同尺寸（热门板块大卡片，冷门小卡片）
- 布局：CSS Grid `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`
- 热门板块：`variant-gold` + `AnimatedBorder`
- 氛围：`ForumTentacles` 缓慢扭曲触手
- 主题数：渐变色文字 `gradient-gold`

### P1 — 背包（横向信息展开）

- 标签页：motion layout 滑动指示器（金色下划线滑动）
- 物品行：横向展开（左图标+中信息+右操作），非堆叠
- hover：`CthulhuCard3D` 简化版（无边框，仅抬升+阴影）
- 头像框：`CthulhuCard3D` + 3D翻转预览

### P1 — 好友（横向在线条 + 磁吸添加）

- 在线好友：横向卡片条（类似Dashboard调查员）
- 好友卡片：`CthulhuCard3D` + 在线状态脉冲绿点（motion pulse）
- "添加好友"：磁吸大按钮 `CthulhuButton`
- 空状态：居中 + 暗角 + motion fadeIn

### P1 — 黑水港（沉浸式卡片）

- 钓鱼区：`CthulhuCard3D` + `HarborBubbles` 氛围（R3F）
- 鱼竿：独立元素，motion 抛竿动画（弧线运动）
- 收集面板：`CthulhuCard3D variant-parchment` + `CollectionProgress`
- "抛竿"按钮：磁吸 + 按下触发水波纹CSS动画

### P1 — 溺者之牌（3D翻转空间）

- 全局：`CardFlipSpace` 暗紫粒子
- 卡牌：R3F 3D翻转或CSS `transform-style: preserve-3d` + motion
- 解牌结果：`CthulhuCard3D variant-blood` + 血迹流淌CSS动画
- 按钮：幽灵按钮 + hover金色边框显现

### P1 — 故事书（网格+视差）

- 布局：2列网格（桌面3列）
- 卡片：`CthulhuCard3D` + 视差滚动（每行不同速度）
- 入场：motion stagger 0.1s
- 标题：渐变色文字

### P1 — 调查员名册（横向+大按钮）

- 角色卡片：横向条 + `CthulhuCard3D variant-gold`
- 头像：hover 3D tilt + 暗金ring发光
- "记录命运"：磁吸大按钮 + 流光扫过
- 属性条：`CthulhuProgress(HP/MP/SAN)`

---

## 六、CSS 系统更新

### 新增变量

```css
:root {
  /* 已有基础上增加 */
  --card-abyss: #12121A;
  --card-elevated: #1A1A24;
  --border-subtle: rgba(36, 36, 48, 0.8);
  --border-gold: rgba(212, 168, 83, 0.15);
  --border-gold-hover: rgba(212, 168, 83, 0.4);
  --border-blood: rgba(139, 26, 26, 0.3);
  --text-primary: #F5F0E6;
  --text-secondary: #C4B8A5;
  --text-muted: #8A7D6B;
  --gold: #D4A853;
  --gold-light: #E8C87A;
  --gold-dark: #8B6914;
  --blood: #8B1A1A;
  --blood-light: #A52A2A;
}

/* @property 定义 */
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@property --glow-opacity {
  syntax: '<number>';
  initial-value: 0;
  inherits: false;
}
```

### 新增工具类

```css
/* 玻璃拟态V2 */
.glass-v2 {
  background: rgba(18, 18, 26, 0.7);
  backdrop-filter: blur(16px) saturate(120%);
  border: 1px solid var(--border-gold);
  box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05);
}

/* 渐变文字 */
.gradient-gold { /* ... */ }
.gradient-blood { /* ... */ }

/* 程序化纹理 */
.tentacle-texture { /* ... */ }
.gold-grain { /* ... */ }
.blood-drip { /* ... */ }

/* 动画 */
@keyframes rotate-border { to { --angle: 360deg; } }
@keyframes shimmer { /* ... */ }
@keyframes pulse-glow { /* ... */ }
```

---

## 七、实施顺序

### Phase 1：地基（1-2天）
1. 安装 `clsx`（如未安装）
2. 更新 `index.css` — CSS变量 + @property + 工具类
3. 创建 `useMouseTilt.ts` + `useMagnetic.ts` + `useGlow.ts` + `useScrollParallax.ts`
4. 创建 `CthulhuCard3D.tsx`（3D倾斜 + 边框发光 + 变体）
5. 创建 `CthulhuButton.tsx`（磁吸 + 流光 + 3变体）
6. 创建 `AnimatedBorder.tsx`（旋转边框）
7. 创建 `CthulhuProgress.tsx`（三合一进度条）
8. 创建 `GoldOrnament.tsx` + `OccultBadge.tsx`

### Phase 2：Dashboard Bento Grid（2天）
1. 用户信息面板 + XP进度条
2. 功能入口2×2网格 + 磁吸按钮
3. 公告+位阶右侧竖高卡片
4. 深渊广场横幅 + 血氛围
5. 调查员横向条
6. 挂载 `DashboardParticles`
7. 全局磨砂玻璃叠加

### Phase 3：各功能页（每个0.5-1天）
1. 论坛 — masonry + ForumTentacles
2. 背包 — 横向展开 + 标签页动画
3. 好友 — 横向条 + 磁吸添加
4. 黑水港 — HarborBubbles + 抛竿动画
5. 溺者之牌 — CardFlipSpace + 3D翻转
6. 故事书 — 网格 + 视差
7. 调查员 — 横向条 + 属性条

### Phase 4：全局打磨（0.5天）
1. AnimatePresence 页面过渡
2. 侧边栏选中态流光
3. 顶部Header glass-v2
4. 空状态统一 + motion
5. 整体色调微调

---

## 八、最终预期效果

| 维度 | 改造前 | 改造后 |
|------|--------|--------|
| **布局** | 垂直卡片堆叠 | Bento Grid + 非对称 + 横向条 |
| **卡片** | 扁平黑底 | 3D倾斜 + 旋转边框 + 深度层次 |
| **按钮** | 纯色矩形 | 磁吸位移 + 流光扫过 + 弹簧物理 |
| **进度条** | 纯色填充 | 流光注入 + 脉冲警告 + 分段弹出 |
| **氛围** | 静态背景图 | R3F粒子 + 扭曲材质 + 后处理 |
| **交互** | 无/简单变色 | 每个元素都有微反馈 |
| **现代感** | 传统卡片风 | Bento + Glassmorphism V2 + 视差 |
| **克苏鲁感** | 静态图标 | 粒子化 + 扭曲 + 血光 + 触手 |

---

*方案版本: V2.3（终版 — 确认决策已融入）*
*撰写时间: 2026-05-24*
*核心变化: Bento Grid布局 + 磁吸按钮 + 动效进度条 + 现代化微交互*

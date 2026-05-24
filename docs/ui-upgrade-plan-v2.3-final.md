# 沉没之城 UI 质感升级方案 V2.3（终版）
## 确认决策：技术驱动 + 现代化布局 + 动效进度条

**已确认决策：**
- ✅ 浅色主内容区已移除，统一为古城背景图 `/bg-sunken.png`
- ✅ 中文字体沿用当前
- ✅ R3F Canvas **按需挂载**（非全局）— 待实施
- ✅ 磨砂玻璃 `backdrop-filter: blur(16px)` **已应用**（用户面板、调查员卡片）
- ✅ **不需要性能降级**（全开效果）
- ✅ 进度条组件需要迭代优化（增加动效、强化质感）— 待实施
- ✅ **卡片不堆叠** — Dashboard Bento Grid 已完成
- ✅ 引入现代化设计元素 — 金色渐变文字、扫光动效、阴影过渡已完成

---

## 实施状态总览

### ✅ 已完成（Dashboard v2.5）

| 模块 | 状态 | 备注 |
|------|------|------|
| Dashboard Bento Grid 布局 | ✅ | 用户信息 + 功能2×2 + 公告/位阶 + 深渊横幅 + 调查员横条 |
| 全局背景图统一 | ✅ | `/bg-sunken.png` 古城漂浮水面，所有页面统一 |
| 导航栏选中态 | ✅ | 暗红色边框图片（展开/收缩双态）+ 白色/金色扫光动效 |
| 导航栏/顶部栏阴影过渡 | ✅ | 侧边栏右侧阴影 + 顶部栏底部阴影 + 2px金色渐变分隔线 |
| 标题配色优化 | ✅ | `#f5f0e6` → `#c9a227` 深金色 + drop-shadow |
| 调查员卡片全新设计 | ✅ | 背景图(角色portrait/默认克苏鲁图) + 磨砂玻璃 + 血红色渐变 + 10秒垂直平移动画 |
| 用户信息面板 | ✅ | 暗色磨砂玻璃卡片 + 顶部金色渐变线 + 货币徽章(圆形底+图标+数字) |
| 玻璃拟态升级 | ✅ | `backdrop-blur-md` + `bg-[#12121a]/40` + 白色细边框 |

### 🔄 待实施

| 模块 | 优先级 | 备注 |
|------|--------|------|
| `CthulhuProgress` 动效升级 | P1 | XP流光注入、状态脉冲警告、收集分段弹出 |
| `CthulhuCard3D` 3D倾斜效果 | P1 | 鼠标追踪3D旋转 + conic-gradient旋转边框 |
| 磁吸按钮 `CthulhuButton` | P1 | 鼠标位置→弹簧位移 + 流光扫过 |
| R3F 氛围粒子 | P1 | DashboardParticles（金色Sparkles+扭曲符文）等按需挂载 |
| 论坛 Masonry 瀑布流 | P2 | 板块卡片大小交错 |
| 背包横向展开 | P2 | 标签页切换 + 列表式卡片 |
| 好友横向在线条 | P2 | 在线优先 + 磁吸添加按钮 |
| 黑水港沉浸式卡片 | P2 | HarborBubbles 气泡 + 抛竿动画 |
| 溺者之牌 3D翻转 | P2 | CardFlipSpace + 卡牌mesh翻转 |
| 故事书网格+视差 | P2 | 2列网格 + stagger入场 |
| 调查员名册横向条 | P2 | 角色卡片条 + 属性条 HP/MP/SAN |
| 骨架屏升级 | P2 | Shimmer Effect 微光扫过 |
| 视差滚动 | P2 | 各区块不同速度滚动 |

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

### 2.1 玻璃拟态升级（Glassmorphism V2）— 🔄 部分完成

当前磨砂玻璃已升级为：
- ✅ `backdrop-filter: blur(16px)` 已应用（用户面板、调查员卡片、导航栏）
- ✅ `bg-[#12121a]/40` 暗色半透明底已应用
- ✅ 白色细边框 `border-white/[0.08]` 已应用
- 🔄 `saturate(120%)` + 内高光阴影 — 待实施

完整版：
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

---

### 2.2 磁吸按钮（Magnetic Button）— 🔄 待实施

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

### 2.3 骨架屏升级（Shimmer Effect）— 🔄 待实施

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

### 2.4 渐变色文字（Gradient Text）— ✅ 已完成（标题配色）

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

### 2.5 微交互系统（Micro-interactions）— 🔄 部分完成

每个可交互元素必须有反馈：

| 元素 | 默认 | Hover | Active/Click | 状态 |
|------|------|-------|-------------|------|
| 卡片 | 静态 | 3D倾斜 + 边框发光 + 抬升2px | 按下0.98缩放 | 🔄 待实施 |
| 按钮 | 静态 | 磁吸位移 + 流光扫过 + 抬升 | 弹簧按下 + 涟漪 | 🔄 待实施 |
| 输入框 | 暗底 | 金色边框显现 + 内发光 | 波纹扩散 | 🔄 待实施 |
| 标签页 | 静态 | 文字金色 | 指示器滑动 | 🔄 待实施 |
| 头像 | 静态 | 暗金ring发光 + 轻微放大 | — | 🔄 待实施 |
| 图标 | 静态 | 颜色变金 + 轻微弹跳 | — | 🔄 待实施 |
| 导航栏选中态 | 暗红边框图 | 白色扫光条 3秒循环 / hover 金色扫光 | — | ✅ 已完成 |
| 分隔线 | 静态 | — | — | ✅ 已完成（2px金色渐变） |

### 2.6 视差滚动（Parallax Scrolling）— 🔄 待实施

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

## 三、进度条组件重构 `CthulhuProgress` — 🔄 待实施

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

| 组件 | 核心能力 | 文件 | 状态 |
|------|---------|------|------|
| `CthulhuCard3D` | 3D倾斜 + conic-gradient旋转边框 + 弹簧物理 + Bento Grid适配 | `ui/CthulhuCard3D.tsx` | 🔄 部分完成（边框发光已用，3D倾斜待实施） |
| `CthulhuButton` | 磁吸位移 + 流光扫过 + 弹簧按下 + 3变体（主/危险/幽灵） | `ui/CthulhuButton.tsx` | 🔄 待实施 |
| `AnimatedBorder` | CSS `@property` 旋转边框（hover触发/持续旋转） | `ui/AnimatedBorder.tsx` | ✅ 已完成（导航栏扫光动效） |
| `GoldOrnament` | 金色装饰线/四角/分隔线（纯CSS程序化） | `ui/GoldOrnament.tsx` | ✅ 已完成 |
| `CthulhuProgress` | XP流光/状态脉冲/收集分段（三合一） | `ui/CthulhuProgress.tsx` | 🔄 待实施（当前为静态条） |
| `OccultBadge` | 克苏鲁徽章系统 + CSS mask-image纹理化 | `ui/OccultBadge.tsx` | 🔄 待实施 |

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

### P0 — Dashboard（Bento Grid布局）— ✅ 已完成 v2.5

```
┌──────────────────────────────────────────────────────┐ 用户信息面板（宽×短）
│  头像 + 昵称 + 等级徽章  │  SP 1595  ⚡60  │ 每日签到 │  XP进度条（待流光动效）
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

**已实施：**
- ✅ 用户信息面板：暗色磨砂玻璃 + 顶部金色渐变线 + 货币徽章
- ✅ 功能入口：4个卡片 + stagger入场
- ✅ 公告/位阶：右侧竖高卡片
- ✅ 深渊广场：横幅 + 血氛围
- ✅ 调查员：横向滚动容器 + 背景图 + 磨砂玻璃 + 10秒平移动画
- ✅ 全局：`/bg-sunken.png` 古城背景 + 导航栏阴影 + 金色分隔线

**待实施：**
- 🔄 `DashboardParticles` R3F氛围粒子
- 🔄 `CthulhuProgress` XP流光动效
- 🔄 磁吸按钮

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

### Phase 1：Dashboard v2.5 地基（✅ 已完成 — 2026-05-24）
1. ✅ 全局背景图统一 `/bg-sunken.png`
2. ✅ 导航栏选中态（暗红边框图 + 扫光动效）
3. ✅ 导航栏/顶部栏阴影过渡 + 金色渐变分隔线
4. ✅ Dashboard Bento Grid 布局重构
5. ✅ 标题配色优化（深金色 `#c9a227`）
6. ✅ 调查员卡片全新设计（背景图 + 磨砂玻璃 + 血红色渐变 + 动画）
7. ✅ 用户信息面板（磨砂玻璃 + 金色渐变线 + 货币徽章）
8. ✅ `GoldOrnament` 装饰线组件

### Phase 2：核心动效组件（🔄 下一步）
1. `CthulhuProgress` 动效升级 — XP流光注入、状态脉冲、收集分段
2. `CthulhuCard3D` 3D倾斜效果 — 鼠标追踪旋转
3. `CthulhuButton` 磁吸按钮 — 弹簧位移 + 流光扫过
4. R3F 氛围粒子 — `DashboardParticles` 按需挂载

### Phase 3：各功能页改造（🔄 待排期）
1. 论坛 — masonry + `ForumTentacles`
2. 背包 — 横向展开 + 标签页动画
3. 好友 — 横向条 + 磁吸添加
4. 黑水港 — `HarborBubbles` + 抛竿动画
5. 溺者之牌 — `CardFlipSpace` + 3D翻转
6. 故事书 — 网格 + 视差
7. 调查员名册 — 横向条 + HP/MP/SAN属性条

### Phase 4：全局打磨（🔄 待排期）
1. AnimatePresence 页面过渡
2. 骨架屏 `ShimmerSkeleton`
3. 视差滚动 `useScrollParallax`
4. 空状态统一 + motion
5. 整体色调微调

---

## 八、当前效果 vs 预期效果

| 维度 | 改造前 | 当前（v2.5） | 预期（终版） |
|------|--------|-------------|-------------|
| **布局** | 垂直卡片堆叠 | ✅ Bento Grid + 非对称 + 横向条 | 同上 |
| **卡片** | 扁平黑底 | ✅ 磨砂玻璃 + 阴影 + 血红色渐变 | + 3D倾斜 + 旋转边框 |
| **按钮** | 纯色矩形 | 当前静态按钮 | + 磁吸位移 + 流光扫过 + 弹簧物理 |
| **进度条** | 纯色填充 | 当前静态条 | + 流光注入 + 脉冲警告 + 分段弹出 |
| **氛围** | 静态背景图 | ✅ 古城漂浮水面 `/bg-sunken.png` | + R3F粒子 + 扭曲材质 + 后处理 |
| **交互** | 无/简单变色 | ✅ 导航栏扫光 + 卡片hover | + 每个元素都有微反馈 |
| **现代感** | 传统卡片风 | ✅ Bento + Glassmorphism + 阴影过渡 | + 视差 |
| **克苏鲁感** | 静态图标 | ✅ 血红色渐变 + 暗红色边框 + 金色分隔线 | + 粒子化 + 扭曲 + 触手 |

---

*方案版本: V2.3（Dashboard v2.5 已完成 — 2026-05-24）*
*更新时间: 2026-05-24 20:15 CST*
*核心变化: Dashboard Bento Grid + 古城背景 + 导航栏扫光 + 磨砂玻璃用户面板 + 调查员卡片动画*
*下一步: CthulhuProgress动效 / CthulhuCard3D倾斜 / 磁吸按钮 / R3F氛围粒子*

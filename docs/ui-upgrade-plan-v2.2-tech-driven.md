# 沉没之城 UI 质感升级方案 V2.2
## 技术驱动：3D粒子 + 动效引擎 + 程序化质感

**方案定位：** 用代码生成质感，而非贴图叠加。利用已安装的 Three.js + R3F + Postprocessing + Motion 生态，打造动态、交互、有深度的克苏鲁界面。

---

## 一、技术栈能力矩阵（已就绪）

| 库 | 版本 | 核心能力 | 应用场景 |
|----|------|---------|---------|
| `three` | 0.184 | WebGL 3D引擎 | 粒子系统、3D卡片、环境氛围 |
| `@react-three/fiber` | 8.17 | React 3D渲染器 | Canvas组件内嵌、组件化3D对象 |
| `@react-three/drei` | 9.122 | R3F工具集 | Float浮动、MeshDistortMaterial扭曲材质、ContactShadows、Sparkles粒子 |
| `@react-three/postprocessing` | 2.19 | 后处理特效 | Bloom辉光、Noise噪点、Vignette暗角、ChromaticAberration色差 |
| `motion` | 12.40 | 动画引擎 | 页面过渡、卡片hover、弹簧物理、布局动画、滚动触发 |
| `tailwindcss` | 3.4 | 样式框架 | 设计令牌、工具类、响应式 |

**新增依赖建议（仅2个）：**
- `clsx` — 条件类名组合（已间接依赖，建议显式安装）
- 无需安装GSAP（motion已覆盖），无需安装新字体（按决策沿用当前）

---

## 二、核心质感系统（代码生成，拒绝贴图思维）

### 2.1 3D氛围层 `AtmosphereCanvas`

**R3F全局氛围组件，按需挂载到各页面：**

```tsx
// 使用 drei 的 Sparkles + 自定义粒子
<Canvas
  style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
  camera={{ position: [0, 0, 5], fov: 75 }}
>
  <PostProcessing>
    <Bloom intensity={0.5} luminanceThreshold={0.2} />
    <Noise opacity={0.03} />
    <Vignette eskil={false} offset={0.3} darkness={0.5} />
  </PostProcessing>
  <Sparkles
    count={50}
    scale={10}
    size={2}
    speed={0.3}
    opacity={0.4}
    color="#D4A853"
  />
  <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
    {/* 漂浮的克苏鲁符文几何体 */}
    <mesh>
      <icosahedronGeometry args={[0.3, 0]} />
      <MeshDistortMaterial color="#1a1a24" distort={0.3} speed={2} />
    </mesh>
  </Float>
</Canvas>
```

**页面级氛围配置：**
- **Dashboard** — 金色微尘 + 暗色漂浮符文（克苏鲁神秘感）
- **论坛** — 缓慢漂浮的暗色触手状几何体（扭曲材质）
- **黑水港** — 蓝色调气泡上浮 + 海底光线效果
- **溺者之牌** — 暗紫色粒子 + 卡牌翻转3D空间
- **背包** — 微光粒子（像物品闪烁）
- **房间系统** — 环境氛围切换（normal/dark/horror/mystery/warm 对应不同粒子颜色）

### 2.2 3D交互卡片 `CthulhuCard3D`

**鼠标跟随3D倾斜 + 边框发光 + 深度层次：**

```tsx
// 使用 R3F 的 useFrame + useThree 做鼠标追踪
// 或纯 CSS transform3d 版本（更轻量，首选）

const CthulhuCard3D = ({ children, variant = 'abyss' }) => {
  const ref = useRef(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glow, setGlow] = useState(false);

  const handleMouseMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotateX(y * -12); // 最大12度倾斜
    setRotateY(x * 12);
  };

  return (
    <motion.div
      ref={ref}
      className="relative"
      style={{
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setRotateX(0); setRotateY(0); setGlow(false); }}
      onMouseEnter={() => setGlow(true)}
      animate={{
        rotateX,
        rotateY,
        scale: glow ? 1.02 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* 边框发光层 — CSS conic-gradient 动画 */}
      <div
        className="absolute -inset-[1px] rounded-lg opacity-0 transition-opacity duration-500"
        style={{
          opacity: glow ? 0.6 : 0,
          background: `conic-gradient(from 0deg, transparent, #D4A853, transparent, #8B1A1A, transparent)`,
          filter: 'blur(4px)',
        }}
      />

      {/* 主卡片体 */}
      <div className="relative bg-[#12121A] rounded-lg border border-[#242430] overflow-hidden backdrop-blur-sm"
        style={{ transform: 'translateZ(20px)' }}
      >
        {/* 程序化纹理：CSS noise + gradient */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* 顶部金色光带 */}
        <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#D4A853]/40 to-transparent" />

        {/* 四角装饰 — CSS绘制 */}
        <CornerAccent position="top-left" glow={glow} />
        <CornerAccent position="top-right" glow={glow} />
        <CornerAccent position="bottom-left" glow={glow} />
        <CornerAccent position="bottom-right" glow={glow} />

        {/* 内容 */}
        <div className="relative p-5"
          style={{ transform: 'translateZ(30px)' }}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
};
```

**卡片变体（通过 CSS 变量切换）：**
- `abyss` — 暗底 `#12121A` + 暗金边框 `#D4A853/20` + 顶部微光
- `blood` — 暗底 + 血红边框 `#8B1A1A/30` + 底部血滴CSS动画
- `gold` — 暗底 + 金色边框 `#D4A853/40` + 金色内部光晕
- `parchment` — 稍浅底 `#1A1A24` + 羊皮纸色文字 + 复古边框

### 2.3 动态边框系统 `AnimatedBorder`

**CSS @property + conic-gradient 实现旋转边框光效：**

```css
@property --angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.animated-border {
  position: relative;
  background: #12121A;
  border-radius: 8px;
}

.animated-border::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 10px;
  background: conic-gradient(from var(--angle), #242430, #D4A853, #8B1A1A, #242430);
  z-index: -1;
  animation: rotate-border 4s linear infinite;
  opacity: 0;
  transition: opacity 0.5s;
}

.animated-border:hover::before {
  opacity: 1;
}

@keyframes rotate-border {
  to { --angle: 360deg; }
}
```

**应用：** VIP卡片、重要通知、选中状态的卡片边框

### 2.4 按钮动效系统 `CthulhuButton`

**主按钮（暗金3D按压感）：**

```tsx
<motion.button
  className="relative px-6 py-3 bg-[#1A1A24] text-[#D4A853] rounded-md overflow-hidden group"
  whileHover={{ scale: 1.05, y: -2 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
>
  {/* 底部阴影 — 制造3D按压感 */}
  <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-black/40 to-transparent" />

  {/* hover 流光扫过 */}
  <motion.div
    className="absolute inset-0 bg-gradient-to-r from-transparent via-[#D4A853]/10 to-transparent"
    initial={{ x: '-100%' }}
    whileHover={{ x: '100%' }}
    transition={{ duration: 0.6 }}
  />

  {/* 顶部高光 */}
  <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#D4A853]/50 to-transparent" />

  <span className="relative z-10">{label}</span>
</motion.button>
```

**危险按钮（血光脉冲）：**

```tsx
<motion.button
  className="relative px-6 py-3 bg-[#8B1A1A] text-[#F5F0E6] rounded-md overflow-hidden"
  animate={{
    boxShadow: ['0 0 0px rgba(139,26,26,0)', '0 0 20px rgba(139,26,26,0.4)', '0 0 0px rgba(139,26,26,0)'],
  }}
  transition={{ duration: 2, repeat: Infinity }}
>
  {/* 血滴SVG装饰 */}
  <svg className="absolute bottom-0 left-2 w-3 h-4" >
    <path d="M1.5,0 Q3,2 1.5,4" stroke="#8B1A1A" strokeWidth="1.5" fill="none" opacity="0.6" />
  </svg>
  <span>{label}</span>
</motion.button>
```

### 2.5 克苏鲁纹理生成器（CSS程序化）

**触手暗纹（纯CSS）：**

```css
.tentacle-texture {
  background:
    radial-gradient(ellipse at 20% 80%, rgba(30, 58, 58, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(30, 58, 58, 0.06) 0%, transparent 40%),
    radial-gradient(ellipse at 50% 50%, rgba(139, 26, 26, 0.03) 0%, transparent 60%);
}
```

**暗金颗粒（CSS noise）：**

```css
.gold-grain {
  position: relative;
}
.gold-grain::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.04;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  pointer-events: none;
  mix-blend-mode: overlay;
}
```

**血迹流淌动画：**

```css
@keyframes blood-drip {
  0% { transform: translateY(-100%); opacity: 0; }
  20% { opacity: 0.6; }
  80% { opacity: 0.4; }
  100% { transform: translateY(200%); opacity: 0; }
}

.blood-drip::after {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  width: 2px;
  height: 20px;
  background: linear-gradient(to bottom, transparent, #8B1A1A, transparent);
  animation: blood-drip 4s ease-in infinite;
}
```

### 2.6 Motion 页面过渡系统

**AniPresence 页面切换：**

```tsx
import { AnimatePresence, motion } from 'motion/react';

// 路由级包裹
<AnimatePresence mode="wait">
  <motion.div
    key={location.pathname}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3, ease: 'easeInOut' }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

**卡片入场动画：**

```tsx
<motion.div
  initial={{ opacity: 0, y: 30, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 0.5, delay: index * 0.1 }}
>
  <CthulhuCard3D>...</CthulhuCard3D>
</motion.div>
```

**滚动触发动画：**

```tsx
<motion.div
  initial={{ opacity: 0, x: -30 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true, margin: '-100px' }}
  transition={{ duration: 0.6 }}
>
  ...
</motion.div>
```

---

## 三、具体页面改造（技术效果对应）

### Dashboard 首页

| 元素 | 技术方案 |
|------|---------|
| **全局氛围** | R3F Canvas 挂载：50个金色 Sparkles + 3个 Float 扭曲符文几何体 |
| **用户面板** | `CthulhuCard3D variant-gold` + `AnimatedBorder` 选中态 + 头像暗金ring |
| **四大功能入口** | 4个 `CthulhuCard3D variant-abyss` 等大卡片，3D倾斜+hover流光+金色顶部光带 |
| **公告板** | `CthulhuCard3D variant-parchment` + 羊皮纸颗粒纹理 + 打字机文字入场效果 |
| **位阶/印记** | `CthulhuCard3D variant-gold` + `AnimatedBorder` 持续旋转边框 + 内部克苏鲁徽章 |
| **调查员卡片** | `CthulhuCard3D` 放大 + motion layout 动画 + 属性条增长动画 |
| **深渊广场** | 横幅 `CthulhuCard3D variant-blood` + 血光脉冲 + "进入"按钮流光扫过 |

### 论坛（旧日低语）

- 板块卡片：`CthulhuCard3D variant-abyss` + 3D倾斜
- 氛围层：R3F挂载缓慢扭曲的触手状 MeshDistortMaterial 几何体（暗绿色）
- 主题数字：motion 数字增长动画
- 空状态：motion 渐入 + 暗角 vignette 后处理

### 背包

- 物品行：`CthulhuCard3D` 简化版（低padding）+ hover 3D抬升
- 标签页：motion layout 动画（选中项滑动指示器）
- 头像框物品：3D翻转预览（CSS transform3d）

### 溺者之牌

- 全局氛围：R3F暗紫色 Sparkles + 迷雾效果（drei 的 Cloud 或自定义 shader）
- 卡牌：R3F 3D卡片翻转动画（CSS或R3F mesh）
- 解牌结果：`CthulhuCard3D variant-blood` + 血迹流淌动画
- "占卜"按钮：主按钮 + 按下时 motion scale 弹跳

### 黑水港

- 全局氛围：R3F蓝色气泡粒子上浮 + 海底光线（drei Lightformer）
- 钓鱼区域：`CthulhuCard3D` + 波纹CSS动画 + 水下 distortion shader
- "抛竿"按钮：按下触发 motion 弹跳 + 水波纹扩散动画

### 好友

- 好友卡片：`CthulhuCard3D` + 在线状态发光圆点（motion pulse动画）
- "添加好友"按钮：主按钮流光扫过
- 空状态：motion fadeIn + 暗角 + 克苏鲁文案

### 故事书

- 房间卡片：`CthulhuCard3D` + motion stagger 入场（每个卡片延迟0.1s）
- "进入房间"按钮：幽灵按钮 + hover金色边框显现
- 标题：文字金色渐变（CSS `background-clip: text`）

### 调查员名册

- 角色卡片：`CthulhuCard3D variant-gold` + 头像3D hover tilt
- "记录命运"按钮：主按钮 + 按下触发 motion scale

---

## 四、克苏鲁徽章纹理系统 `OccultTexture`

不只做图标，而是作为**程序化纹理**应用到各种UI元素：

### 徽章粒子化

```tsx
// 将 occult 徽章做成 R3F 3D悬浮粒子
const OccultParticle = ({ type, position }) => {
  const texture = useTexture(`/images/occult-${type}.png`);
  return (
    <Float speed={2} floatIntensity={1}>
      <mesh position={position}>
        <planeGeometry args={[0.5, 0.5]} />
        <meshBasicMaterial map={texture} transparent opacity={0.3} />
      </mesh>
    </Float>
  );
};
```

### 纹理蒙版应用

```css
/* 用 occult 图标作为 CSS mask-image */
.occult-masked {
  mask-image: url('/images/occult-eye.png');
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
}

/* 用于：卡片背景纹理化、按钮hover、分隔线装饰 */
```

### 应用地图

| 纹理 | 应用场景 |
|------|---------|
| `occult-eye.png` | 线索/洞察按钮hover、通知角标、搜索框聚焦状态 |
| `occult-moon.png` | 夜间模式标识、梦境相关元素、离线状态 |
| `occult-skull.png` | 死亡/危险提示、HP低状态边框、战斗页面装饰 |
| `occult-sun.png` | 在线状态、普通模式、白天场景 |
| `occult-death-crown.png` | GM标识、管理员徽章、房主标签 |
| `occult-eye-2.png` | 疯狂状态、变异指示、SAN值警告 |

---

## 五、实施架构

### 文件结构

```
src/
  components/
    ui/
      CthulhuCard3D.tsx        # 3D交互卡片主组件
      CthulhuButton.tsx        # 按钮系统
      AnimatedBorder.tsx         # 动态边框
      GoldOrnament.tsx           # 金色装饰元素
      OccultBadge.tsx            # 克苏鲁徽章
    atmosphere/
      AtmosphereCanvas.tsx       # R3F全局氛围
      DashboardParticles.tsx     # Dashboard金色粒子
      ForumTentacles.tsx         # 论坛触手氛围
      HarborBubbles.tsx          # 黑水港气泡
      CardFlipSpace.tsx          # 溺者之牌3D空间
  hooks/
    useMouseTilt.ts            # 鼠标3D倾斜hook
    useGlow.ts                 # 发光状态hook
  pages/
    dashboard/
      DashboardPage.tsx          # 引用新组件系统
```

### Phase 1：地基（1-2天）

1. **创建核心组件**（4个文件）
   - `CthulhuCard3D.tsx` — 3D倾斜 + 边框发光 + 四角装饰 + 变体系统
   - `CthulhuButton.tsx` — 主/危险/幽灵三变体 + motion动画
   - `AnimatedBorder.tsx` — CSS @property conic-gradient 旋转边框
   - `GoldOrnament.tsx` — 金色装饰线/四角/分隔线（纯CSS）

2. **创建氛围组件**（2个文件）
   - `AtmosphereCanvas.tsx` — R3F Canvas 封装 + PostProcessing
   - `DashboardParticles.tsx` — 金色 Sparkles + 扭曲符文

3. **创建工具Hooks**（2个文件）
   - `useMouseTilt.ts` — 鼠标位置到3D旋转角度的映射
   - `useGlow.ts` — 发光状态管理

4. **CSS变量系统更新**
   - 在 `index.css` 中补充克苏鲁设计令牌
   - 添加 `@property --angle` 等CSS自定义属性
   - 添加程序化纹理类（`.tentacle-texture`, `.gold-grain`, `.blood-drip`）

### Phase 2：Dashboard 首页（1-2天）

1. 全局挂载 `DashboardParticles` 氛围
2. 用户面板 → `CthulhuCard3D variant-gold`
3. 四大入口 → `CthulhuCard3D variant-abyss` × 4
4. 公告板 → `CthulhuCard3D variant-parchment`
5. 位阶/印记 → `CthulhuCard3D variant-gold` + `AnimatedBorder`
6. 调查员卡片 → `CthulhuCard3D` + motion stagger入场
7. 深渊广场 → `CthulhuCard3D variant-blood`
8. 所有按钮 → `CthulhuButton`

### Phase 3：各功能页（每个0.5-1天）

1. 论坛 — `ForumTentacles` 氛围 + 板块卡片
2. 背包 — 物品行简化卡片 + 标签页动画
3. 黑水港 — `HarborBubbles` 氛围 + 钓鱼区域
4. 溺者之牌 — `CardFlipSpace` + 解牌结果卡片
5. 好友 — 好友卡片 + 在线脉冲
6. 故事书 — 房间卡片stagger入场
7. 调查员 — 角色卡片放大 + 头像tilt

### Phase 4：全局打磨（0.5天）

1. AnimatePresence 页面过渡
2. 侧边栏选中态 `AnimatedBorder`
3. 顶部Header流光边框
4. 空状态统一 motion fadeIn
5. 整体色调微调（保证金色不偏黄、血红不刺眼）

---

## 六、性能保障

| 策略 | 实施 |
|------|------|
| **R3F Canvas 按需挂载** | 不是每个页面都放3D，只有需要氛围的页面才挂载，且 `pointerEvents: 'none'` |
| **Sparkles 数量控制** | 最多50个粒子，size限制在2以内 |
| **motion 减少重排** | 使用 `transform` 和 `opacity` 动画，避免 `width/height/top/left` |
| **will-change** | 对频繁动画元素添加 `will-change: transform` |
| **CSS containment** | 卡片容器加 `contain: layout style paint` |
| **Canvas 懒加载** | R3F组件用 `React.lazy` + `Suspense` 包裹 |
| **Postprocessing 降级** | 低性能设备禁用 Bloom/Noise，仅保留 Vignette |

---

## 七、预期效果（可量化）

| 指标 | 当前 | 改造后 |
|------|------|--------|
| 卡片hover反馈 | 无/简单变色 | 3D倾斜+边框流光+缩放 |
| 按钮交互 | 纯色变化 | 弹簧物理+流光扫过+血光脉冲 |
| 页面切换 | 硬切 | motion淡入淡出+位移 |
| 氛围感 | 静态背景图 | 动态粒子+漂浮符文+后处理 |
| 质感层次 | 单层 | 3D深度层：边框→底纹→内容 |
| 克苏鲁元素 | 静态图标 | 粒子化/纹理化/动画化 |

---

## 八、确认事项

1. **R3F Canvas 是否全局挂载？**
   - A. 全局（所有页面都有基础粒子氛围）+ 各页面叠加专属氛围
   - B. 按需（只有特定页面挂载3D氛围，其他页面纯CSS动画）

2. **性能优先级**
   - 高端设备全开 vs 中低端降级？
   - 是否需要 `prefers-reduced-motion` 支持？

3. **当前磨砂玻璃效果**
   - 保留当前 `backdrop-filter: blur(10px)` 磨砂效果，与新系统叠加？
   - 还是替换为新的程序化纹理？

---

*方案版本: V2.2（技术驱动：3D粒子 + 动效引擎 + 程序化质感）*
*撰写时间: 2026-05-24*
*核心理念: 用代码生成质感，让界面呼吸*

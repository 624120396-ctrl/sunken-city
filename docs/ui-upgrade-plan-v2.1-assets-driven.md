# 沉没之城 UI 质感升级方案 V2.1
## 基于现有素材的卡片质感化改造

**决策确认：**
- ✅ 主内容区保留浅色背景（当前 `#F7F4E9 → #F3F0E6` 渐变）
- ✅ 中文字体沿用当前，不做衬线化改造
- ✅ 优先使用 `public/images/` 和 `downloads/` 中已有素材，不新增外部依赖

---

## 一、已有素材清单与用途规划

### 1. public/images/ 已部署素材（37个文件）

| 文件名 | 内容 | 当前使用 | 新规划用途 |
|--------|------|---------|-----------|
| `bg-global.jpg` | 全局背景图 | ❌ | 侧边栏/全局暗纹底图 |
| `bg05.png/.webp` | 暗色石质纹理 | ✅ CSS某处 | 深色卡片背景/按钮底纹 |
| `bg05231bg.png` | 背景图 | ❌ | 功能页 Hero 区域背景 |
| `3bg05233bg.png/.webp` | 背景图 | ❌ | 印记图鉴/位阶天梯背景 |
| `4bg05241bg.png/.webp` | 背景图 | ❌ | 论坛/背包页面背景 |
| `bg-dreamscape.png` | 梦境风景 | ✅ profile页 | 溺者之牌/梦境相关页面 |
| `bg-eldritch.png` | 怪异/触手纹理 | ❌ | 卡片暗纹叠加层 |
| `bg-underwater.png` | 水下沉没城 | ✅ 钓鱼/梦境 | 黑水港页面 |
| `card-bg-parchment.jpg` | 羊皮纸纹理 | ✅ Dashboard公告 | **所有卡片内层纹理叠加** |
| `card-bg-smoke.png` | 烟雾纹理 | ✅ Dashboard | **卡片hover烟雾浮现** |
| `card-bg-tentacle.png` | 触手暗纹 | ✅ FeatureCard | **遗物/深渊主题卡片默认背景** |
| `dark-marble-gold.jpg` | 暗金大理石 | ✅ 位阶天梯 | 金色主题卡片背景 |
| `dark-marble-gray.jpg` | 暗灰大理石 | ✅ 位阶天梯 | 灰调卡片背景 |
| `dark-marble-veins.jpg` | 暗色脉络 | ✅ 位阶天梯 | 暗底装饰卡片 |
| `dark-marble-white.jpg` | 白调大理石 | ✅ 位阶天梯 | 浅色卡片纹理 |
| `gold-brush-stroke.png` | 金色笔刷 | ✅ CSS装饰 | 标题装饰线/按钮hover |
| `gold-geometry.png` | 金色几何 | ❌ | **功能图标背景/徽章底** |
| `gold-marble.jpg` | 金色大理石 | ❌ | **重要卡片/VIP区域背景** |
| `gold-paint.jpg` | 金色颜料 | ❌ | **按钮hover流光效果** |
| `gold-shards.jpg` | 金色碎片 | ✅ CSS | 装饰闪烁效果 |
| `gold-vine-ornate.png` | 复杂金色藤蔓 | ❌ | **卡片四角装饰/边框** |
| `gold-vine-simple.png` | 简约金色藤蔓 | ✅ CSS | 标题下划线/分隔线 |
| `blood-hand-drip.png` | 滴血手 | ❌ | **恐怖主题卡片装饰** |
| `blood-hands.png` | 血手 | ❌ | **战斗/死亡相关元素** |
| `blood-splatter.png` | 血迹飞溅 | ❌ | **卡片边缘血迹装饰** |
| `occult-death-crown.png` | 死亡之冠 | ❌ | **GM/房主标识** |
| `occult-eye.png` | 全视之眼 | ✅ CSS徽章 | **洞察/线索图标** |
| `occult-eye-2.png` | 变异之眼 | ❌ | **恐怖状态/疯狂指示** |
| `occult-moon.png` | 暗月 | ✅ CSS徽章 | **夜晚/梦境主题** |
| `occult-skull.png` | 骷髅 | ✅ CSS徽章 | **死亡/HP危险状态** |
| `occult-sun.png` | 暗日 | ✅ CSS徽章 | **白天/普通状态** |
| `nav-texture.jpg` | 导航纹理 | ✅ 多处CSS | 继续用于侧边栏纹理 |
| `logo-gold.png` | 金色Logo | ✅ TopNav | 保持 |
| `app-icon.png` | 应用图标 | ❌ | PWA图标/标签页favicon |

### 2. downloads/ 待复制素材（需移入 public/images/）

| 文件名 | 内容 | 建议复制后用途 |
|--------|------|---------------|
| `2bg05232bg.png` | **宇宙星空+几何符号**（三角形/六边形/圆形符文） | 跑团房间/神秘学页面背景 |
| `jimeng-深渊黑到血色渐变_触手暗纹.png` | 克苏鲁触手剪影+暗红烟雾 | **深渊广场/恐怖主题页面全屏背景** |
| `03.jpg` | 克苏鲁角色素材 | 角色卡展示/调查员头像背景 |
| `181.jpg` | 克苏鲁场景 | 故事书/房间卡片背景 |
| `182.jpg` | 克苏鲁场景 | 论坛板块头图 |
| `1_53_.jpg` ~ `1_72_.jpg` | 多张克苏鲁插画 | 各功能页 Hero 区轮换背景 |
| `20_.png`, `16_.png`, `2_.png` | 克苏鲁装饰元素 | 卡片装饰/空状态插画 |
| `1_35_.png` ~ `1_101_.png` | 克苏鲁风格素材 | 徽章/图标/装饰 |
| `cmicon1.png` | **章鱼骷髅金色徽章** | **应用Logo/网站favicon/加载图标** |
| `cmlogo_1_2.png` | **HEX金属哥特Logo** | **登录页/关于页品牌展示** |
| `黑白页岩_81_.jpg` | 黑白石质纹理 | 某些卡片的磨砂底纹 |
| `叶子素材08/17/26.png` | 装饰性叶子/触手状植物 | 卡片边缘装饰/动态飘落 |
| `小刘素材_18_.png` | 不明素材 | 需确认内容后规划 |
| `kling_海蓝色调_沉没_117_1.png` | AI生成的沉没城市 | **首页Dashboard主视觉背景** |

---

## 二、核心改造策略：素材驱动式升级

### 原则
1. **浅色背景不动** — 主内容区保持 `#F7F4E9 → #F3F0E6`，用卡片自身质感拉开层次
2. **卡片即画布** — 每张卡片内部做暗底+纹理+边框装饰，像画框悬浮在浅色背景上
3. **素材即装饰** — 不用CSS手绘边框，直接用金色藤蔓、血迹、大理石纹理作为物理装饰层
4. **局部暗色块** — 只有卡片内部是深色，形成"浅色画纸上的暗色油画"效果

### 视觉公式
```
页面 = 浅色羊皮纸背景 + [暗底纹理卡片 + 金色装饰 + 克苏鲁图标] + 浅色留白呼吸
```

---

## 三、基础组件库设计（素材驱动）

### 1. `CthulhuCard` — 克苏鲁质感卡片

**核心特征：**
- **外框层**：`card-bg-parchment.jpg` 极淡叠加（opacity 0.03）在卡片底色上，制造纸张纤维感
- **底色层**：使用 `bg05.png` 或 `dark-marble-gray.jpg` 作为暗底纹理
- **四角装饰**：`gold-vine-ornate.png` 定位在四角（旋转适配），形成画框感
- **顶部光带**：`gold-brush-stroke.png` 横向压缩作为顶部微光条
- **边框线**：CSS绘制双边框（外层暗金 `rgba(184,146,58,0.3)` + 内层更细）
- **Hover效果**：`card-bg-smoke.png` 淡入浮现（opacity 0→0.08），营造"苏醒"感

**变体：**
- `.variant-tentacle` — 使用 `card-bg-tentacle.png` 作为底纹（遗物/深渊主题）
- `.variant-gold` — 使用 `gold-marble.jpg` 或 `dark-marble-gold.jpg` 作为底纹（VIP/重要）
- `.variant-blood` — 使用 `blood-splatter.png` 边缘叠加（战斗/恐怖主题）
- `.variant-parchment` — 使用 `card-bg-parchment.jpg` 主纹理（公告/文本类）

### 2. `CthulhuButton` — 质感按钮

**主按钮（暗金）：**
- 背景：`bg05.png` + CSS渐变叠加（暗底到稍亮底）
- 文字：金色 `#D4A853`
- 边框：`gold-brush-stroke.png` 作为底部边框装饰（1px高度，拉伸）
- Hover：`gold-paint.jpg` 流光从左到右扫过（mask-image + 动画）
- 按下：内阴影 + `gold-shards.jpg` 微闪烁

**危险按钮（血红）：**
- 背景：`blood-hand-drip.png` 底部边缘叠加 + 暗红底色
- Hover：`blood-splatter.png` 从边缘扩展

**幽灵按钮：**
- 透明底 + `gold-vine-simple.png` 作为底部细线装饰
- Hover：`card-bg-parchment.jpg` 淡入填充

### 3. `OccultBadge` — 神秘徽章系统

将现有 `occult-*.png` 素材做成徽章组件：
- `variant="eye"` — `occult-eye.png`（洞察/线索）
- `variant="eye2"` — `occult-eye-2.png`（疯狂/变异状态）
- `variant="moon"` — `occult-moon.png`（夜晚/梦境）
- `variant="sun"` — `occult-sun.png`（普通/白天）
- `variant="skull"` — `occult-skull.png`（死亡/HP低）
- `variant="crown"` — `occult-death-crown.png`（GM/房主/管理员）

徽章样式：圆形暗底 + 图标居中 + 外圈金色细环（hover时发光）

### 4. `BloodDrip` — 血迹装饰

直接使用素材：
- `blood-hand-drip.png` — 用于恐怖主题卡片顶部/底部
- `blood-splatter.png` — 用于按钮边缘/卡片角落
- `blood-hands.png` — 用于空状态/错误页面装饰

### 5. `GoldOrnament` — 金色装饰线

- `gold-vine-simple.png` — 标题下方装饰线（横向拉伸）
- `gold-vine-ornate.png` — 卡片四角装饰（四角定位+旋转）
- `gold-geometry.png` — 功能区块分隔/图标背景
- `gold-brush-stroke.png` — 按钮顶部高光/卡片顶部光带

---

## 四、逐页面改造方案

### P0 — Dashboard 首页（改造核心，其他页面参考此标准）

**当前问题（图8）：**
- 用户面板深色横条与浅色背景割裂
- 功能入口4个小方块+红底烟雾太花
- 公告板羊皮纸色与周围不统一
- 位阶/印记卡片红底突兀
- 调查员卡片太小太空
- 深渊广场横幅简陋

**改造方案：**

| 区域 | 改造 |
|------|------|
| **用户面板** | 横向卡片用 `dark-marble-gold.jpg` 底纹 + `gold-vine-ornate.png` 四角装饰 + 头像加 `occult-death-crown.png` 小徽章 |
| **四大功能入口** | 4张 `CthulhuCard variant-tentacle` 等大卡片，内部有 `gold-geometry.png` 图标背景 + 暗金标题 + 底部 `gold-brush-stroke.png` 光带 |
| **公告/旧日低语** | `CthulhuCard variant-parchment`，`card-bg-parchment.jpg` 主纹理 + `gold-vine-simple.png` 标题下划线 |
| **位阶/印记** | `CthulhuCard variant-gold`，`gold-marble.jpg` 底纹 + `occult-eye.png` 徽章 + `gold-vine-ornate.png` 边框 |
| **调查员卡片** | 放大 + `dark-marble-gray.jpg` 底纹 + 头像暗金圆框 + 底部属性条 |
| **深渊广场** | 横幅式 `CthulhuCard variant-tentacle`，`jimeng-触手暗纹背景` 或 `card-bg-tentacle.png` 全底纹 + "进入"按钮用主按钮样式 |
| **背景氛围** | 保持浅色，但在页面底部加入极低透明度的 `2bg05232bg.png` 星空几何（opacity 0.02）作为"远方深渊"暗示 |

### P1 — 调查员名册（图7）

**改造：**
- 角色卡片改为 `CthulhuCard variant-gold`，使用 `03.jpg` 或角色头像作为顶部大图
- 卡片内部：`dark-marble-gold.jpg` 底纹 + `occult-eye.png` 状态徽章
- "记录命运"按钮：主按钮样式（`bg05.png` + 金色文字 + `gold-brush-stroke.png` 底部光带）
- 空状态：中央放置 `cmicon1.png` 章鱼骷髅图标 + "暂无调查员记录"暗金文字

### P1 — 故事书（图6）

**改造：**
- 房间卡片统一为 `CthulhuCard`，根据房间类型使用不同变体：
  - 跑团房间 → `variant-tentacle`
  - 故事模式 → `variant-parchment`
- 卡片顶部加入 `181.jpg` 或 `182.jpg` 缩略图（圆角裁切）
- 标题文字金色，完整显示（处理超长标题）
- "进入房间" → 幽灵按钮样式 + 箭头图标
- 顶部"加入故事"/"开启故事"按钮：主按钮样式

### P1 — 好友（图5）

**改造：**
- 好友卡片：`CthulhuCard`，左侧头像暗金圆框 + 在线状态用 `occult-sun.png`（在线）/ `occult-moon.png`（离线）
- 昵称金色，ID暗灰
- 操作按钮：小型圆形幽灵按钮（邀请/删除）
- "添加好友"按钮：主按钮样式
- 空状态：`blood-hands.png` 淡底纹 + "孤独是深渊的常态"暗金文字

### P1 — 论坛（图1）

**改造：**
- 板块卡片：`CthulhuCard variant-tentacle`，每个板块用不同 `occult-*.png` 作为图标：
  - 密斯卡托尼克大学 → `occult-eye.png`（知识/洞察）
  - 印斯茅斯镇 → `occult-moon.png`（海边/夜晚）
  - 幻梦境 → `occult-skull.png`（梦境/虚幻）
  - 敦威治酒馆 → `occult-sun.png`（日常/温暖）
  - 阿卡姆市政厅 → `occult-death-crown.png`（官方/权威）
- 主题数字用金色大字 + "主题"小字
- 描述文字用暗羊皮纸色
- 背景加入极淡 `nav-texture.jpg` 作为全局纹理

### P1 — 背包（图2）

**改造：**
- 标签页改造：当前按钮式 → 暗底胶囊形 + 选中项有 `gold-brush-stroke.png` 下划线
- 物品行：`CthulhuCard` 简化版（无边框，仅底纹+hover边框显现）
- 头像框物品：预览图加暗金圆框 + `occult-death-crown.png` 角标
- 背景加入极淡 `card-bg-parchment.jpg` 纹理

### P1 — 溺者之牌（图4）

**改造：**
- 卡牌容器：`CthulhuCard variant-tentacle`，`card-bg-tentacle.png` 全底纹
- 卡牌本身放大，暗金边框 + 角落 `gold-vine-ornate.png` 装饰
- 解牌结果框：`CthulhuCard variant-parchment`，`card-bg-parchment.jpg` 纹理 + `gold-vine-simple.png` 标题装饰
- "今日占卜"/"图鉴"/"历史"按钮：幽灵按钮样式
- 整体氛围：背景加入极低透明度 `bg-dreamscape.png`

### P1 — 黑水港垂钓（图3）

**改造：**
- 钓鱼区域卡片：`CthulhuCard`，`bg-underwater.png` 作为卡片内背景（裁剪适配）
- 鱼竿区域暗底 + 波光CSS动画
- 右侧收集面板：`CthulhuCard variant-parchment`，列表项有 `gold-vine-simple.png` 分隔线
- "抛竿"按钮：主按钮样式 + 按下时水花粒子效果

### P2 — 侧边栏

**改造：**
- Logo区：使用 `cmicon1.png` 章鱼骷髅图标 + "沉没之城"文字（当前字体）
- 背景：`nav-texture.jpg` + 暗底叠加
- 选中项：左侧竖线 + `gold-brush-stroke.png` 微光背景
- 图标：当前Lucide图标保留，但hover时叠加 `occult-eye.png` 微光
- 底部：版本号用 `gold-vine-simple.png` 分隔线上方

### P2 — 顶部Header

**改造：**
- 背景：`nav-texture.jpg` + 底部 `gold-brush-stroke.png` 1px分割线
- 搜索框：暗底 + `bg05.png` 纹理 + 暗金边框
- 通知铃铛：`occult-eye.png` 作为红点替换（更有克苏鲁感）
- 用户头像：暗金圆环边框

---

## 五、素材部署计划

### Step 1: 复制 downloads → public/images
```bash
cp /root/.openclaw/workspace/downloads/19e5617c-5632-8f18-8000-0000a1a5e855_2bg05232bg.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/bg-cosmic-symbols.png
cp /root/.openclaw/workspace/downloads/19e56756-a192-892b-8000-000003aa5526_jimeng-*.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/bg-abyss-tentacle.png
cp /root/.openclaw/workspace/downloads/19e56125-a212-8101-8000-0000bb8748e5_03.jpg /root/.openclaw/workspace/coc-platform/apps/web/public/images/cultist-03.jpg
cp /root/.openclaw/workspace/downloads/19e5612b-7e82-8528-8000-0000c0e150f1_181.jpg /root/.openclaw/workspace/coc-platform/apps/web/public/images/scene-181.jpg
cp /root/.openclaw/workspace/downloads/19e5612b-ec92-8504-8000-0000427b10a3_182.jpg /root/.openclaw/workspace/coc-platform/apps/web/public/images/scene-182.jpg
cp /root/.openclaw/workspace/downloads/19e56104-2532-8e32-8000-00004f66e686_20_.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/ornament-20.png
cp /root/.openclaw/workspace/downloads/19e56106-38c2-85eb-8000-0000c13a41e1_16_.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/ornament-16.png
cp /root/.openclaw/workspace/downloads/19e56108-8fb2-8e65-8000-0000261d9b09_2_.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/ornament-02.png
cp /root/.openclaw/workspace/downloads/19e56151-f482-880e-8000-00006eecdf06_1_35_.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/decoration-35.png
cp /root/.openclaw/workspace/downloads/19e56152-8de2-8569-8000-0000834e96b8_1_45_.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/decoration-45.png
cp /root/.openclaw/workspace/downloads/19e56153-b262-89ab-8000-0000f238fdb7_1_54_.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/decoration-54.png
cp /root/.openclaw/workspace/downloads/19e56155-87f2-8693-8000-00006bc88b45_1_96_.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/decoration-96.png
cp /root/.openclaw/workspace/downloads/19e56156-1352-8a2a-8000-0000d5fe61dd_1_101_.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/decoration-101.png
cp /root/.openclaw/workspace/downloads/19e5615d-0f12-8a33-8000-000019d2af64_2_7_.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/decoration-07.png
cp /root/.openclaw/workspace/downloads/19e5607b-35f2-86a9-8000-0000fe417682_小刘素材_18_.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/decoration-xiao-18.png
cp /root/.openclaw/workspace/downloads/19e56163-1c72-8678-8000-00006abbe769_叶子素材17.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/leaf-17.png
cp /root/.openclaw/workspace/downloads/19e56164-45c2-8c9e-8000-0000e432a9a2_叶子素材08.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/leaf-08.png
cp /root/.openclaw/workspace/downloads/19e56168-15e2-80ed-8000-00009248878d_叶子素材26.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/leaf-26.png
cp /root/.openclaw/workspace/downloads/19e56386-c432-87a5-8000-0000e927abc2_cmicon1.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/logo-cthulhu-skull.png
cp /root/.openclaw/workspace/downloads/19e56386-f0e2-8282-8000-000012b9a51b_cmlogo_1_2.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/logo-hex-gothic.png
cp /root/.openclaw/workspace/downloads/19e55fc5-1582-8fc5-8000-00006fc7dcac_黑白页岩_81_.jpg /root/.openclaw/workspace/coc-platform/apps/web/public/images/texture-shale.jpg
cp /root/.openclaw/workspace/downloads/19e5617b-2002-8215-8000-00000461e95d_kling_20260524_作品_海蓝色调_一座被淹没_117_1.png /root/.openclaw/workspace/coc-platform/apps/web/public/images/bg-sunken-city.png
# 剩余场景素材批量复制
cp /root/.openclaw/workspace/downloads/19e56139-af82-8474-8000-000077367bfa_1_53_.jpg /root/.openclaw/workspace/coc-platform/apps/web/public/images/scene-53.jpg
cp /root/.openclaw/workspace/downloads/19e5613b-b8b2-8dcf-8000-0000bf227f8e_1_54_.jpg /root/.openclaw/workspace/coc-platform/apps/web/public/images/scene-54.jpg
cp /root/.openclaw/workspace/downloads/19e5613f-0f72-87c0-8000-00003c198603_1_65_.jpg /root/.openclaw/workspace/coc-platform/apps/web/public/images/scene-65.jpg
cp /root/.openclaw/workspace/downloads/19e56141-00e2-8f75-8000-0000785125c0_1_72_.jpg /root/.openclaw/workspace/coc-platform/apps/web/public/images/scene-72.jpg
```

### Step 2: 压缩大图
```bash
# card-bg-parchment.jpg 16MB 过大，需要压缩
# 使用 cwebp 或 sharp 压缩为 webp
```

---

## 六、实施顺序

### Phase 1: 素材部署 + 基础组件（1天）
1. 复制 downloads 素材到 public/images/
2. 压缩 `card-bg-parchment.jpg` 等超大图
3. 创建 `CthulhuCard.tsx` 组件（支持 variant 系统）
4. 创建 `CthulhuButton.tsx` 组件（主/危险/幽灵三变体）
5. 创建 `OccultBadge.tsx` 组件（6种徽章）
6. 创建 `GoldOrnament.tsx` 组件（装饰线/四角/分隔）

### Phase 2: Dashboard 首页改造（1天）
1. 用户面板用 `CthulhuCard variant-gold`
2. 四大入口用 `CthulhuCard variant-tentacle`
3. 公告板用 `CthulhuCard variant-parchment`
4. 位阶/印记用 `CthulhuCard variant-gold`
5. 调查员卡片放大 + 统一卡片规格
6. 深渊广场横幅改造

### Phase 3: 各功能页改造（逐个0.5天）
1. 调查员名册
2. 故事书
3. 好友
4. 论坛
5. 背包
6. 溺者之牌
7. 黑水港

### Phase 4: 全局元素（0.5天）
1. 侧边栏 Logo 改为 `logo-cthulhu-skull.png`
2. 顶部Header纹理化
3. 空状态统一插画风格
4. 页面切换动画（motion）

---

## 七、额外建议

### 需要用户补充的素材
1. **更明确的角色场景图标注**：当前 181.jpg/182.jpg 等文件名是数字，如果能按用途重命名（如 `cultist-warrior.jpg`, `scene-library.jpg`）更方便映射
2. **叶子素材用途确认**：叶子/触手状植物素材是用于装饰飘落，还是卡片固定装饰？
3. **小刘素材内容**：需要确认 `小刘素材_18_.png` 内容以确定用途

### 技术注意
- `card-bg-parchment.jpg`（16MB）和 `dark-marble-gold.jpg`（16MB）体积过大，需压缩为 webp
- 所有素材图用 `webp` 格式做一份，代码引用优先 `xxx.webp`，fallback `xxx.png/jpg`
- 素材叠加层统一用 `background-blend-mode: overlay` + `opacity: 0.03~0.08`，避免喧宾夺主

---

*方案版本: V2.1（基于现有素材的卡片质感化改造）*
*撰写时间: 2026-05-24*

# 深渊垂钓系统 (Abyssal Dredging) 技术规格书

> 版本：v1.0 MVP  
> 目标：为沉没之城提供一款轻量级娱乐子系统，供无团可跑的玩家打发时间  
> 状态：待开发

---

## 1. 产品定位

在沉没之城边缘的「黑水港」，玩家可以花费少量时间抛竿垂钓，将收获出售换锈蚀硬币，或收入藏品柜。

### 核心体验
- 抛竿 → 等待（3~8秒随机）→ 咬钩提示 → 收竿 → 揭晓钓物
- 每日 5 次免费机会，适度回收货币
- 配合 CSS/SVG 轻量级动画，营造「腐烂优雅」的仪式感

---

## 2. 数据库设计

### 2.1 新增模型 (Prisma)

```prisma
model FishingConfig {
  id           String   @id @default(uuid())
  // 全局配置只用一条记录，id 可忽略
  dailyLimit   Int      @default(5)
  extraCost    Int      @default(10) // 额外次数花费硬币
  updatedAt    DateTime @updatedAt
}

model FishingItem {
  id            String   @id @default(uuid())
  key           String   @unique
  name          String
  description   String
  rarity        String   // JUNK | COMMON | UNCOMMON | RARE | ELDRITCH
  sellPrice     Int      @default(0)
  sellCurrency  String   @default("coin") // coin | stardust
  isCollection  Boolean  @default(false) // 是否纳入藏品
  collectionCategory String? // 用于图鉴分组
  iconUrl       String?
  weight        Int      @default(100) // 掉落权重
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
}

model UserFishingLog {
  id          String   @id @default(uuid())
  userId      String
  itemKey     String
  itemName    String
  rarity      String
  sellPrice   Int
  sellCurrency String
  isSold      Boolean  @default(false)
  caughtAt    DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, caughtAt])
}

model UserFishingDaily {
  id              String   @id @default(uuid())
  userId          String   @unique
  freeUsed        Int      @default(0)
  extraUsed       Int      @default(0)
  lastRefreshAt   DateTime @default(now())

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 2.2 User 模型扩展

```prisma
model User {
  // ... existing fields ...
  fishingLogs    UserFishingLog[]
  fishingDaily   UserFishingDaily?
}
```

---

## 3. 掉落池设计

| 稀有度 | key 示例 | 名称 | 类型 | sellPrice | weight |
|---|---|---|---|---|---|
| JUNK | `seaweed_boot` | 缠满海藻的旧靴子 | 垃圾 | 1 | 300 |
| JUNK | `expired_ticket` | 过期的船票 | 垃圾 | 1 | 300 |
| JUNK | `rusted_can` | 生锈的罐头 | 垃圾 | 2 | 250 |
| COMMON | `blackwater_eel` | 黑水鳗鱼 | 寻常 | 5 | 200 |
| COMMON | `glow_jellyfish` | 发光水母 | 寻常 | 8 | 150 |
| UNCOMMON | `old_signet_box` | 旧印盒子 | 异物 | 0 (藏品) | 80 |
| UNCOMMON | `rune_slate` | 刻满符文的石板 | 异物 | 15 | 60 |
| RARE | `mini_diving_bell` | 微型潜水钟 | 异物 | 30 | 25 |
| ELDRITCH | `blinking_eye` | 仍在眨动的眼球 | 不可名状 | 50 | 5 |
| ELDRITCH | `tentacle_tip` | 一小截触手 | 不可名状 | 80 | 3 |
| ELDRITCH | `your_reflection` | 你自己的倒影 | 不可名状 | 100 | 2 |

### 收竿时机判定
- 咬钩后给玩家一个时间窗口（1.5秒）点击收竿
- 如果在窗口内点击 → 正常按权重池掉落
- 如果错过窗口 → 80% 概率脱钩（什么都不获得），20% 概率强制掉落 JUNK

---

## 4. 后端 API 设计

### 4.1 钓鱼状态查询
```
GET /api/fishing/status
```
响应：
```json
{
  "success": true,
  "data": {
    "dailyLimit": 5,
    "freeUsed": 2,
    "extraUsed": 1,
    "extraCost": 10,
    "canFish": true
  }
}
```

### 4.2 抛竿
```
POST /api/fishing/cast
```
响应：
```json
{
  "success": true,
  "data": {
    "castId": "uuid",
    "waitTimeMs": 4600,
    "biteWindowMs": 1500,
    "biteAtMs": 4600 // 相对于请求开始的咬钩时间点
  }
}
```

### 4.3 收竿
```
POST /api/fishing/reel
Body: { "castId": "uuid", "timestamp": 1744199999999 }
```
- 后端校验 castId 是否有效、是否在 biteWindow 内 reel
- 生成掉落 → 写入 UserFishingLog
- 如果是藏品且 `isCollection=true`，自动加入 `UserInventory` (category='collection')
- 更新 `UserFishingDaily` 次数
- 响应：
```json
{
  "success": true,
  "data": {
    "result": "caught", // caught | missed | escaped
    "item": {
      "key": "blinking_eye",
      "name": "仍在眨动的眼球",
      "description": "...",
      "rarity": "ELDRITCH",
      "sellPrice": 50,
      "sellCurrency": "coin",
      "isCollection": true,
      "iconUrl": "..."
    },
    "userCoins": 1234,
    "freeUsed": 3,
    "remaining": 2
  }
}
```

### 4.4 出售钓物
```
POST /api/fishing/sell
Body: { "logId": "uuid" }
```
- 将指定 `UserFishingLog` 标记为 `isSold=true`
- 给用户增加对应货币
- 响应更新后的货币数量

### 4.5 图鉴/收集进度
```
GET /api/fishing/collection
```
响应已解锁的 item key 列表 + 全收集进度百分比

---

## 5. 前端页面设计

### 5.1 路由
- `/fishing` — 深渊垂钓主页面
- 在导航栏或深渊广场增加入口

### 5.2 页面结构

```tsx
// pages/fishing/FishingPage.tsx
// 核心状态：'idle' | 'casting' | 'waiting' | 'biting' | 'reeling' | 'result'
```

#### 视觉区域（从上到下）
1. **页头**：「黑水港」标题 + 今日剩余次数徽章
2. **主舞台**：水面动画容器
   - 暗色径向渐变背景（#0a0a10 → #1a1a24）
   - 多层 CSS 波纹扩散动画
   - SVG 钓竿（静态 graphics）
   - SVG 鱼漂（CSS 正弦波浮动）
   - SVG 钓线（Bezier 动态 path，连接竿尖与鱼漂）
3. **操作区**：抛竿/收竿大按钮
   - idle：「抛竿」按钮（coc-btn-primary 样式）
   - waiting：按钮禁用，显示「等待中…」
   - biting：按钮高亮闪烁，显示「收竿！」，限时 1.5s
   - reeling：显示收竿动画，钓物从水下升起
4. **结果弹窗/卡片**：
   - 钓物图标 + 名称 + 稀有度光晕
   - 「收入藏品柜」/「出售换 X 硬币」两个按钮
   - ELDRITCH 级配全屏暗红闪屏 + 低语文字
5. **侧边栏/下方**：
   - 今日日志（最近 3 条钓获）
   - 收集进度条

### 5.3 动画技术规格

| 动画 | 实现 | 参数 |
|---|---|---|
| 水面波纹 | `.water-ripple` 伪元素 ×3 | `scale(0→3)`, `opacity(0.4→0)`, `duration: 4s`, `infinite` |
| 鱼漂浮动 | `.bobber` CSS keyframes | `translateY(±4px)`, `duration: 2.5s`, `ease-in-out`, `infinite` |
| 咬钩预警 | `.bobber.biting` | `scale(1.2)`, `filter: brightness(1.3)`, `translateY` 急促抖动 0.2s |
| 涟漪扩散 | `.ripple-ring` | 额外 3 圈同心圆快速扩散 `scale(0→2)`, `duration: 1s` |
| 钓线牵引 | SVG `path` | `d` 属性通过 React ref 每帧更新（requestAnimationFrame），idle 时下垂曲线，reeling 时绷紧直线 |
| 收竿拉物 | `.catch-reveal` | `translateY(120% → 0)`, `scale(0.8 → 1)`, `duration: 600ms`, `cubic-bezier(0.22, 1, 0.36, 1)` |
| 揭晓卡片 | `.reveal-card` | 3D flip: `rotateY(-90deg → 0deg)`, `duration: 500ms` |
| 失败/脱钩 | `.bobber` | 回弹动画 `translateY(0 → 8px → 0)` 后隐藏 |

### 5.4 颜色与氛围
- 背景：深渊黑 `#0a0a10`，水面层 `#0f1218` → `#1a1e28`
- 鱼漂：暗红色 `#8B3A3A`，咬钩时变为亮红 `#FF4444` 并带 glow
- 钓线：半透灰白色 `rgba(200,200,200,0.3)`
- 稀有度光晕：
  - JUNK: 无
  - COMMON: 淡绿 `#4ade80`
  - UNCOMMON: 淡紫 `#a78bfa`
  - RARE: 金黄 `#fbbf24`
  - ELDRITCH: 血红脉冲 `#ef4444`

---

## 6. 开发规范

### 文件路径约定
- 后端路由：`apps/server/src/modules/fishing/fishing.routes.ts`
- 后端服务：`apps/server/src/modules/fishing/fishing.service.ts`
- 前端页面：`apps/web/src/pages/fishing/FishingPage.tsx`
- 前端组件：
  - `apps/web/src/components/fishing/WaterSurface.tsx`
  - `apps/web/src/components/fishing/FishingRod.tsx`
  - `apps/web/src/components/fishing/Bobber.tsx`
  - `apps/web/src/components/fishing/CatchReveal.tsx`
- 新增样式（若太多可拆）：`apps/web/src/styles/fishing.css`（可选）

### API 响应格式
严格遵循现有项目统一格式：
```typescript
{ success: boolean; data?: T; error?: { code: string; message: string } }
```

### 认证中间件
所有 `/api/fishing/*` 路由使用 `authMiddleware`，从 `req.userId` 获取用户。

### 货币/库存操作
- `prisma.user.update` 修改 `coins` 或 `stardust`
- `prisma.userInventory.create` 写入藏品记录（`itemType='collection'`）
- 注意直接使用 `prisma` 事务或确保操作原子性

---

## 7. 验收标准

- [ ] 页面能正常访问 `/fishing`
- [ ] 抛竿/等待/咬钩/收竿流程能跑通
- [ ] 每日限制生效，次数归零后阻止抛竿
- [ ] 钓物正确写入 UserFishingLog，藏品正确进入 UserInventory
- [ ] 出售功能正确增减货币
- [ ] 图鉴 API 返回正确解锁进度
- [ ] 本地 `npm run build` 前后端均 0 error
- [ ] 部署到生产环境后功能可用

---

## 8. 回滚策略

若出现重大 BUG，使用预先打好的标签回滚：
```bash
git checkout v1.4.6-stable
bash scripts/deploy.sh
```

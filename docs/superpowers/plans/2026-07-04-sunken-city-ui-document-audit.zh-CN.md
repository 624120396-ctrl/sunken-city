# 沉没之城 UI/UX 文档与逻辑审计记录

> **For agentic workers:** Read this before executing Sunken City UI/UX work after 2026-07-04. It records which UI plans are current, which older instructions remain valid only as constraints, and which gaps were closed.

**日期：** 2026-07-04  
**范围：** UI/UX 视觉升级、image2 资产管线、可读性计划、游戏化页面计划、产品原则  
**结论：** 文档体系已从“可读性修复优先”调整为“明亮材质化视觉系统优先，可读性作为底线”。

---

## 1. 审计结论

当前 UI/UX 文档体系应按以下优先级理解：

1. `2026-07-04-sunken-city-luminous-archive-visual-upgrade.zh-CN.md`
   - 当前视觉主计划。
   - 决定“更明亮、更精致、更自然”的方向和页面执行顺序。
2. `2026-07-04-sunken-city-ui-asset-pipeline.zh-CN.md`
   - image2 资产生产和入库规则。
   - 决定素材能否进入真实 UI。
3. `2026-07-01-sunken-city-ui-readability-redesign.zh-CN.md`
   - 可读性、背景档位、响应式和轻量验收基础。
   - 不再单独决定页面迁移优先级。
4. `2026-07-02-harbor-oracle-game-ui-upgrade.zh-CN.md`
   - 黑水港与溺者之牌的交互节奏计划。
   - 视觉材质必须服从 2026-07-04 主计划。
5. `docs/room-system-lifecycle-update-2026-07-03.zh-CN.md`
   - 房间页权限、生命周期、结算边界。
   - 任何房间页 UI 拆分都必须遵守。
6. `PRODUCT.md`
   - 产品级长期原则。
   - 已同步“更明亮的深海秘仪档案馆”和 image2 资产约束。

## 2. 已发现问题与修正

| 问题 | 风险 | 修正 |
| --- | --- | --- |
| 旧可读性计划仍保留早期页面迁移优先级 | 后续执行者会跳过材质资产和新视觉方向，继续迁移旧 Surface | 已改为先执行资产管线和明亮材质化 Surface，再迁移页面 |
| 新视觉计划缺少资产入库标准 | image2 容易生成漂亮但不可用的图 | 新增 `2026-07-04-sunken-city-ui-asset-pipeline.zh-CN.md` |
| image2 与 UI 规格缺少绑定 | 生成素材可能尺寸、对比、用途不匹配 | 新增资产规格卡、prompt 模板、淘汰条件、CSS token 绑定 |
| 黑水港 / 溺者之牌计划仍偏烟熏玻璃表达 | 页面可能继续偏黑、偏概念化 | 已加入 2026-07-04 视觉方向更新 |
| 英文 companion 仍像当前主计划 | 非中文协作者可能误读旧顺序 | 已加入新主计划和资产管线引用 |
| PRODUCT.md 未体现新方向 | 产品级原则与新视觉基准不一致 | 已更新品牌人格、反参考、设计原则 |
| 缺少文档优先级说明 | 多份计划之间可能冲突 | 新视觉计划和本审计记录均加入文档地图 |

## 3. 当前系统逻辑

### 3.1 设计逻辑

沉没之城 UI 不再以“暗黑 + 透明黑卡 + 发光边框”为默认高级感。

新的高级感来自：

- 明亮档案纸主内容。
- 浅色湿石和矿物面板。
- 氧化铜与旧金属边框。
- 深色但非纯黑的工具区。
- 低对比、可读、可复用的纹理。
- 清楚的信息架构和交互状态。

### 3.2 资产逻辑

image2 只生产材料，不决定页面。

资产必须经过：

1. 规格卡。
2. 候选生成。
3. 筛选。
4. 处理和压缩。
5. 固定命名。
6. CSS token 登记。
7. 真实组件轻量验收。

没有规格卡的图片不能入库。没有 token 的图片不能被页面直接引用。

### 3.3 组件逻辑

`Surface` 应逐步从“透明度层级”升级为“层级 + 材质 + 语义”：

- `variant`：层级和用途，例如 `panel / solid / elevated / danger`。
- `material`：视觉材质，例如 `archive / limestone / basalt / copper / relic`。
- `tone`：语义强调，例如 `neutral / gold / blood / ocean / madness`。

这样可以避免把所有视觉变化塞进 `className` 或临时 CSS。

### 3.4 页面逻辑

执行顺序：

1. 资产管线。
2. 材质化设计系统。
3. 视觉样板页。
4. 长期留存页面。
5. 房间页分层重构。
6. 旧 CSS 清理。

房间页不先大拆，因为它同时承载 Socket、骰点、战斗、私聊、生命周期和结算。重构必须围绕 `myRole`、`myCapabilities`、`myBinding`、`lifecycle`，不能回到 `isCreator` 猜权限。

## 4. 仍需后续补齐的内容

这些不是当前文档任务必须实现的代码，但后续执行时应补齐：

1. `Surface` 的 `material` API 实现计划。
2. `ui-textures` 真实文件入库后的尺寸和体积清单。
3. 一个轻量 `UiMaterialPreviewPage` 或等效样板页。
4. 禁止新主内容继续使用 `bg-black/*` 的 UI 合约检查。
5. 首页或故事书作为首个真实落地样板。
6. 房间页拆分前的纯视觉区块标记。

## 5. 执行禁区

后续 UI/UX 执行仍不得触碰：

- 后台 / admin。
- 房间后端业务逻辑。
- Socket 事件名。
- 骰点规则。
- 战斗规则。
- 私聊数据流。
- 生命周期写回。
- 结团后的角色成长机制。
- `outputs/` 提交。
- 未经用户要求的生产部署。

## 6. 轻量验收口径

除非用户主动要求，不进行任何类型的深度测试。

允许的轻量验证：

- 文档一致性搜索。
- `git status --short --branch`。
- 目标页面截图。
- 375px、1440px、2560x1080 关键视口。
- 必要时 `npm run typecheck` 或 `npm run build`。

不默认执行：

- 全站 E2E。
- 深度 Playwright。
- 全量视觉回归。
- 生产冒烟。
- 部署。

## 7. 后续第一步建议

下一步如果进入实现，应先做：

1. 为明亮档案纸、浅色湿石、氧化铜、深海冷雾、暗釉石材写资产规格卡。
2. 使用 Codex 官方内置 image2 生成候选。
3. 筛选并压缩 3-5 张纹理。
4. 建立 `apps/web/public/ui-textures/` 和 CSS texture token。
5. 扩展 `Surface` 的 `material` 维度。
6. 在首页或故事书做一个真实样板，而不是先碰房间页。

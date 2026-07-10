# 地图/场景研究

## 结论摘要

《沉没之城》不应第一阶段复制 Foundry 的完整 Canvas、动态光照和墙体视线。更适合先采用 Owlbear 式轻量地图：场景背景、动态背景、Token 摆放、公开点位、KP 私密点位、简单雾区和场景预设。

本任务只研究地图/场景对象结构和交互，不重开 Task 2 已建立的规则 manifest / registry 边界。规则包可以在未来解释地图点位引用的线索、NPC、场景或规则对象，但地图层本身不承载规则系统生命周期，也不替换当前房间调查 UI。

## 上游事实与采用边界

| 对象 | 本地版本 | 可验证事实 | 本报告如何使用 |
| --- | --- | --- | --- |
| PlanarAlly | `8249e9a` | 开源 MIT；有完整 Location/Floor/Layer/Shape/Asset/Access/socket 同步模型；视野与光照在专门复杂模块中处理 | 用于理解重型 VTT 地图对象的层级、权限和同步关系，不复制源码，不采用其完整墙体/光照/碰撞复杂度 |
| Owlbear dynamic-fog | `55e22b7` | 开源 GPL-3.0；是 Owlbear Rodeo 扩展，使用 SDK scene items、metadata、tool mode、context menu 和 local overlay 生成动态雾效果 | 只转述扩展模式和轻量交互取舍；不复制 GPL 代码；不声称 Owlbear core 内部已被验证 |

## PlanarAlly 可验证结构

PlanarAlly 是更完整的 VTT 地图引擎。它的结构显示，地图不是单个图片字段，而是房间内的位置、楼层、图层、形状、资产、访问权和 socket 同步共同组成的对象网络。

### Location / Floor / Layer / Shape

- `Location` 属于 `Room`，保存 `name`、`index`、`archived` 和可选位置设置；一个 Location 有多个 `Floor`、markers、players 和 user options。
- `Floor` 属于 `Location`，保存 `name`、`index`、`player_visible`、`type_` 和 `background_color`；一个 Floor 有多个 `Layer`。
- `Layer` 属于 `Floor`，保存 `name`、`type_`、`player_visible`、`player_editable`、`selectable`、`index`；一个 Layer 有多个 `Shape`。
- `Shape` 属于 `Layer`，保存坐标 `x/y`、名称、类型、颜色、遮挡、移动阻挡、排序、默认编辑/视野/移动访问、隐形、锁定、门、传送区、角色绑定、网格尺寸等字段；具体几何或资产由 subtype 扩展。

这说明重型 VTT 的核心代价不在“能把图片放进地图”，而在一套持续同步、可授权、可绘制、可计算的图层对象模型。《沉没之城》第一阶段只需要其中很小一部分：背景、覆盖层、点位、Token、KP 备注、玩家可见性和可选手动雾区。

### 资产、Token 与点位

PlanarAlly 的资产形状以 `AssetRect` 绑定 `Asset`，再把资产 hash、asset id、宽高转为 API shape。Shape 本身还可绑定 character、notes、custom data、trackers 和 auras。对《沉没之城》有价值的不是这些全部系统，而是两条关系：

- 背景图、Token 图、点位图标都可以统一作为资产引用，不把图片路径散落在房间组件中。
- 地图对象应只保存引用，例如 `assetId`、`clueId`、`npcId`、`investigationSceneId`，不要把线索文本、NPC 档案和调查记录复制进地图层。

### 可见性、访问权与同步

PlanarAlly 的服务端 transform 会按角色裁剪数据：非 DM 只收到玩家可见 layer；shape transform 会根据编辑权隐藏不可见 tracker/aura、隐藏未公开名称，并只给有权限者完整 variants。访问权由 shape 默认访问和 `ShapeOwner` 的 edit / vision / movement 三种权限共同决定；服务端 `has_ownership` 对非 DM 还会检查所在 layer 是否可编辑。

它的 socket 同步也说明了复杂度边界：客户端连接后发起 `Location.Load`，服务端按顺序发送房间信息、玩家信息、Location、Location settings、Board locations、Floor、markers、assets 等；shape 新增、移动、删除再通过专门事件同步，并在服务端进行权限校验。

《沉没之城》第一阶段不需要复刻这些权限维度。建议只保留三档可见性：

- `keeper`：仅 KP 可见，用于私密点位、备注、预埋危险。
- `players`：当前房间玩家可见，用于已揭示线索点、公开 NPC、玩家 Token。
- `public`：非房间访客也可预览的公开场景摘要或展示图，默认谨慎使用。

坐标语义保持简单：`x/y` 表示场景画布内的归一化位置或像素位置，按 `coordinateMode` 在运行时解释；对象的 `width/height` 只控制显示尺寸，不参与碰撞、测距或视线。第一阶段不要引入完整网格单位、墙体几何、移动路线或法术模板。

### 为什么不直接采用 PlanarAlly 式完整地图

PlanarAlly 的 `ARCHITECTURE.md` 明确把 layer drawing、shape logic、visibility triangulation、vision / lighting 计算列为核心复杂区域。它适合战术地图和通用 VTT，但《沉没之城》的第一阶段目标是 COC 调查房间里的轻量视觉辅助：帮助 KP 呈现场景、揭示线索点、摆放 Token，而不是运行一套战棋级地图引擎。

## Owlbear dynamic-fog 可验证结构

Owlbear dynamic-fog 是一个扩展，不是 Owlbear core 源码。本报告只能验证这个扩展如何使用 Owlbear SDK，不能把它推导为 Owlbear core 内部实现。

### background 与 menu 入口

扩展 manifest 只声明 `background_url`，背景入口初始化 CanvasKit、等待 `OBR.onReady()`，注册 light context menu、line mode、door mode、reconciler 和 overlay。menu 入口是单独的 React/MUI 页面，通过 context menu embed 打开灯光设置面板。

这个拆分对《沉没之城》的启发是：轻量地图工具可以把“主场景层”和“对象设置面板”拆开。第一阶段不需要把所有地图编辑功能塞进房间主界面；KP 可以通过小型场景编辑面板维护背景、点位、Token、雾区和备注。

### SDK scene items / metadata

dynamic-fog 不改 Owlbear core，而是在选中的 image / circle shape 上写入扩展 metadata，例如 light config；门也存成 fog drawing item 的 metadata。随后 reconciler 监听 shared scene item 变化，生成 local scene children，例如 wall、light、overlay billboard。

这对《沉没之城》的关键启发是：地图对象的业务字段应尽量薄，额外行为可放进受控 `payload`，但第一阶段只做展示和手动可见性，不做自动视线或灯光推导。

### 工具模式、覆盖层与 reconciliation

dynamic-fog 注册两个与 fog 工具绑定的模式：

- line mode：读取 Owlbear fog 颜色和线宽，在 FOG layer 创建线段。
- door mode：只在 Owlbear 原生 fog 工具激活时显示；在 fog drawing 边缘拖拽生成 door metadata；点击可开关门，双击或 Alt 可删除门。

reconciler 是单向绑定：监听 shared items，交给 reactors 生成或更新 local children，并用 patcher 批量提交 local scene add/update/delete。overlay 只在 fog tool 激活时注册灯光/门叠加显示，退出 fog tool 后移除。

这说明“手动雾区”比“动态视线”更适合第一阶段：手动雾区只需要 KP 画一块遮罩、调整可见性、揭示或隐藏；动态视线则需要把 fog shapes 转墙、门状态、光源、角色视点、局部 overlay 和实时 reconciliation 组合起来，明显超出当前轻量调查地图范围。

## 建议的场景分层

| 层 | 作用 | 第一阶段是否实现 |
| --- | --- | --- |
| background | 静态地图、动态地图、3D 实景图 | 是 |
| overlay | 氛围遮罩、雨雪雾、旧照片滤镜 | 是 |
| markers | 线索点、NPC 点、地点点、危险点 | 是 |
| tokens | 角色、NPC、怪物、目标物 | 是 |
| keeperNotes | KP 私密点位和备注 | 是 |
| fog | 手动遮盖/揭示区域 | 可选轻量实现 |
| walls | 影响视线和移动的墙体 | 后置 |
| lights | 动态光照 | 后置 |
| measurements | 距离、模板、法术范围 | 后置 |

### 分层解释

- `background` 是视觉底图，支持静态图片、视频、动图或未来 3D 实景截图。动态地图第一阶段只是视觉背景资产，不参与碰撞、视线、灯光或自动化。
- `overlay` 是氛围叠加，不是可交互对象。雨、雪、雾、旧照片滤镜、污染水纹等都应放在这里，避免和线索点混在一起。
- `markers` 是调查对象入口。每个点位可以引用线索、NPC、地点、危险、场景片段，但点击后应打开现有调查 UI 或轻量详情，不替代调查日志、线索板、NPC 档案。
- `tokens` 是角色或目标物摆放，不代表战棋单位。Token 可以显示当前位置、阵营或状态，但第一阶段不计算移动、朝向、碰撞或距离。
- `keeperNotes` 是 KP 私密层，只有 KP 可见；可绑定私密提示、机关答案、伏笔或后续揭示条件。
- `fog` 是手动遮罩，建议只做矩形/多边形/自由形状的遮盖与揭示，不做角色视线自动切割。

## 建议的 SceneAssetPreset

```typescript
export interface SceneAssetPreset {
  id: string;
  title: string;
  sourcePackId?: string;
  ruleSystemId?: string;
  backgroundAssetId: string;
  ambienceAssetId?: string;
  overlayAssetIds: string[];
  defaultObjects: SceneObjectDraft[];
  publicSummary: string;
  keeperNotes: string;
  tags: string[];
}

export interface SceneObjectDraft {
  type: 'marker' | 'token' | 'note' | 'fog';
  assetId?: string;
  title: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  visibility: 'keeper' | 'players' | 'public';
  payload: Record<string, unknown>;
}
```

### 字段语义

- `sourcePackId`：来自素材包或剧本包时填写；手工创建场景可为空。
- `ruleSystemId`：只声明该预设面向哪个规则系统解释，例如 `coc7`；不让地图预设直接注册规则。
- `backgroundAssetId`：主视觉资产，第一阶段必须存在。
- `ambienceAssetId`：可选音频或环境视频引用；不影响地图对象计算。
- `overlayAssetIds`：多个视觉覆盖资产，用于氛围表现。
- `defaultObjects`：预设自带的点位、Token、KP note 和 fog，不等于运行时对象最终状态。
- `payload`：保存引用和轻量参数，例如 `{ clueId, npcId, investigationSceneId, dangerLevel, revealState }`；不得把完整线索正文、NPC 档案或规则文本复制进来。

运行时如果需要持久化对象，可以把 `SceneObjectDraft` 扩展为带 `id`、`sceneId`、`createdBy`、`updatedAt` 的 `SceneObject`，但这是实现阶段的数据模型问题，不改变上面接口作为预设导入草案的形状。

## 《沉没之城》映射

- `RoomScene` 继续表示房间内的叙事场景。
- 新增的地图能力应作为 `RoomScene` 的可选视觉层，不替代现有调查日志、线索板、NPC 档案。
- 动态地图视频第一阶段作为背景资产使用，不参与碰撞、视线和自动化。
- 地图点位与 `InvestigationClue`、`InvestigationNpc`、`InvestigationScene` 通过引用绑定。

建议产品形态是“COC 调查场景板”，不是“Foundry clone”：

1. KP 为房间选择或创建一个 `SceneAssetPreset`。
2. 场景加载背景和 overlay。
3. KP 摆放 markers、tokens、keeper notes。
4. 玩家只看到 `players` / `public` 可见对象。
5. KP 可以把某个 keeper marker 改为 players 可见，或把某块 fog 手动揭示。
6. 点位点击进入现有调查对象，而不是在地图层重建线索系统。

## 坐标与可见性语义

第一阶段建议采用“画布相对坐标”，避免提前绑定战棋网格：

- `x/y` 可解释为 0 到 1 的归一化坐标，或按当前背景自然尺寸解释为像素；实现时二选一并写入 scene metadata。
- `width/height` 是对象显示尺寸；marker 默认可只使用图标尺寸，fog 才需要区域尺寸。
- 坐标随背景缩放等比换算，不因窗口尺寸变化而改写原始数据。
- Token 和 marker 的层级顺序由 `type` 和可选 `zIndex` 决定；第一阶段不需要 PlanarAlly 式 per-layer shape order 全量同步。
- `visibility` 决定谁能看到对象，不决定谁能编辑对象。编辑权仍由房间 KP 能力控制。

这样可以让用户理解“点位在地图上的位置”而不是“棋子在战斗网格中的格子”。后续如果加入测距或碰撞，再单独引入 grid / units / walls。

## 手动雾区为什么可行

手动雾区只需要保存一组 `SceneObjectDraft`：

- `type: 'fog'`
- `x/y/width/height` 或 `payload.points`
- `visibility: 'keeper'`
- `payload.mode: 'cover' | 'reveal'`

KP 可以把它当成视觉遮罩：放上去、拖动、调整大小、删除或切换揭示状态。它不需要知道角色在哪里，不需要计算墙体，不需要光源衰减，也不需要实时重建多边形可见区域。

dynamic-fog 证明了墙、门、灯可以由 fog drawing 和 metadata 派生，但它同时也证明了这是一套更复杂的 reconciliation：要监听 shared scene item、生成 local walls/lights/overlays、处理 door metadata 和 fog tool 激活状态。《沉没之城》第一阶段只取“手动遮盖/揭示”这个低复杂度交互，不取动态 vision pipeline。

## 第一阶段不采用

- 自动视线遮挡。
- 角色移动碰撞。
- 动态光源计算。
- 战棋距离规则。
- 3D 地图编辑器。

## 后置能力

后续如果用户明确需要更战术化的地图，可以分阶段增加：

- `walls`：先作为可编辑线段数据保存，再考虑视线和移动阻挡。
- `lights`：先作为视觉装饰和 marker，再考虑角色视野、光源半径、衰减、锥形光。
- `measurements`：先做直尺工具，再考虑规则系统里的距离单位和法术模板。
- `grid`：先做可选参考线，再考虑 token snapping。
- `dynamicVision`：只有当 walls、lights、token vision source、reconciliation 和性能预算都明确后再进入。

这些能力应作为地图模块的后续扩展，不应挤进第一阶段 SceneAssetPreset。

## 开放决策

- 坐标存储采用归一化坐标还是背景像素坐标：建议实现前由前端交互成本决定。
- fog 第一阶段是否进入 MVP：建议作为可选轻量实现；没有它也不影响背景、点位、Token 和 KP 备注主流程。
- markers 的公开状态是房间级还是玩家级：第一阶段建议房间级，玩家级揭示会显著增加权限复杂度。
- `public` 可见性是否真的开放给房间外访客：建议默认只在资源预览和模板市场里使用，房间运行时以 KP/players 为主。

## 证据索引

| 证据 | 路径 | 行号 / 符号 | 说明 |
| --- | --- | --- | --- |
| PlanarAlly socket 架构 | `.codex-run/vtt-research/planarally/ARCHITECTURE.md` | `5-13`, `51-55` | 会话使用 socket.io；game 与 asset store 分 namespace；client API 区分收到事件和发出事件 |
| PlanarAlly layer / shape / visibility 复杂度 | `.codex-run/vtt-research/planarally/ARCHITECTURE.md` | `57-62`, `68-72`, `84-91` | layers 绘制、shape 逻辑、visibility triangulation 是独立复杂区域 |
| Location 模型 | `.codex-run/vtt-research/planarally/server/src/db/models/location.py` | `19-35`, `43-48` | Location 属于 Room，关联 floors/markers/players，输出 ApiLocation |
| Floor 模型 | `.codex-run/vtt-research/planarally/server/src/db/models/floor.py` | `13-23` | Floor 属于 Location，含 player_visible、type、background_color |
| Layer 模型 | `.codex-run/vtt-research/planarally/server/src/db/models/layer.py` | `13-24`, `32-33` | Layer 属于 Floor，含 player_visible、player_editable、selectable、index |
| Shape 核心字段 | `.codex-run/vtt-research/planarally/server/src/db/models/shape.py` | `32-93`, `104-123` | Shape 保存坐标、类型、访问默认值、遮挡、门、角色绑定、subtype |
| Shape owner 权限 | `.codex-run/vtt-research/planarally/server/src/db/models/shape_owner.py` | `13-30` | shape owner 保存 edit / movement / vision 三种权限 |
| AssetRect 资产绑定 | `.codex-run/vtt-research/planarally/server/src/db/models/asset_rect.py` | `16-33` | asset shape 绑定 Asset 并输出 assetHash、assetId、width、height |
| Location load 顺序 | `.codex-run/vtt-research/planarally/server/src/api/socket/location.py` | `42-48`, `91-96`, `142-195`, `207-228` | Location.Load 清场后发送 location、settings、board locations、floors、markers、assets |
| Location 切换和权限 | `.codex-run/vtt-research/planarally/server/src/api/socket/location.py` | `231-277`, `280-312` | DM 才能切换 location 或设置 location options |
| Floor transform | `.codex-run/vtt-research/planarally/server/src/transform/to_api/floor.py` | `9-22` | 非 DM 只取 player_visible layers |
| Layer transform | `.codex-run/vtt-research/planarally/server/src/transform/to_api/layer.py` | `9-27` | layer 输出 groups 和按 index 排序的 shapes |
| Shape transform | `.codex-run/vtt-research/planarally/server/src/transform/to_api/shape.py` | `10-37`, `39-81` | 按 edit access 裁剪 name、trackers、auras、variants、notes |
| 服务端 ownership | `.codex-run/vtt-research/planarally/server/src/models/access.py` | `8-31` | DM 总是有权；非 DM 受 layer player_editable、默认权限和 ShapeOwner 限制 |
| 客户端 layer 名称 | `.codex-run/vtt-research/planarally/client/src/game/models/floor.ts` | `14-22` | map/grid/tokens/dm/fow/fow-players/draw 等层名 |
| 客户端 floor/layer 加载 | `.codex-run/vtt-research/planarally/client/src/game/floor/server.ts` | `18-45`, `47-90` | server floor 转 client floor，按 layer 名称构造不同 Layer 类并加载 shapes |
| 客户端 shape 状态 | `.codex-run/vtt-research/planarally/client/src/game/shapes/shape.ts` | `45-70`, `101-122`, `167-174` | Shape 持有 floor/layer/refPoint/points，并与 vision recalculation 相关 |
| 客户端 layer 状态 | `.codex-run/vtt-research/planarally/client/src/game/layers/variants/layer.ts` | `52-69`, `92-99`, `149-151`, `168-180` | Layer 持有 canvas、floor、shape 集合、sector 索引并驱动 vision source 更新 |
| 客户端 socket boot | `.codex-run/vtt-research/planarally/client/src/game/api/events.ts` | `62-118`, `130-138` | connect 后 Location.Load；Board.Floor.Set 后 addServerFloor |
| shape 同步 emit | `.codex-run/vtt-research/planarally/client/src/game/api/emits/shape/core.ts` | `24-49`, `84-101` | shape add/remove/order/layer/floor/location/move/size 通过 socket 事件发送 |
| shape 服务端同步 | `.codex-run/vtt-research/planarally/server/src/api/socket/shape/__init__.py` | `68-129`, `131-169`, `183-220` | add/move/remove shape 均走服务端校验并广播 |
| Owlbear extension manifest | `.codex-run/vtt-research/owlbear-dynamic-fog/public/manifest.json` | `1-9` | dynamic-fog 是扩展 manifest，入口是 background.html |
| Owlbear background init | `.codex-run/vtt-research/owlbear-dynamic-fog/src/background/main.ts` | `1-13`, `22-37` | 初始化 SDK、CanvasKit、menu、tool modes、reconciler、reactors 和 overlay |
| Light context menu | `.codex-run/vtt-research/owlbear-dynamic-fog/src/background/createLightMenu.ts` | `7-55`, `58-80` | 用 contextMenu 给 image/circle 写 light metadata，并通过 menu.html 打开设置面板 |
| Line tool mode | `.codex-run/vtt-research/owlbear-dynamic-fog/src/background/createLineMode.ts` | `15-25`, `32-84` | 读取 fog 颜色/线宽，在 FOG layer 创建线段 |
| Door tool mode | `.codex-run/vtt-research/owlbear-dynamic-fog/src/background/createDoorMode.ts` | `32-48`, `155-227`, `249-359` | 在 fog drawing 上找交点，door 状态存 metadata，点击/拖拽/双击处理门 |
| Owlbear drawing type | `.codex-run/vtt-research/owlbear-dynamic-fog/src/types/Drawing.ts` | `1-17` | dynamic-fog 把 Shape/Path/Curve/Line 归为 Drawing |
| Owlbear door type | `.codex-run/vtt-research/owlbear-dynamic-fog/src/types/Door.ts` | `1-7` | Door metadata 保存 open、start、end |
| Owlbear light config | `.codex-run/vtt-research/owlbear-dynamic-fog/src/types/LightConfig.ts` | `1-11` | Light metadata 保存半径、衰减、角度、类型和旋转 |
| Reconciler 单向绑定 | `.codex-run/vtt-research/owlbear-dynamic-fog/src/background/reconcile/Reconciler.ts` | `6-19`, `32-39`, `64-79`, `81-115` | 监听 shared scene items，驱动 reactors 产生 local children |
| Patcher local scene | `.codex-run/vtt-research/owlbear-dynamic-fog/src/background/reconcile/Patcher.ts` | `18-30`, `46-77` | 批量向 OBR local scene add/delete/update |
| Wall reactor / actor | `.codex-run/vtt-research/owlbear-dynamic-fog/src/background/reconcile/reactors/WallReactor.ts` | `8-28` | 只处理 FOG layer drawing，door 变化也触发 wall 更新 |
| Wall actor | `.codex-run/vtt-research/owlbear-dynamic-fog/src/background/reconcile/actors/WallActor.ts` | `8-23`, `69-93` | fog drawing 转 SDK wall，并 attached 到原 drawing |
| Overlay gating | `.codex-run/vtt-research/owlbear-dynamic-fog/src/background/overlay.ts` | `6-16`, `18-33` | 只有 Owlbear fog tool 激活时显示 light/door overlay |
| Menu entry | `.codex-run/vtt-research/owlbear-dynamic-fog/src/menu/main.tsx` | `1-18` | Light settings 是独立 React menu 页面 |

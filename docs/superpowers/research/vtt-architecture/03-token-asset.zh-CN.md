# Token/资产研究

## 结论摘要

Token 应分成两个概念：`TokenAsset` 是可复用素材，`SceneTokenInstance` 是某个场景中的一次摆放。NPC、角色、怪物不应直接等同于 Token；它们可以绑定一个或多个 TokenAsset。

本任务延续 Task 2 的 `RuleRegistry` 边界和 Task 3 的轻量场景分层：Token/资产层只负责“谁用什么视觉形象、在什么场景哪里出现、对谁可见”。它不在第一阶段承担 HP、战斗轮、碰撞、视线、占格、动画状态机或规则判定。对《沉没之城》来说，Token 首先是 COC 调查场景里的 NPC、调查员、怪物影子、物件、标记与氛围素材，而不是 DND 战棋单位。

需要明确区分三层对象：

- `TokenAsset`：素材库/素材包里的可复用媒体目录项，例如“黑水港巡警立绘”“调查员半身像”“深潜者剪影动态 token”“血迹标记”。
- `SceneTokenInstance`：某个 `RoomScene` 或未来场景板上的一次摆放，保存坐标、尺寸、旋转、可见性、展示阵营和视觉标签。
- 绑定领域实体：`character`、`investigationNpc`、`roomNpc` 或 `custom`。实体是业务对象，Token 只是其视觉表现之一。

## 上游事实与采用边界

| 对象 | 本地版本 | 可验证事实 | 本报告如何使用 |
| --- | --- | --- | --- |
| Foundry DND5E | `42f5b20` | DND5E open system 把 TokenDocument、Token canvas object、Token layer、Token HUD、Actor trackable attributes、状态、HP、移动、视野同步和动态 ring 接入 Foundry 核心注册点 | 作为“重型规则化 Token”的反例和边界证据：可参考其分层，但第一阶段不采用其战术自动化 |
| AboveVTT | `4957c0d` | AGPL-3.0；Token 以 options 保存场景内实例，场景数据保存 tokens 字典，外部 DDB/monster/open5e/自定义 token 会转换成可摆放对象，并有 built-in token 目录和 alternative images | 只做架构模式转述：素材目录、实例摆放、外部内容转 token；不复制源码，不复用 AGPL 实现 |

Foundry core 概念包括 `CONFIG.Token`、`TokenDocument`、Canvas `Token`、TokenLayer、HUD、Actor、Scene 等平台对象。本报告只能从 DND5E 仓库验证 DND5E system 如何使用这些入口，不能把 Foundry core 内部行为说成已由 DND5E 源码完全证明。

AboveVTT 的证据只用于观察集成模式：它把浏览器扩展里的 DDB/monster/character 数据转换成 token options，并持久化到 scene tokens。由于 AboveVTT 是 AGPL-3.0，本项目不得复制其代码、字段实现或 UI 逻辑；可以独立设计相同问题空间下的“素材目录 + 场景实例 + 业务实体绑定”模型。

## DND5E Token 关系

DND5E 的 Token 路径展示了一个重型 VTT 如何把视觉 token 接入规则系统：

- `dnd5e.mjs` 在 init 阶段把 `CONFIG.Token.documentClass` 指向 `TokenDocument5e`，把 `CONFIG.Token.objectClass` 指向 `Token5e`，把 tokens layer 指向 `TokenLayer5e`，并注册 Token HUD 与 Token config。
- `TokenDocument5e` 从 Actor senses 派生 sight / detection modes，并在相关 Actor 数据更新后重置 token vision source。
- DND5E 明确把 `attributes.hp`、资源、技能被动、senses、movement 等挂入 Actor trackable attributes，Token config 再把这些属性暴露给 token resource/bar 选择。
- `Token5e` 覆盖 HP bar 绘制，从 Actor HP 读取当前值、临时 HP、临时上限和有效上限；动态 ring 会根据 defeated / invisible / combatant 等状态改变视觉效果。
- `TokenLayer5e` 按 Actor 是否 creature、token disposition、status、尺寸和 secret/hidden 状态判断移动阻挡或困难地形。
- DND5E settings 中 `movementAutomation`、`senseVisionSync`、`bloodied` 等开关显示这些能力是系统级自动化，不是单纯 token 图片显示。

这些事实说明：如果把 Token 和规则实体过早合并，后续很容易滑向完整战斗引擎。对《沉没之城》第一阶段，更合适的是反向拆开：Token 可以引用角色或 NPC，但不因此自动继承 HP、AC、移动速度、视野半径、占格、阵营规则或战斗轮状态。

## AboveVTT Token 关系

AboveVTT 的模式更接近“浏览器内素材目录 + 场景实例”：

- `Token` 类构造时持有 `options`；`options` 同时包含媒体、位置、尺寸、隐藏状态、条件、HP/AC、monster id、stat block 等多种字段。
- `SceneHandler` 切换场景时把 scene 设为 `CURRENT_SCENE_DATA`，清理当前 `TOKEN_OBJECTS`，再按 scene tokens 重建场景内实例；场景对象本身保存 `dm_map`、`player_map`、video flag、grid 参数和 `tokens`。
- `place_token_at_map_point` 会把 token-like object、全局 token settings、PC 数据和素材选项合并成一次摆放，并写入位置、尺寸和 hidden 默认值。
- token 变动走 `place_sync_persist` / `sync`，通过 message broker 发送 token options；scene migration 会把数组 tokens 转成按 id 索引的 tokens object。
- token catalog 侧有 built-in tokens、my tokens、DDB token、monster/open5e 转换和 alternative images；同一个目录项可以有多张候选图，摆放时选择其中一张作为当前 `imgsrc`。
- monster/open5e 路径会把外部 stat block、HP、AC、size、senses、movement 等转换进 token options。这个集成模式证明“内容库可导入 token”，但也说明完整规则数据会迅速污染 token 实例。

《沉没之城》只采用其中两点：素材目录可复用，摆放实例独立保存位置。其余 HP/AC/senses/movement/combat 绑定不进入第一阶段。

## 建议的 TokenAsset

```typescript
export interface TokenAsset {
  id: string;
  title: string;
  sourcePackId?: string;
  assetId: string;
  tokenType: 'character' | 'npc' | 'monster' | 'object' | 'vehicle' | 'marker';
  animationType: 'static' | 'animated' | 'sequence';
  defaultDisposition: 'friendly' | 'neutral' | 'hostile' | 'secret';
  tags: string[];
}
```

### 字段语义

- `id`：TokenAsset 自身 id，不等于底层媒体资产 id，也不等于 NPC/角色 id。
- `title`：素材库展示名，例如“阿德勒医生 - 雨夜立绘”。
- `sourcePackId`：来自 FVTT/Roll20/本地素材包或剧本包时填写；手工上传素材可为空。
- `assetId`：指向统一资产库的媒体对象。媒体对象负责 URL、hash、mime、尺寸、版权/来源备注；TokenAsset 负责它作为 token 的分类语义。
- `tokenType`：素材适用类型，不代表绑定实体类型。例如 `npc` 素材也可临时摆给 `custom` 实体。
- `animationType`：声明静态图、动态图或序列帧。第一阶段只影响播放器/预览方式，不驱动状态机。
- `defaultDisposition`：新建场景实例时的展示默认值。它是视觉/权限提示，不是规则权威。
- `tags`：素材检索标签，例如 `港口`、`巡警`、`深海污染`、`剪影`、`动态`。

## 建议的 SceneTokenInstance

```typescript
export interface SceneTokenInstance {
  id: string;
  sceneId: string;
  tokenAssetId: string;
  boundEntity?: {
    type: 'character' | 'investigationNpc' | 'roomNpc' | 'custom';
    id: string;
  };
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visibility: 'keeper' | 'players' | 'public';
  disposition: 'friendly' | 'neutral' | 'hostile' | 'secret';
  statusTags: string[];
}
```

### 字段语义

- `sceneId`：绑定到具体场景，不绑定到房间全局。相同素材可在多个场景重复摆放。
- `tokenAssetId`：引用素材目录对象；如果素材替换，实例可保留，也可由 KP 手动切换。
- `boundEntity`：可选业务实体绑定。没有绑定时也可以作为纯视觉物件、遮罩、标记或临时 NPC。
- `x/y/width/height`：沿用 Task 3 的轻量画布坐标语义；只控制显示，不参与测距、碰撞或占格。
- `rotation`：视觉旋转角度，不表示战术朝向。
- `visibility`：运行时数据下发和前端展示的保守可见性语义。
- `disposition`：展示/筛选/默认权限提示，例如 friendly/hostile/secret 的颜色或图标，不自动改变骰点权限、NPC 控制权或规则行为。
- `statusTags`：视觉标签和筛选条件，例如 `revealed`、`injured`、`suspect`、`masked`、`dead`。第一阶段不写回角色卡状态，不触发 HP、理智、伤害或战斗规则。

## 绑定规则

- 一个 NPC 可以绑定头像、立绘、静态 Token、动态 Token、死亡/隐藏/敌对状态图。
- 一个 TokenAsset 可以被多个场景实例复用。
- 动态 Token 第一阶段只作为视觉资产，不驱动战斗和规则计算。
- `statusTags` 第一阶段只影响视觉标签和筛选，不自动修改角色卡属性。
- 一个角色或 NPC 可以有 `portrait`、`standee`、`staticToken`、`animatedToken`、`stateVariants` 等多种视觉槽位；这些槽位引用 TokenAsset 或通用 Asset，不把实体自身变成 Token。
- 一个 SceneTokenInstance 最多绑定一个领域实体；如果要表现“同一个 NPC 的多个幻影/分身/剪影”，应创建多个实例并绑定同一个实体，而不是复制 NPC 档案。
- 一个 TokenAsset 可以被多个 SceneTokenInstance 复用；实例层保存坐标、尺寸、旋转、可见性、statusTags，素材层保存媒体和默认分类。
- 删除 SceneTokenInstance 不删除 TokenAsset，也不删除绑定实体。
- 替换 TokenAsset 的底层媒体不应自动改写已归档的调查记录；运行中场景可由 KP 显式刷新或重新选择素材。

## 可见性与权限语义

第一阶段只采用保守三档可见性：

- `keeper`：仅 KP/守秘人视图可见。适用于未揭示 NPC、幕后怪物、陷阱标记、KP 备注物件。
- `players`：当前房间玩家可见。适用于已登场 NPC、调查员 token、已公开物件和线索标记。
- `public`：可用于房间外预览、模板市场或公开展示页。运行中房间默认不应把敏感 token 设为 public。

执行层不在本报告发明新的授权系统。可见性 enforcement 应复用当前房间 capability 检查：只有具备 KP/keeper 能力的用户能创建、移动、隐藏、公开或删除场景 token；玩家只能看到被服务端/接口按 `players` 或 `public` 过滤后的对象。前端隐藏不算权限边界，真正的数据下发应在房间能力检查之后裁剪。

`disposition: 'secret'` 不是权限本身。它可以作为默认展示样式和“新建实例默认 keeper 可见”的提示，但不能替代 `visibility` 和房间 capability。`friendly` / `neutral` / `hostile` 也不应自动授予控制权、攻击权或规则目标权。

## COC 调查场景映射

Token/资产在《沉没之城》的目标不是 DND tactical automation，而是提升 COC 调查呈现：

- 调查员：角色详情页可配置 portrait、standee、staticToken；场景中摆放的是 SceneTokenInstance，绑定 `character`。
- 调查 NPC：NPC 档案可有头像、半身立绘、剪影、伪装状态、死亡状态；场景中按揭示程度摆放并绑定 `investigationNpc`。
- 房间临时 NPC：KP 可创建 `roomNpc`，绑定一个或多个 TokenAsset，用于酒馆老板、港口巡警、梦境目击者等局部角色。
- 怪异存在：可用 `monster` 或 `marker` 类型素材表现“水下阴影”“门后的轮廓”；第一阶段不绑定完整怪物 stat block。
- 物件与证物：`object` token 可表现钥匙、尸体、仪式书、污染水样；点击后应打开现有调查对象或轻量说明，而不是把完整线索正文复制进 token。
- 状态变体：同一 NPC 可在不同阶段显示“正常”“惊恐”“失踪”“敌意”“死亡/不可见”素材；切换是 KP 叙事操作，不自动改角色卡或规则状态。

## 第一阶段不采用

- 自动 HP 条。
- 自动占格和碰撞。
- 自动敌我视线。
- Token 动画状态机。
- Token 与完整战斗轮自动绑定。
- 自动 AC、移动速度、感知范围、黑暗视觉或测距。
- 自动从 `disposition` 推导敌我规则、权限或攻击合法性。
- 自动从 `statusTags` 写回角色卡、NPC 档案、伤害、理智或战斗状态。
- 自动把外部 monster/stat block 数据导入生产规则实体。

## 后置能力

后续如果用户明确需要更强 VTT 能力，可以按顺序扩展：

- 素材库批量导入：扫描本地 FVTT/Roll20 token 包，生成 TokenAsset 和 tags。
- 状态变体管理：为角色/NPC 配置 `visualSlots`，由 KP 在场景中手动切换。
- 玩家自选 token：允许玩家在角色档案里选择 portrait/staticToken，但发布到场景仍需房间 capability 或 KP 审核。
- 轻量动画预览：支持 gif/webm/序列帧播放和暂停，但不做状态机。
- 与战斗模块联动：仅在未来战斗系统明确后，通过单独 adapter 读取 SceneTokenInstance；不要让 token 模型先承诺战斗规则。

## 开放决策

- 坐标采用背景像素还是归一化坐标：沿用 Task 3 的开放问题，Token 实例接口先不固定解释方式。
- TokenAsset 是否直接挂通用 Asset metadata：建议 `assetId` 指向统一 Asset 表，版权/来源/文件格式留在 Asset 层。
- 玩家是否能上传个人 token：建议允许进入个人素材库，但摆放到房间场景应由 KP capability 控制。
- `public` 是否在运行中房间开放：建议默认不开放，只用于模板/素材预览；这是产品策略，不在本研究中定死。

## 证据索引

| 证据 | 路径 | 行号 / 符号 | 说明 |
| --- | --- | --- | --- |
| DND5E commit | `.codex-run/vtt-research/dnd5e` | `42f5b20` | 本轮读取的 DND5E 本地克隆版本 |
| AboveVTT commit | `.codex-run/vtt-research/abovevtt` | `4957c0d` | 本轮读取的 AboveVTT 本地克隆版本 |
| DND5E Token 注册 | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` | `65-80`, `234-248` | Actor/Token document、object、HUD、ruler、prototype sheet、movement actions 注册 |
| DND5E trackable attributes | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` | `288-330` | HP、movement、senses、resources 等可被 token HUD / tracker 使用 |
| DND5E status effects | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` | `414-437` | 系统状态效果合并到 `CONFIG.statusEffects`，并可标记 neverBlockMovement |
| DND5E movement / sense settings | `.codex-run/vtt-research/dnd5e/module/settings.mjs` | `106-132`, `635-647` | movementAutomation、senseVisionSync、bloodied 是系统级自动化设置 |
| TokenDocument vision | `.codex-run/vtt-research/dnd5e/module/documents/token.mjs` | `47-64`, `74-118`, `319-332` | Actor senses 派生 token sight/detection，并在相关更新后重置 vision source |
| TokenDocument bars / dynamic ring | `.codex-run/vtt-research/dnd5e/module/documents/token.mjs` | `122-140`, `178-190`, `249-291` | HP/resource bar、动态 ring 缩放和状态视觉效果 |
| Token movement / HP bar | `.codex-run/vtt-research/dnd5e/module/canvas/token.mjs` | `21-75`, `80-137`, `141-210`, `214-242` | movement cost/blocking、HP bar、status/ring effect 连接 |
| TokenLayer occupancy | `.codex-run/vtt-research/dnd5e/module/canvas/layers/tokens.mjs` | `1-49`, `53-94`, `107-140` | creature、disposition、hidden、secret、size、elevation 影响阻挡/困难地形 |
| DND5E size / token colors / movement types | `.codex-run/vtt-research/dnd5e/module/config.mjs` | `1188-1280`, `2393-2463` | actor size、HP/ring/ruler colors、movement types 集中配置 |
| Token config resource/vision UI | `.codex-run/vtt-research/dnd5e/module/applications/token-config.mjs` | `4-15`, `28-53`, `84-125`, `128-147` | Token config 处理资源标签、item uses、sense-derived vision notice |
| Token HUD conditions | `.codex-run/vtt-research/dnd5e/module/applications/hud/token-hud.mjs` | `17-25`, `61-82` | HUD 条件显示和切换最终作用到 Actor status/effects |
| AboveVTT Token constructor/options | `.codex-run/vtt-research/abovevtt/Token.js` | `90-111`, `113-235`, `291-315` | Token 持有 options，内含 HP、conditions、player/monster 判断 |
| AboveVTT hide/show/delete | `.codex-run/vtt-research/abovevtt/Token.js` | `510-548` | hidden 和 combat tracker show 状态写入实例 options，删除移除 scene tokens |
| AboveVTT token sync | `.codex-run/vtt-research/abovevtt/Token.js` | `872-882`, `1227-1235` | token options 通过 message broker 同步，update 后刷新 combat/quick roll |
| AboveVTT movement/LoS checks | `.codex-run/vtt-research/abovevtt/Token.js` | `700-760`, `4160-4165` | 移动与 LoS/share vision 关联，属于本项目第一阶段不采用的重功能 |
| AboveVTT place token | `.codex-run/vtt-research/abovevtt/Token.js` | `3816-3920` | token-like object 合并默认设置/PC/素材选项后成为场景实例 |
| AboveVTT scene switching | `.codex-run/vtt-research/abovevtt/ScenesHandler.js` | `341-386`, `424-446`, `862-875` | scene 保存地图、视频标记、tokens；切换时重置 TOKEN_OBJECTS 并创建/更新实例 |
| AboveVTT scene import tokens | `.codex-run/vtt-research/abovevtt/ScenesHandler.js` | `611-630`, `690-766` | source maps 可生成场景和隐藏 token/note 标记 |
| AboveVTT API scene shape | `.codex-run/vtt-research/abovevtt/AboveApi.js` | `74-96`, `154-175` | DM 获取场景；迁移时将 tokens 数组规范为 id-index object 并清理 URL |
| AboveVTT built-in tokens | `.codex-run/vtt-research/abovevtt/built-in-tokens.js` | `1-9`, `73-130` | 内置素材目录包含 folderPath、image、alternativeImages 等概念 |
| AboveVTT alternative images | `.codex-run/vtt-research/abovevtt/TokensPanel.js` | `1840-1902`, `2573-2622` | catalog item 可有 alternative images；My Token 可保存 statBlock 引用和 tokenOptions |
| AboveVTT monster conversion | `.codex-run/vtt-research/abovevtt/TokensPanel.js` | `1353-1425`, `5024-5088`, `5109-5362` | monster/open5e 数据会转换 HP、AC、size、senses、movement 等规则字段 |


# FVTT 类 VTT 规则、地图、Token 架构研究计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 通过研究 Foundry DND5E、PlanarAlly、Owlbear Rodeo 扩展示例、AboveVTT 等源码，形成《沉没之城》可落地的规则拓展、地图/场景、Token/资产架构方案。

**Architecture:** 本计划只做源码研究和方案沉淀，不进入业务实现。研究按“规则拓展 -> 地图/场景 -> Token/资产 -> 资源包导入 -> 沉没之城映射方案”的顺序推进，每个阶段输出可复用结论和明确不采用的能力边界。

**Tech Stack:** Research notes in Markdown; source review for JavaScript/TypeScript/Python/Java projects; local read-only clone directories under `C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\`.

## Global Constraints

- 除非用户主动要求，不进行任何类型的深度测试。
- 本计划阶段不修改《沉没之城》业务代码。
- 本计划阶段不复制第三方 VTT 源码进入项目，只研究架构、数据模型、扩展点和产品取舍。
- 商业或付费 FVTT/Roll20 资源包默认按本地私有素材处理，不设计公开裸链。
- 当前研究优先级只覆盖规则拓展、地图/场景、Token/资产；完整 3D VTT、语音、视频、商业市场、完整战棋自动化后置。
- `C:\Users\29102\Documents\沉没之城` 是本项目真实仓库路径；`Y:\sunkencity` 只作为 Codex 工作入口时使用。
- 执行位置：若任务简报中的命令路径以 `C:\Users\29102\Documents\沉没之城\` 开头，而该任务在 `C:\Users\29102\Documents\沉没之城\.worktrees\vtt-architecture-research\` 中执行，则一律按相同相对路径机械改写到该 worktree 根目录，不在主检出写入该任务产物。

---

## 0. 研究边界

### 本轮必须研究

- Foundry DND5E 的 `system.json`、初始化入口、规则系统注册、模块数据注册、文档类替换、Canvas/Token 扩展。
- PlanarAlly 的 Web 地图、Token、光照/视野、权限、自托管资源组织。
- Owlbear Rodeo SDK 与 `dynamic-fog` 的轻量扩展、地图工具、雾区/墙/光源体验。
- AboveVTT 的外部内容库、地图、Token、场景导入和 D&D Beyond 绑定。
- MapTool 只做后置抽样研究，重点看战役文件、Token 属性、宏系统，不作为第一轮主参考。

### 本轮不研究

- TaleSpire / Sigil 式完整 3D VTT。
- Roll20 / Fantasy Grounds / Alchemy 的闭源内部实现。
- 完整动态光照和墙体视线的实时算法实现。
- 完整战斗自动化、法术模板、精确碰撞。
- 公开素材市场、付费资源分发、用户上传版权审核。

---

## 1. 文件与产物结构

**Create:**

- `docs/superpowers/research/vtt-architecture/README.zh-CN.md`：研究总入口，记录研究对象、源码路径、阶段结论、后续阅读顺序。
- `docs/superpowers/research/vtt-architecture/01-rule-extension.zh-CN.md`：规则拓展研究报告，聚焦 Foundry DND5E 的系统包、模块包、Hooks、CONFIG、Compendium、flags。
- `docs/superpowers/research/vtt-architecture/02-map-scene.zh-CN.md`：地图/场景研究报告，聚焦 Scene、地图背景、动态地图、场景对象、点位、雾区、权限层。
- `docs/superpowers/research/vtt-architecture/03-token-asset.zh-CN.md`：Token/资产研究报告，聚焦 Token 与 Actor/NPC、Token 实例、动态 Token、状态标记、可见性。
- `docs/superpowers/research/vtt-architecture/04-resource-pack-import.zh-CN.md`：FVTT/Roll20 资源包导入研究报告，聚焦本地扫描、分类、缩略图、私有访问和场景预设生成。
- `docs/superpowers/research/vtt-architecture/05-sunken-city-architecture-proposal.zh-CN.md`：《沉没之城》映射方案，给出 RuleSystemManifest、SceneAssetPreset、SceneObject、TokenAsset、SceneTokenInstance 草案。

**First-round local research clones, not committed:**

- `C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e`
- `C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\planarally`
- `C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\owlbear-sdk`
- `C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\owlbear-dynamic-fog`
- `C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\abovevtt`

**Deferred sampling path, not created by this plan:**

- `C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\maptool`

---

## 2. 执行任务

### Task 1: 建立研究工作区和源码索引

**Files:**

- Create: `docs/superpowers/research/vtt-architecture/README.zh-CN.md`
- Local only: `.codex-run/vtt-research/*`

**Interfaces:**

- Produces: 一份源码索引表，后续任务按该表定位研究入口。

- [ ] **Step 1: 创建研究目录**

Run:

```powershell
New-Item -ItemType Directory -Force "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research"
New-Item -ItemType Directory -Force "C:\Users\29102\Documents\沉没之城\docs\superpowers\research\vtt-architecture"
```

Expected: 两个目录存在；不修改业务代码。

- [ ] **Step 2: 克隆第一轮源码**

Run:

```powershell
git clone --depth=1 https://github.com/foundryvtt/dnd5e.git "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e"
git clone --depth=1 https://github.com/Kruptein/planarally.git "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\planarally"
git clone --depth=1 https://github.com/owlbear-rodeo/sdk.git "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\owlbear-sdk"
git clone --depth=1 https://github.com/owlbear-rodeo/dynamic-fog.git "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\owlbear-dynamic-fog"
git clone --depth=1 https://github.com/cyruzzo/AboveVTT.git "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\abovevtt"
```

Expected: 五个源码目录存在；若某仓库网络失败，只记录失败原因，不阻塞其他仓库研究。

- [ ] **Step 3: 记录版本和许可证**

Run:

```powershell
git -C "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e" rev-parse --short HEAD
git -C "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\planarally" rev-parse --short HEAD
git -C "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\owlbear-sdk" rev-parse --short HEAD
git -C "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\owlbear-dynamic-fog" rev-parse --short HEAD
git -C "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\abovevtt" rev-parse --short HEAD
```

Expected: 每个仓库得到一个短 commit id。

- [ ] **Step 4: 写入研究总入口**

Create `docs/superpowers/research/vtt-architecture/README.zh-CN.md` with:

```markdown
# VTT 架构研究总入口

## 研究目标

本轮研究只服务《沉没之城》的三类能力：规则拓展、地图/场景、Token/资产。研究结论用于设计后续素材库和轻量地图 MVP，不直接复制第三方源码。

## 源码对象

| 对象 | 本地路径 | 研究重点 | 许可证风险 |
| --- | --- | --- | --- |
| Foundry DND5E | `.codex-run/vtt-research/dnd5e` | system manifest、规则注册、文档类替换、模块数据 | 可研究架构，谨慎处理内容和素材 |
| PlanarAlly | `.codex-run/vtt-research/planarally` | Web 地图、Token、光照、视野、权限 | 开源代码只做参考 |
| Owlbear SDK | `.codex-run/vtt-research/owlbear-sdk` | 轻量扩展 API | SDK 可参考接口设计 |
| Owlbear dynamic-fog | `.codex-run/vtt-research/owlbear-dynamic-fog` | 墙、门、光源、动态雾区 | 示例代码不复制 |
| AboveVTT | `.codex-run/vtt-research/abovevtt` | 外部内容库、地图、Token 整合 | AGPL，严禁直接复制进项目 |

## 阶段产物

- `01-rule-extension.zh-CN.md`
- `02-map-scene.zh-CN.md`
- `03-token-asset.zh-CN.md`
- `04-resource-pack-import.zh-CN.md`
- `05-sunken-city-architecture-proposal.zh-CN.md`

## 当前边界

不研究完整 3D VTT、语音、视频、商业市场、完整战棋自动化。动态光照、墙体视线、复杂碰撞只做产品取舍研究，不进入第一轮实现。
```

### Task 2: 规则拓展研究

**Files:**

- Create: `docs/superpowers/research/vtt-architecture/01-rule-extension.zh-CN.md`

**Interfaces:**

- Consumes: Task 1 的源码索引。
- Produces: `RuleSystemManifest`、`RuleRegistry`、规则包/内容包边界建议。

- [ ] **Step 1: 阅读 Foundry DND5E 入口文件**

Run:

```powershell
Get-Content "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e\system.json" -TotalCount 260
Get-Content "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e\dnd5e.mjs" -TotalCount 720
Get-Content "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e\module\module-registration.mjs" -TotalCount 260
```

Expected: 能定位 `documentTypes`、`packs`、`esmodules`、`Hooks.once("init")`、`CONFIG.*`、`registerModuleData()`。

- [ ] **Step 2: 搜索规则扩展点**

Run:

```powershell
rg -n "Hooks\.once|Hooks\.on|CONFIG\.|DocumentSheetConfig|registerModuleData|flags\.dnd5e|spellLists|sourceBooks|game\.settings|systemMigrationVersion" "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e" --glob "!packs/**"
```

Expected: 得到规则注册、模块数据、设置、迁移、Sheet 注册的入口清单。

- [ ] **Step 3: 写规则拓展报告**

Create `docs/superpowers/research/vtt-architecture/01-rule-extension.zh-CN.md` with these required sections:

```markdown
# 规则拓展研究

## 结论摘要

Foundry DND5E 的核心价值在于把规则作为 system package 注册到 VTT 核心，而不是把 DND5E 逻辑散落在页面代码里。《沉没之城》应采用默认内置 `coc7` 规则系统，并预留 `dnd5e`、`custom` 作为后续插件化系统。

## Foundry DND5E 关键机制

| 机制 | 源码入口 | 作用 | 对《沉没之城》的启发 |
| --- | --- | --- | --- |
| system manifest | `system.json` | 声明系统 id、版本、兼容性、文档类型、packs、入口脚本 | 设计 `RuleSystemManifest` |
| init hook | `dnd5e.mjs` | 在初始化时替换 Actor、Item、Token、Combat、Dice、Sheet 类 | 规则系统通过 registry 注入能力 |
| CONFIG | `dnd5e.mjs` / `module/config.mjs` | 保存规则枚举、骰子、状态、行动类型 | COC7 技能、成功等级、状态、骰点公式应集中配置 |
| module data | `module/module-registration.mjs` | 从模块 manifest flags 中注册 sourceBooks、spellLists | 内容包通过 manifest 扩展来源书和条目集合 |
| packs | `system.json` | 组织 Actor、Item、Journal、RollTable 等内容 | 跑团模组、NPC、道具、规则条目应拆成内容包 |

## 建议的 RuleSystemManifest

```typescript
export interface RuleSystemManifest {
  id: 'coc7' | 'dnd5e' | string;
  title: string;
  version: string;
  compatibleAppVersion: string;
  documentTypes: {
    character: string[];
    item: string[];
    effect: string[];
    journalPage: string[];
  };
  capabilities: {
    dice: boolean;
    successLevel: boolean;
    characterSheetSchema: boolean;
    combat: boolean;
    advancement: boolean;
  };
  entry: string;
  packs?: RuleContentPackManifest[];
}

export interface RuleContentPackManifest {
  id: string;
  title: string;
  ruleSystemId: string;
  version: string;
  type: 'npc' | 'item' | 'scenario' | 'spell' | 'skill' | 'journal' | 'mixed';
  privateAccess: boolean;
}
```

## 建议边界

- `coc7` 是内置默认规则，不再把 COC7 骰点、技能、成功等级散落在房间组件中。
- `dnd5e` 第一阶段只做 manifest 和数据模型预留，不做完整职业、法术、等级成长自动化。
- 内容包和规则包分离：内容包提供 NPC、物品、场景、日志、地图；规则包提供骰点、角色卡字段、判定和状态解释。
- 插件不得直接改数据库结构；需要通过 schema version 和迁移任务进入主项目。

## 后续待验证

- 当前 `DiceRoll`、`Character`、`Room` 中哪些字段已经硬编码 COC7。
- `docs/EXTENSIBILITY.md` 中的旧 RuleRegistry 草案是否仍可复用。
- 规则系统是否需要 per-room 启用，还是 per-scenario 启用。
```

### Task 3: 地图/场景研究

**Files:**

- Create: `docs/superpowers/research/vtt-architecture/02-map-scene.zh-CN.md`

**Interfaces:**

- Consumes: Task 1 的源码索引。
- Produces: `SceneAssetPreset`、`SceneObject`、轻量地图 MVP 边界。

- [ ] **Step 1: 阅读 PlanarAlly 地图相关目录**

Run:

```powershell
rg -n "scene|map|floor|location|wall|vision|light|fog|asset|shape|token" "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\planarally" --glob "!**/node_modules/**" --glob "!**/.git/**"
```

Expected: 得到地图、层、墙、视野、光源、资源对象相关入口。

- [ ] **Step 2: 阅读 Owlbear dynamic-fog**

Run:

```powershell
rg -n "wall|door|fog|light|vision|scene|map|token|metadata|contextMenu|tool" "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\owlbear-dynamic-fog" --glob "!**/node_modules/**" --glob "!**/.git/**"
```

Expected: 得到轻量动态雾区扩展的对象模型和交互入口。

- [ ] **Step 3: 写地图/场景报告**

Create `docs/superpowers/research/vtt-architecture/02-map-scene.zh-CN.md` with these required sections:

```markdown
# 地图/场景研究

## 结论摘要

《沉没之城》不应第一阶段复制 Foundry 的完整 Canvas、动态光照和墙体视线。更适合先采用 Owlbear 式轻量地图：场景背景、动态背景、Token 摆放、公开点位、KP 私密点位、简单雾区和场景预设。

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

## 《沉没之城》映射

- `RoomScene` 继续表示房间内的叙事场景。
- 新增的地图能力应作为 `RoomScene` 的可选视觉层，不替代现有调查日志、线索板、NPC 档案。
- 动态地图视频第一阶段作为背景资产使用，不参与碰撞、视线和自动化。
- 地图点位与 `InvestigationClue`、`InvestigationNpc`、`InvestigationScene` 通过引用绑定。

## 第一阶段不采用

- 自动视线遮挡。
- 角色移动碰撞。
- 动态光源计算。
- 战棋距离规则。
- 3D 地图编辑器。
```

### Task 4: Token/资产研究

**Files:**

- Create: `docs/superpowers/research/vtt-architecture/03-token-asset.zh-CN.md`

**Interfaces:**

- Consumes: Task 2 的规则边界和 Task 3 的场景分层。
- Produces: `TokenAsset`、`SceneTokenInstance`、NPC/角色视觉绑定规则。

- [ ] **Step 1: 阅读 Foundry DND5E Token 扩展**

Run:

```powershell
Get-Content "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e\module\canvas\token.mjs" -TotalCount 320
Get-Content "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e\module\canvas\layers\tokens.mjs" -TotalCount 260
rg -n "Token|token|actor|disposition|hidden|status|ring|movement|bar|hp|vision" "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e\module" --glob "!**/packs/**"
```

Expected: 得到 Token 与 Actor、可见性、状态、血条、移动、占格的关系。

- [ ] **Step 2: 阅读 AboveVTT Token 和场景导入**

Run:

```powershell
rg -n "token|Token|scene|Scene|map|Map|monster|character|ddb|image|vision|wall|fog" "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\abovevtt" --glob "!**/.git/**"
```

Expected: 得到外部内容库如何转为地图 Token 和场景对象的入口。

- [ ] **Step 3: 写 Token/资产报告**

Create `docs/superpowers/research/vtt-architecture/03-token-asset.zh-CN.md` with these required sections:

```markdown
# Token/资产研究

## 结论摘要

Token 应分成两个概念：`TokenAsset` 是可复用素材，`SceneTokenInstance` 是某个场景中的一次摆放。NPC、角色、怪物不应直接等同于 Token；它们可以绑定一个或多个 TokenAsset。

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

## 绑定规则

- 一个 NPC 可以绑定头像、立绘、静态 Token、动态 Token、死亡/隐藏/敌对状态图。
- 一个 TokenAsset 可以被多个场景实例复用。
- 动态 Token 第一阶段只作为视觉资产，不驱动战斗和规则计算。
- `statusTags` 第一阶段只影响视觉标签和筛选，不自动修改角色卡属性。

## 第一阶段不采用

- 自动 HP 条。
- 自动占格和碰撞。
- 自动敌我视线。
- Token 动画状态机。
- Token 与完整战斗轮自动绑定。
```

### Task 5: FVTT/Roll20 资源包导入研究

**Files:**

- Create: `docs/superpowers/research/vtt-architecture/04-resource-pack-import.zh-CN.md`

**Interfaces:**

- Consumes: Task 2、Task 3、Task 4 的 manifest、scene、token 草案。
- Produces: 本地资源扫描、分类、缩略图、私有访问策略。

- [ ] **Step 1: 研究 FVTT package manifest 结构**

Run:

```powershell
Get-Content "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e\system.json" -TotalCount 260
rg -n '"packs"|"relationships"|"compatibility"|"flags"|"media"|"manifest"|"download"|"system"' "C:\Users\29102\Documents\沉没之城\.codex-run\vtt-research\dnd5e\system.json"
```

Expected: 得到 FVTT package 的兼容性、内容包、flags、下载信息字段。

- [ ] **Step 2: 写资源包导入报告**

Create `docs/superpowers/research/vtt-architecture/04-resource-pack-import.zh-CN.md` with these required sections:

```markdown
# FVTT/Roll20 资源包导入研究

## 结论摘要

用户已有大量 FVTT/Roll20 地图和 Token 资源包，应先做本地私有素材库，而不是直接上传到公网静态目录。导入器第一阶段只做扫描、分类、缩略图、索引和场景预设草稿。

## 支持的资源类型

| 类型 | 扩展名 | 建议分类 |
| --- | --- | --- |
| 静态地图 | `.png`, `.jpg`, `.jpeg`, `.webp`, `.avif` | `scene-map`, `battle-map`, `handout` |
| 动态地图 | `.webm`, `.mp4`, `.mov` | `ambient-video`, `animated-map` |
| Token | `.png`, `.webp`, `.gif`, `.webm` | `character-token`, `npc-token`, `monster-token` |
| 图标 | `.svg`, `.png`, `.webp` | `item-icon`, `skill-icon`, `status-icon` |
| FVTT manifest | `module.json`, `system.json`, `world.json` | `foundry-package` |
| Roll20 资源包 | folder + filename conventions | `roll20-pack` |

## 建议的 ImportedAsset

```typescript
export interface ImportedAsset {
  id: string;
  title: string;
  type: 'image' | 'video' | 'audio' | 'icon' | 'manifest';
  subtype: string;
  sourcePath: string;
  privateUrl?: string;
  thumbnailPath?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  isAnimated: boolean;
  sourcePackId?: string;
  tags: string[];
  licenseNote: string;
}
```

## 私有访问原则

- 商业资源默认不放进 `apps/web/public`。
- 本地扫描结果先进入私有索引，不生成公网 URL。
- 服务器部署时必须走登录后鉴权访问，避免裸露付费资源。
- 导入器保留 `sourcePath` 和 `sourcePackId`，方便用户追溯来源。

## 第一阶段导入器边界

- 只读扫描，不移动源文件。
- 生成缩略图和 manifest 草稿。
- 按文件名、目录名、manifest 元数据推断标签。
- 不做版权判断，只记录来源和用户私有标记。
- 不自动公开到房间，必须由 KP 手动选择绑定。
```

### Task 6: 汇总为《沉没之城》架构方案

**Files:**

- Create: `docs/superpowers/research/vtt-architecture/05-sunken-city-architecture-proposal.zh-CN.md`

**Interfaces:**

- Consumes: Task 2-5 的研究报告。
- Produces: 第一轮 MVP 范围和后续开发拆分建议。

- [ ] **Step 1: 对照现有项目模型**

Run:

```powershell
rg -n "model Room|model RoomScene|model ScenePreset|model InvestigationScene|model CombatSession|model RoomEventLog|model DiceRoll|model Character" "C:\Users\29102\Documents\沉没之城\apps\server\prisma\schema.prisma"
rg -n "ScenePanel|RoomSceneBanner|InvestigationDock|RoomCommandRail|Dice|RoomPlayerView|RoomGameplayTypes" "C:\Users\29102\Documents\沉没之城\apps\web\src" --glob "!**/node_modules/**"
Get-Content "C:\Users\29102\Documents\沉没之城\docs\EXTENSIBILITY.md" -TotalCount 180
```

Expected: 得到现有房间、场景、骰点、调查工作台和旧扩展性草案的入口。

- [ ] **Step 2: 写最终映射方案**

Create `docs/superpowers/research/vtt-architecture/05-sunken-city-architecture-proposal.zh-CN.md` with these required sections:

```markdown
# 《沉没之城》VTT 架构映射方案

## 结论摘要

《沉没之城》不应复刻 Foundry，而应吸收 Foundry 的 system/package 思路、Owlbear 的轻量地图体验、PlanarAlly 的 Web 地图对象模型、AboveVTT 的外部内容整合方法，建设适合中文网团和 COC 调查的素材化场景系统。

## 第一轮 MVP

- 本地资源扫描。
- 私有素材库索引。
- 静态/动态地图绑定到 RoomScene。
- NPC/角色与 TokenAsset 绑定。
- 场景点位标记。
- KP 私密点位和 PL 可见摘要。
- `RuleSystemManifest` 草案落文档，不立即开发完整 DND5E。

## 后续开发拆分

1. 素材资产库 V1。
2. 场景背景与点位 V1。
3. Token 绑定 V1。
4. 规则系统 manifest 与 registry V1。
5. FVTT/Roll20 资源包只读导入器 V1。

## 暂不实现

- 动态光照。
- 墙体视线。
- 复杂碰撞。
- 完整战斗自动化。
- 3D 地图编辑器。
- 公开资源市场。

## 风险

- 商业资源版权风险：默认私有访问。
- AGPL/GPL 源码污染风险：只研究架构，不复制代码。
- 功能膨胀风险：先做 COC 调查场景，不做 DND 战棋平台。
- 性能风险：动态地图视频需要缩略图、懒加载和移动端降级。
```

### Task 7: 自检和交付

**Files:**

- Modify: `docs/superpowers/research/vtt-architecture/README.zh-CN.md`
- Review: `docs/superpowers/research/vtt-architecture/*.md`

**Interfaces:**

- Consumes: Task 1-6 的所有报告。
- Produces: 可交接的研究报告包。

- [ ] **Step 1: 搜索占位符和空结论**

Run:

```powershell
$patterns = @(
  ('TB' + 'D'),
  ('TO' + 'DO'),
  ('待' + '补'),
  ('稍' + '后'),
  ('未' + '定'),
  ('place' + 'holder')
)
rg -n ($patterns -join '|') "C:\Users\29102\Documents\沉没之城\docs\superpowers\research\vtt-architecture"
```

Expected: 无匹配；若有匹配，改成明确结论或移除。

- [ ] **Step 2: 确认没有业务代码改动**

Run:

```powershell
git -C "C:\Users\29102\Documents\沉没之城" status --short -- docs/superpowers/research/vtt-architecture docs/superpowers/plans/2026-07-09-vtt-rules-map-token-research.zh-CN.md
```

Expected: 只看到本计划和研究文档相关文件。

- [ ] **Step 3: 写交付摘要**

Update `docs/superpowers/research/vtt-architecture/README.zh-CN.md` with:

```markdown
## 交付摘要

本研究包给出了规则拓展、地图/场景、Token/资产、资源包导入和《沉没之城》映射方案。后续建议先开发素材资产库 V1 和场景背景/点位 V1，再开发 Token 绑定和规则系统 registry。
```

---

## Self-Review

- Spec coverage: 覆盖用户指定的规则拓展、地图、Token 及相关系统；其余内容明确后置。
- 占位符扫描: 本计划不包含未完成占位语。
- Type consistency: `RuleSystemManifest`、`SceneAssetPreset`、`SceneObjectDraft`、`TokenAsset`、`SceneTokenInstance`、`ImportedAsset` 命名在各任务中保持一致。
- Scope check: 本计划为研究计划，不进入业务实现；符合“不深度测试”和“先研究再行动”的约束。

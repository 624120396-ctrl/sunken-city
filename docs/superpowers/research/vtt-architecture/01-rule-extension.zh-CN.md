# 规则拓展研究

## 结论摘要

Foundry DND5E 的核心价值不是 DND5E 规则本身，而是把规则作为一个可声明、可初始化、可注册内容包的 system package 接入 VTT 核心。它用 `system.json` 声明文档类型和 packs，用 `dnd5e.mjs` 在初始化阶段把 Actor、Item、Token、Combat、Dice、Sheet 等能力绑定到 Foundry 的核心注册点，再用 registry 与 manifest flags 承接内容包扩展。

《沉没之城》第一阶段不应复制完整 DND5E 职业、法术、战斗和等级成长自动化。更稳妥的方向是默认内置 `coc7` 规则系统，把 COC7 骰点、技能、成功等级、角色卡字段、状态解释集中进规则层；同时保留 `dnd5e`、`custom` 的 manifest 和 registry 预留，但不把第三方规则内容或自动化直接搬进业务代码。

需要明确区分两层事实：

- Foundry core 概念：system package、manifest、Hooks、CONFIG、DocumentSheetConfig、Compendium、game.settings 等属于 Foundry 平台概念，本轮只能从 DND5E 开源系统如何使用这些入口来反推。
- DND5E 仓库可验证事实：本地 `dnd5e` 克隆在 `42f5b20`，可验证其 `system.json`、`dnd5e.mjs`、`module/module-registration.mjs`、`module/registry.mjs`、`module/config.mjs`、`module/settings.mjs`、`module/migration.mjs` 中的具体注册方式。

## Foundry DND5E 关键机制

| 机制 | 源码入口 | 可验证事实 | 对《沉没之城》的启发 |
| --- | --- | --- | --- |
| system manifest | `.codex-run/vtt-research/dnd5e/system.json` | 声明 `id`、版本兼容、`esmodules`、`documentTypes`、`packs` 和系统级 `flags.dnd5e.sourceBooks` | 设计 `RuleSystemManifest`，把规则 id、版本、文档类型、入口和内容包从页面代码中拿出来 |
| init hook | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` | `Hooks.once("init")` 内设置 `CONFIG.DND5E`，替换 Actor、Item、Token、Combat、Dice、UI、Sheet 等类，并注册设置和模块数据 | 《沉没之城》的规则系统应通过单一 RuleRegistry 初始化能力，不让房间组件各自硬编码规则 |
| CONFIG | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` / `module/config.mjs` | `module/config.mjs` 集中保存 abilities、skills、conditionTypes、statusEffects、activityTypes、advancementTypes、SPELL_LISTS、sourceBooks 等枚举或配置；入口文件再挂到 `CONFIG.DND5E` | COC7 技能、成功等级、状态、骰点公式、角色卡 schema 应集中配置 |
| module data | `.codex-run/vtt-research/dnd5e/module/module-registration.mjs` | `registerModuleData()` 扫描 `game.system`、启用的 modules 和 `game.world`，从 `flags.dnd5e.sourceBooks`、`flags.dnd5e.spellLists` 注册数据 | 内容包可以通过 manifest 扩展来源书、条目集合、列表，而不是直接改规则核心 |
| packs | `.codex-run/vtt-research/dnd5e/system.json` | packs 按 Actor、Item、JournalEntry、RollTable 等类型组织，pack flags 中可见 `sourceBook`、`types`、`sorting`、`display` | 跑团模组、NPC、物品、规则条目、日志、地图应拆成内容包；规则包只解释这些内容如何被判定 |
| registry | `.codex-run/vtt-research/dnd5e/module/registry.mjs` | registry 管理 backgrounds、classes、species、subclasses、spellLists 等索引和 ready 状态，spell list 会延迟到 ready 后加载 | 《沉没之城》的 RuleRegistry 应管理规则系统和内容包索引，不承担业务数据库迁移或 UI 重写 |
| settings / migration | `.codex-run/vtt-research/dnd5e/module/settings.mjs` / `module/migration.mjs` | `systemMigrationVersion` 是 world 范围设置；迁移会处理 world documents 与部分 compendium packs，并在完成后写入版本 | 规则包升级必须有 schema version 和主项目审核迁移，不能让插件直接改表结构 |

## 实际初始化顺序

基于 DND5E 仓库可验证源码，顺序可以概括为：

1. Foundry 根据 `system.json` 加载系统包，读取 `id`、兼容版本、`documentTypes`、`packs`，并加载 `esmodules` 中的 `dnd5e.mjs`。
2. `dnd5e.mjs` 顶层先导入 config、settings、applications、canvas、dataModels、dice、documents、migrations、module-registration、registry 等模块，并把它们挂到 `globalThis.dnd5e`。
3. `Hooks.once("init")` 中把 `globalThis.dnd5e` 合并到 `game.system`，再写入 `CONFIG.DND5E` 与多个 Foundry 核心 `CONFIG.*` 注册点，包括文档类、骰子类、Token 类、UI 类、数据模型、sheet 类和 movement 聚合器。
4. 同一 init 阶段调用 `registerSystemSettings()`、`registerSystemKeybindings()`，注册内置 `DND5E.SPELL_LISTS`，再调用 `registerModuleData()` / `registerModuleRedirects()` 扫描 system、modules、world manifest flags。
5. `Hooks.once("setup")` 阶段补齐可追踪属性、延迟设置、compendium pack 的显示和排序。
6. `Hooks.once("i18nInit")` 阶段配置状态效果、旧规则本地化覆盖、预本地化配置和 spellcasting 模型。
7. `Hooks.once("ready")` 阶段注册部分运行时 hooks，初始化背景、职业、种族、子职业 registry，启动 UI，并根据 `systemMigrationVersion` 与 system flags 判断是否迁移。

这里能验证的是 DND5E 如何使用 Foundry 的 hooks 和 CONFIG。Foundry core 如何加载 system package 的内部实现不在 DND5E 仓库中，本报告不把它说成已由此仓库直接证明。

## 建议的 RuleSystemManifest

下面保留 brief 要求的接口形状。需要注意：DND5E 的实际 `documentTypes` 使用 Foundry 文档名作为一级键，例如 `Actor`、`Item`、`ActiveEffect`、`JournalEntryPage`；《沉没之城》的接口刻意用业务归一化字段 `character`、`item`、`effect`、`journalPage`，避免把 Foundry 的类名直接变成自身产品契约。

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

建议第一阶段的 `coc7` manifest 只声明真正会用到的能力：

- `dice: true`：统一 COC7 骰点表达式、暗骰/明骰策略、结果记录。
- `successLevel: true`：集中处理大成功、极难、困难、普通、失败、大失败等成功等级。
- `characterSheetSchema: true`：集中角色卡字段、技能列表、派生值。
- `combat: false`：不在第一阶段实现完整战斗自动化。
- `advancement: false`：结团后成长涉及官方规则材料，继续冻结，等待用户明确恢复。

## RuleRegistry 边界

`RuleRegistry` 不应只是 `Map<string, GameRule>` 的薄封装。结合 DND5E 的 manifest、CONFIG、registry、settings、migration 方式，《沉没之城》应把它定义为规则系统生命周期边界。

### 职责

- 读取并校验 `RuleSystemManifest`，拒绝缺少 id、version、entry、documentTypes、capabilities 的规则包。
- 注册内置 `coc7`，并预留 `dnd5e`、`custom` 的 manifest 形状。
- 加载规则入口 `entry`，但只允许入口返回受控能力，例如 dice adapter、success-level adapter、character-sheet schema、content resolvers。
- 维护规则系统版本、启用状态、内容包索引和只读能力表。
- 校验 `RuleContentPackManifest` 与 `ruleSystemId` 是否匹配。
- 暴露稳定查询接口，例如 `getRuleSystem(id)`、`getDefaultRuleSystem()`、`listContentPacks(ruleSystemId)`、`resolveDiceAdapter(ruleSystemId)`。
- 记录 registry ready 状态；内容包索引可异步构建，但业务读写必须能判断是否 ready。

### 生命周期

1. **bootstrap**：应用启动时注册内置 `coc7` manifest，加载数据库中已审核的规则包和内容包 manifest。
2. **validate**：检查 app 版本兼容、规则 id 唯一、内容包 ruleSystemId 匹配、privateAccess 策略明确。
3. **activate**：按全局默认规则和未来房间/场景选择策略激活规则系统。
4. **index**：为 NPC、物品、技能、日志、场景等内容包建立只读索引。
5. **runtime resolve**：房间、角色卡、骰点和内容检索只通过 registry 取 adapter 或索引，不直接 import 某个规则包实现。
6. **upgrade**：规则包版本变化只标记需要迁移；实际 schema 迁移必须进入主项目迁移任务。

### 插件不得做的事

- 不得直接修改数据库结构、Prisma schema 或生产数据。
- 不得绕过主项目权限系统写入房间、角色、骰点记录。
- 不得覆盖全局 React 组件、Socket 协议、房间 lifecycle、`myRole` / `myCapabilities` / `myBinding` 契约。
- 不得把商业规则书、SRD 以外内容或第三方素材复制进公开静态资源。
- 不得在第一阶段声明完整 DND5E 职业、法术、战斗、等级成长自动化已经可用。
- 不得用内容包反向注入规则逻辑；内容包只提供数据，规则包解释数据。

## 规则包与内容包边界

规则包负责：

- 骰点公式和结果解释。
- 成功等级或失败等级。
- 角色卡字段 schema 和派生值。
- 状态、伤害、资源、技能等规则枚举。
- 内容包条目的解释方式。

内容包负责：

- NPC、怪物或调查对象条目。
- 物品、技能、法术或线索条目。
- 场景、日志、规则页、地图、Token/资产引用。
- 来源书、私有访问、排序、显示方式等元数据。

DND5E 的 pack flags 可验证 `sourceBook`、`types`、`sorting`、`display`。模块 manifest 可验证 `flags.dnd5e.sourceBooks` 和 `flags.dnd5e.spellLists`。因此《沉没之城》后续可以借鉴这些字段，但第一阶段不要把 DND5E 的 `spellLists` 等专有字段提升为通用必填字段；更适合在 `RuleContentPackManifest` 之外加 rule-specific metadata。

## 建议边界

- `coc7` 是内置默认规则，不再把 COC7 骰点、技能、成功等级散落在房间组件中。
- `dnd5e` 第一阶段只做 manifest 和数据模型预留，不做完整职业、法术、等级成长自动化。
- 内容包和规则包分离：内容包提供 NPC、物品、场景、日志、地图；规则包提供骰点、角色卡字段、判定和状态解释。
- 插件不得直接改数据库结构；需要通过 schema version 和迁移任务进入主项目。
- 许可证边界保持显式：DND5E 仓库代码可研究架构，不复制第三方源码；DND/SRD 内容、官方图标、token、书籍文本和商业模块不得进入《沉没之城》公开资源。
- 与当前房间系统维护边界一致：不改 Socket、房间生命周期、结算写回、官方成长规则；规则层先做设计沉淀。

## 开放决策

- COC7 第一阶段是否只覆盖骰点、成功等级、角色卡字段，还是同时覆盖少量状态解释：建议先只做前三者，但这是产品决策，不在本研究中替用户拍板。
- 规则系统是 per-room 启用，还是 per-scenario 启用：保持开放。`docs/EXTENSIBILITY.md` 曾提出 `Room.ruleId`，但当前任务只确认旧草案有方向价值，不把它升级为已定方案。
- 内容包私有访问是否按用户、房间、剧本或站点管理员授权：保持开放。DND5E manifest 只有 pack `private` 和 flags 证据，不能直接推出《沉没之城》的授权模型。
- DND5E 是否进入后续 MVP：保持开放。当前只做 manifest 预留，不做 DND5E 自动化承诺。

## 后续待验证

- 当前 `DiceRoll`、`Character`、`Room` 中哪些字段已经硬编码 COC7。
- `docs/EXTENSIBILITY.md` 中的旧 RuleRegistry 草案是否仍可复用；目前判断是可复用概念，不可直接照搬字段和实现步骤。
- 规则系统启用维度是 per-room 还是 per-scenario。
- COC7 官方规则材料、角色成长规则、战斗细则在没有授权文本前不得自动化实现。

## 证据索引

| 证据 | 路径 | 行号 / 符号 | 说明 |
| --- | --- | --- | --- |
| DND5E system id / version / compatibility | `.codex-run/vtt-research/dnd5e/system.json` | `2`, `5`, `6` | system manifest 基础身份和兼容声明 |
| 入口脚本 | `.codex-run/vtt-research/dnd5e/system.json` | `20` | `esmodules` 指向 `dnd5e.mjs` |
| 文档类型 | `.codex-run/vtt-research/dnd5e/system.json` | `26` | `documentTypes` 使用 Foundry 文档名组织 Actor、Item 等类型 |
| 内容包 | `.codex-run/vtt-research/dnd5e/system.json` | `168` | packs 数组组织 Actor、Item、JournalEntry、RollTable 等内容 |
| pack flags | `.codex-run/vtt-research/dnd5e/system.json` | `176-236`, `331-333`, `423-427` | `sourceBook`、`types`、`sorting`、`display` 可由源码验证 |
| system flags | `.codex-run/vtt-research/dnd5e/system.json` | `598-609` | `flags.dnd5e.sourceBooks`、迁移版本和 hot reload 配置 |
| init hook | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` | `57` | `Hooks.once("init")` 是系统注册主入口 |
| CONFIG 替换 | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` | `62-95`, `125-134` | 文档类、骰子类、UI 类、数据模型挂入 Foundry CONFIG |
| spell list / module data | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` | `118-122` | 内置 spell lists 注册后扫描模块 manifest 数据 |
| Sheet 注册 | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` | `140-236` | `DocumentSheetConfig` 注册 Actor、Item、Journal、Token 等 sheet |
| setup / i18n / ready | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` | `447`, `496`, `553` | 生命周期阶段分开处理 setup、i18nInit、ready |
| 迁移触发 | `.codex-run/vtt-research/dnd5e/dnd5e.mjs` | `597-600` | 读取 `systemMigrationVersion` 并按版本决定是否迁移 |
| module flags 注册 | `.codex-run/vtt-research/dnd5e/module/module-registration.mjs` | `13-20`, `30-49` | 扫描 system/modules/world 并注册 `sourceBooks`、`spellLists` |
| pack display / sorting | `.codex-run/vtt-research/dnd5e/module/module-registration.mjs` | `80-106` | 从 pack flags 设置目录显示和默认排序 |
| registry 类型 | `.codex-run/vtt-research/dnd5e/module/registry.mjs` | `148`, `350`, `738-746` | ItemRegistry、SpellListRegistry 和导出的 registry 对象 |
| registry ready | `.codex-run/vtt-research/dnd5e/module/registry.mjs` | `253-260`, `440-474` | registry 可延迟到 ready 后初始化 |
| DND5E 配置集中 | `.codex-run/vtt-research/dnd5e/module/config.mjs` | `62`, `165`, `3223`, `3619`, `3805`, `4409`, `4460`, `4918` | abilities、skills、spell lists、conditions、status、activity、advancement、sourceBooks |
| settings / migration setting | `.codex-run/vtt-research/dnd5e/module/settings.mjs` | `74-83`, `715-718`, `731-740` | 注册 world 迁移版本、缓存 world settings、延迟设置 |
| world migration | `.codex-run/vtt-research/dnd5e/module/migration.mjs` | `10`, `36-93`, `137-192`, `204-211`, `229-281` | 迁移 world actors/items/scenes、筛选并迁移 compendium packs，并写回 systemMigrationVersion |

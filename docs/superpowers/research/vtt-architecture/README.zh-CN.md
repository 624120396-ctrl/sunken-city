# VTT 架构研究总入口

## 研究目标

本轮研究只服务《沉没之城》的三类能力：规则拓展、地图/场景、Token/资产。研究结论用于设计后续素材库和轻量地图 MVP，不直接复制第三方源码。

## 执行根目录

本任务按 `C:\Users\29102\Documents\沉没之城\.worktrees\vtt-architecture-research\` 执行。brief 中原先以 `C:\Users\29102\Documents\沉没之城\` 开头的 Task 1 路径，均按相同相对路径机械改写到该 worktree 根目录。

## 源码对象

| 对象 | 本地路径 | 当前版本 | 已核对许可证 | 研究重点 | 许可证风险 |
| --- | --- | --- | --- | --- | --- |
| Foundry DND5E | `.codex-run/vtt-research/dnd5e` | `42f5b20` | `LICENSE.txt`，MIT 文本 | system manifest、规则注册、文档类替换、模块数据 | 可研究架构，谨慎处理内容和素材；brief 未标明 MIT，这里以当前 LICENSE 为准 |
| PlanarAlly | `.codex-run/vtt-research/planarally` | `8249e9a` | `LICENSE`，MIT | Web 地图、Token、光照、视野、权限 | 开源代码只做参考 |
| Owlbear SDK | `.codex-run/vtt-research/owlbear-sdk` | `f408472` | `LICENSE`，MIT | 轻量扩展 API | SDK 可参考接口设计 |
| Owlbear dynamic-fog | `.codex-run/vtt-research/owlbear-dynamic-fog` | `55e22b7` | `LICENSE`，GPL-3.0 文本 | 墙、门、光源、动态雾区 | 示例代码不复制；brief 未写 GPL，后续引用需继续隔离 |
| AboveVTT | `.codex-run/vtt-research/abovevtt` | `4957c0d` | `LICENSE`，AGPL-3.0 文本 | 外部内容库、地图、Token 整合 | AGPL，严禁直接复制进项目 |

## 交付摘要

本研究包给出了规则拓展、地图/场景、Token/资产、资源包导入和《沉没之城》映射方案。后续建议先开发素材资产库 V1 和场景背景/点位 V1，再开发 Token 绑定和规则系统 registry。

## 阶段产物

- `01-rule-extension.zh-CN.md`
- `02-map-scene.zh-CN.md`
- `03-token-asset.zh-CN.md`
- `04-resource-pack-import.zh-CN.md`
- `05-sunken-city-architecture-proposal.zh-CN.md`

## 术语约定

- `RuleSystemManifest`：规则系统清单，声明规则 id、版本、文档类型、能力、入口和可选内容包。
- `RuleContentPackManifest`：规则内容包清单，绑定规则系统并声明版本、内容类型和私有访问边界。
- `SceneAssetPreset`：可复用场景素材预设，引用背景、氛围和叠层资产，并携带默认对象草稿。
- `SceneObjectDraft`：预设或导入阶段的 marker/token/note/fog 草稿对象。
- `SceneObject`：如果后续实现需要通用对象层，用于持久化 generic marker/note/fog 对象。
- `TokenAsset`：可复用 Token 视觉素材记录，引用底层 `ImportedAsset`，不等同于领域实体或场景摆放。
- `SceneTokenInstance`：token 专用摆放实例，绑定 `TokenAsset` 和可选领域实体。
- `ImportedAsset`：本地或私有导入后的统一媒体索引记录，承载来源、文件 metadata、hash 和 licenseNote。

精确 schema 字段、relations、API 返回形状保持后续实现阶段再定，本研究只固定命名边界和职责分层。

## 证据路径说明

各报告中的 `.codex-run/vtt-research/...` 证据路径，都是相对于当前执行检出根目录的本地相对路径；本轮 active checkout root 是 `C:\Users\29102\Documents\沉没之城\.worktrees\vtt-architecture-research\`。这些源码克隆属于本地忽略目录，不随 Git 提交；换到其他 checkout 或 worktree 继续研究时，必须在对应检出根目录下重新创建。

## 当前边界

不研究完整 3D VTT、语音、视频、商业市场、完整战棋自动化。动态光照、墙体视线、复杂碰撞只做产品取舍研究，不进入第一轮实现。

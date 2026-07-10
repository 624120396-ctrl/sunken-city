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

## 阶段产物

- `01-rule-extension.zh-CN.md`
- `02-map-scene.zh-CN.md`
- `03-token-asset.zh-CN.md`
- `04-resource-pack-import.zh-CN.md`
- `05-sunken-city-architecture-proposal.zh-CN.md`

## 当前边界

不研究完整 3D VTT、语音、视频、商业市场、完整战棋自动化。动态光照、墙体视线、复杂碰撞只做产品取舍研究，不进入第一轮实现。

## 交付摘要

Task 1 已建立研究工作区源码索引，后续任务可直接按上表进入对应仓库与许可证边界继续研究。

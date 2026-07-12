# 共享即兴 AVG 舞台 D1-A 契约冻结

日期：2026-07-12

## 结论

D1-A 当前只冻结舞台契约，不进入 Prisma、Socket gateway 或运行时实现。D1-B 在拿到本冻结提交前，不应自行定义共享契约；前端只能消费 `apps/shared/stage/stage-contract.ts` 与 `apps/shared/stage/stage-contract.mock.ts`。

本阶段实际 worktree 为 `C:\Users\29102\.codex\worktrees\d886\sunkencity`，分支为 `codex/shared-stage-d1a-runtime`，基线 HEAD 为 `9f0cc08604299c9fed0ba0645bd86db98905da2c`。

## 冻结交付物

1. `apps/shared/stage/stage-contract.ts`
2. `apps/shared/stage/stage-contract.mock.ts`
3. `docs/shared-stage-d1a-contract-freeze-2026-07-12.zh-CN.md`
4. `apps/server/scripts/stage-contract.test.ts`

## 契约版本

`STAGE_CONTRACT_VERSION = "stage.d1a.v1"`

该版本必须出现在：

- `StageCommandEnvelope.contractVersion`
- `StageCommandAck.contractVersion`
- `StageProjection.contractVersion`
- `StageSnapshot.contractVersion`
- `StageEventSource.contractVersion`
- `StageReplaySource.contractVersion`

## Socket 事件名

所有舞台事件都以 `stage:` 命名空间开头：

- `stage:channel:join`
- `stage:channel:leave`
- `stage:command`
- `stage:command:ack`
- `stage:snapshot`
- `stage:event`
- `stage:error`

客户端不得直接监听或发送未列入 `STAGE_SOCKET_EVENTS` 的舞台事件名。

## REST API 名称

本冻结只定义 API 名称，不代表本提交已经实现路由：

- `GET /api/rooms/:roomId/stage/status`
- `GET /api/rooms/:roomId/stage/channels/:channelId/snapshot`
- `POST /api/rooms/:roomId/stage/enable`
- `POST /api/rooms/:roomId/stage/disable`
- `GET /api/rooms/:roomId/stage/assets/:assetId/proxy`

## 错误码

程序判断只能使用冻结错误码：

- `STAGE_DISABLED`
- `STAGE_CHANNEL_NOT_FOUND`
- `STAGE_FORBIDDEN`
- `STAGE_ACTOR_FORBIDDEN`
- `STAGE_ASSET_FORBIDDEN`
- `STAGE_REVISION_CONFLICT`
- `STAGE_COMMAND_REPLAYED`
- `STAGE_INVALID_PAYLOAD`
- `STAGE_INTERNAL_ERROR`

错误文案可本地化，但不能替代错误码。

## D1-B 集成规则

- D1-B 只消费 `StageProjection`、`StageSnapshot`、`StageCommandEnvelope`、`StageCommandAck` 和 mock snapshot。
- D1-B 不读取 Prisma 模型、后端内部 service 或未裁剪房间状态。
- D1-B 不使用 `isCreator`、前端角色猜测或 URL 推断权限。
- D1-B 的按钮显隐只能依据 `StageCapabilitiesProjection`。
- D1-B 的渲染器只能使用 `assetRefs[].proxyUrl`，不能拼接真实素材路径。
- 私聊与子房间舞台必须以服务端返回的 `StageChannelRef` 为准，不能从前端临时构造 channel 身份。

## Mock 覆盖

`mockStageSnapshots` 固定包含三类轨道：

- `mainRoom`：主房间公开舞台。
- `subRoom`：子房间舞台，包含 `parentChannelId`。
- `privateThread`：私聊舞台，actor visibility 为 `PRIVATE_TARGETS`。

## 后续实现边界

冻结后 D1-A 才能继续：

- Prisma 增量模型与迁移。
- 服务端 capability 投影。
- 独立 stage service/gateway。
- StageChannel 权限裁剪。
- StageEvent、StageSnapshot、不可变源事件和回放源边界。
- 舞台素材授权。
- 功能开关默认关闭、可关闭、可回滚。

本冻结提交不包含这些运行时实现。

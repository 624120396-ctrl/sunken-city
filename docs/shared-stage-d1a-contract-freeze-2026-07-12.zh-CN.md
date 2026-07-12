# 共享即兴 AVG 舞台 D1-A 公共契约冻结修订 v1.1

日期：2026-07-12
状态：`Contract Freeze Amendment`
契约版本：`stage.d1a.v1.1`

## 结论

`stage.d1a.v1.1` 是 D1-A 对 D1-B 的唯一公共集成面。D1-B 只读取：

1. `apps/shared/stage/stage-contract.ts`
2. `apps/shared/stage/stage-contract.mock.ts`

服务端已同步输出该版本的状态、快照、Socket 快照、命令确认和舞台事件；D1-B 不读取 Prisma、server service、房间未裁剪状态，也不从 URL、`isCreator` 或本地角色猜测权限。

## v1.1 修订记录

- 新增 `StageStatusProjection`：包含 `stageEnabled`、全量 capability、当前 viewer 与已在服务端裁剪的 `channels`。
- 新增 `StageChannelProjection`：每条可访问舞台都有 `kind`、`scope`、`status`、`revision` 和 `display`。
- `StageCommandEnvelope` 改为完整 discriminated union；每种命令的精确 payload、可选字段与长度边界由 `STAGE_COMMAND_LIMITS` 固定。
- 新增 `StageEvent` / `StageSocketEventPayload` union，以及 REST、Socket、错误、恢复载荷的公共导出。
- `StageCommandAck` 改为 `APPLIED`、`REPLAYED`、`REJECTED`、`CONFLICT` 四种可区分结果。revision 冲突必含 `latestRevision` 和 `recovery.snapshotUrl`。
- 服务端在 status / snapshot / Socket join 中返回完整 v1.1 结构；Socket join 不再发送临时 `{ pending: true }` 载荷。
- 私密轨道增加最小持久化的 `participantUserIds`，用于服务端裁剪当前成员可见的 `PRIVATE_THREAD` 列表。

## D1-B 必须使用的导出

| 用途 | 公共导出 |
| --- | --- |
| 功能与导航 | `StageStatusProjection`, `StageChannelProjection`, `StageChannelScope`, `StageChannelDisplay` |
| 渲染与恢复 | `StageProjection`, `StageSnapshot`, `StageEvent`, `StageSocketSnapshotPayload`, `StageSocketEventPayload` |
| 交互命令 | `StageCommandEnvelope`, `StageCommandType`, `STAGE_COMMAND_LIMITS`, `StageCommandAck`, `StageCommandRecovery` |
| 网络边界 | `StageStatusResponse`, `StageSnapshotResponse`, `StageSwitchResponse`, `StageAssetProxyResponse`, `StageRestErrorResponse`, `StageSocket*Payload` |
| 固定名与错误 | `STAGE_CONTRACT_VERSION`, `STAGE_SOCKET_EVENTS`, `STAGE_REST_ENDPOINTS`, `STAGE_ERROR_CODES` |
| UI fixture | `mockStageStatus`, `mockStageSnapshots`, `mockStageCommandEnvelope` |

## 状态与轨道

`stageEnabled` 表示全局与房间开关是否允许舞台流量；`enabled` 是兼容读模型，等于 `stageEnabled && capabilities.canUseStage`。按钮和命令可用性仍以完整 `capabilities` 为准。

`channels` 已按当前成员服务端裁剪：

- `ROOM`：主房间舞台；
- `SUB_ROOM`：仅 KP 或当前子房间成员；
- `PRIVATE_THREAD`：仅 KP 或 `participantUserIds` 内成员。

客户端不得自行构造轨道标识，也不得把未列入 `channels` 的轨道展示或订阅。

## 命令 payload 冻结

| commandType | 精确 payload |
| --- | --- |
| `ACTOR_ENTER` | `{ actorId, zone, expression?, action? }` |
| `ACTOR_EXIT` | `{ actorId }` |
| `ACTOR_PERFORM` | `{ actorId, action, expression? }` |
| `SCENE_SET` | `{ title, description?, backgroundAssetId?, bgmAssetId?, ambienceAssetId?, themePackId? }` |
| `SCENE_CLEAR` | `{ clear: 'SCENE' }` |
| `CHANNEL_ENABLE` | `{}` |
| `CHANNEL_DISABLE` | `{}` |

未知字段、未知 commandType、空标识、负 revision、超出 `STAGE_COMMAND_LIMITS` 的文本、以及 PRIVATE 消息没有 `targetUserId` 都会返回 `STAGE_INVALID_PAYLOAD`。所有命令必须包含与当前客户端快照相同的 `expectedRevision`。

示例：

```ts
const command: StageCommandEnvelope = {
  contractVersion: 'stage.d1a.v1.1',
  commandId: 'cmd-perform-1',
  channelId: 'stage-main-room-1',
  expectedRevision: 3,
  commandType: 'ACTOR_PERFORM',
  payload: { actorId: 'actor-pl-1', action: 'nod', expression: 'calm' },
};
```

发生 revision 冲突时，客户端不得重放旧 payload；应请求 `ack.recovery.snapshotUrl`，替换本地 snapshot 后再由用户重新发起操作。

## REST 与 Socket

REST 成功统一为 `{ success: true, data }`，失败统一为 `{ success: false, error }`；`error` 使用 `StageErrorPayload` 和冻结错误码。

Socket 名称仍固定为：

- `stage:channel:join` → `StageSocketJoinChannelPayload`
- `stage:channel:leave` → `StageSocketLeaveChannelPayload`
- `stage:command` → `StageSocketCommandPayload`
- `stage:command:ack` → `StageCommandAck`
- `stage:snapshot` → `StageSocketSnapshotPayload`
- `stage:event` → `StageSocketEventPayload`
- `stage:error` → `StageSocketErrorPayload`

`PRIVATE_TARGETS` 事件仅发送给 `targetUserIds` 中的成员（其中包含操作者与私信接收者）；不得把该事件广播给整条轨道。

## 迁移与兼容性

这是有意的冻结修订，不是前端临时兼容层：D1-B 必须升级到 `stage.d1a.v1.1`，不能发送 v1.0 envelope，也不能继续假设 Socket snapshot 为 pending 标记。

数据库迁移 `20260712103000_stage_contract_v1_1` 为 `StageChannel` 增加 `participantUserIds`（JSON 字符串，默认 `[]`）。`20260712113000_stage_runtime_integrity` 则补上非空 `scopeKey`，修复 SQLite 对 nullable composite unique 不约束多个 MAIN_ROOM 的问题；现存重复主轨道被保留为 `legacy-main:<id>`，不会再被投影为当前主舞台。现存私密轨道在回填参与者前只会对具备 `canManageStage` 的 KP 可见；这是一项保守访问控制，不会把私密轨道泄露给普通成员。

素材 `proxyUrl` 只可由受权的短期投递服务生成（`STAGE_ASSET_DELIVERY_BASE_URL` 与 `STAGE_ASSET_DELIVERY_SECRET`）；未配置时服务端返回冻结错误，不会用 API 自指 URL 或 storage key 伪装为素材地址。

v1.0 的 `enabled` 保留为派生兼容字段，但所有新界面必须读取 `stageEnabled`、`capabilities` 与 `channels`。

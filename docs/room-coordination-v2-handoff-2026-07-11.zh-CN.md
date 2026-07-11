# 《沉没之城》开团协作 V2 交接

## 结论

本专项在已创建的站内房间中增加候选时间投票层。候选投票与正式场次、正式出席确认保持分离；KP 最终选定候选后，服务端在同一事务中写入 `RoomNextSession(status=SCHEDULED)`、最终化投票并重置正式出席确认为 `PENDING`。

本轮不部署生产，不包含站外活动排期、信誉分、日历 OAuth、后台定时任务或新 Socket 协议。

## 数据模型与迁移

独立迁移：`apps/server/prisma/migrations/20260710120000_add_room_schedule_polls/migration.sql`。

- `RoomSchedulePoll`：房间、标题、说明、IANA timezone、`OPEN/FINALIZED/CANCELLED`、截止时间、最终候选、创建者和时间戳。
- `RoomScheduleOption`：候选开始/结束 UTC 时间与顺序。
- `RoomScheduleVote`：候选、用户、`AVAILABLE/TENTATIVE/UNAVAILABLE`、备注；未记录按 `PENDING` 聚合。
- 房间删除通过 cascade 清理 poll、option、vote；取消投票保留历史。
- SQLite 未使用 partial unique index。创建事务先对 Room 做串行化写锁，再检查一个房间是否已有 `OPEN` poll。

生产启用前必须执行该 migration，并重新生成 Prisma Client。

## 接口

接口均挂在现有 `/api/rooms/:roomId/coordination`：

- `GET/POST /schedule-polls`
- `PUT /schedule-polls/:pollId`
- `PUT /schedule-polls/:pollId/my-votes`
- `POST /schedule-polls/:pollId/close`
- `POST /schedule-polls/:pollId/cancel`
- `POST /schedule-polls/:pollId/finalize`
- `POST /schedule-polls/:pollId/remind-pending`
- `GET /next-session.ics`

## 权限

- 读取、投票、ICS：服务端必须通过 `canViewPublicContent`，非成员不能访问。
- 创建、编辑未投票候选、截止、取消、最终选定、提醒：`canUseKPTools || canManageMembers`。
- 权限不读取 `isCreator`，也不从角色名称猜测。
- 已有投票的候选不能改时间或删除；无投票候选可编辑。

## 时间与排序

- 候选数量 2-8；输入 ISO datetime，Prisma 保存 UTC。
- 候选开始必须在未来，结束晚于开始；同一投票不允许重复起止区间。
- timezone 必须为有效 IANA timezone；前端按该 timezone 将 `datetime-local` 转为 UTC并回填显示，不依赖设备时区；夏令时不存在或重复的本地时间会被拒绝。
- 截止时间必须晚于当前时间且早于最早候选开始时间；KP 也可手动截止。
- 推荐顺序为：可参加更多、不可参加更少、待定更多、未回复更少、开始更早。系统只标记推荐，不自动最终化。

## 正式时间收口

投票写入、候选编辑和最终化事务都以 `status=OPEN` 条件写作为第一条数据库操作，消除检查与写入之间的并发窗口；Prisma 写冲突映射为 409。最终化事务内：

1. 校验 poll、room 和 option 归属。
2. poll 更新为 `FINALIZED` 并保存 `finalizedOptionId`。
3. upsert `RoomNextSession`，使用候选开始、poll timezone/title/note，状态固定为 `SCHEDULED`。
4. 删除旧 `RoomAttendanceConfirmation`，为房间拥有者和活跃成员重建 `PENDING`。

投票结果不会直接成为正式出席状态，成员仍需再次确认。

## 通知与 ICS

- 最终选定、已有正式时间后的改期、取消和 KP 手动提醒复用现有通知表与发送辅助，时间按 poll timezone 展示。
- 未新增 Socket event；实时通知继续走现有通知服务内部能力。
- 提醒对象为尚未对全部候选完成回复的成员。
- `.ics` 仅成员可下载，前端通过带 Bearer token 的 `apiFetch` 获取；只导出未取消且已确定时间的正式场次。由 poll 最终化的场次使用候选结束时间；手工正式场次没有结束时间时回退 4 小时。

## UI 入口

- PC：现有右侧工具台增加“开团排期”，进入调查档案的“准备”页；排期面板与原 `SessionPrepPanel` 同区展示。
- 移动端：KP 与 PL 的现有工具抽屉均增加“排期”，不占聊天输入、投骰或语音控制。
- 面板支持创建/编辑 2-8 候选、逐候选投票、统计与推荐、截止/提醒/取消/最终选定、历史回看和 ICS 下载。
- 房间运营摘要和房间列表显示进行中排期、候选数、截止时间和待回复人数；已有正式 `nextSession` 继续保留。

## 验证与限制

已规划并执行的边界仅包括新增纯逻辑、权限能力、通知/ICS、前端摘要测试，Prisma validate/generate，server/web typecheck 和必要 build；未执行全站 E2E、深度 Playwright、全量视觉回归或生产写入冒烟。

### 2026-07-11 独立审计修正

- 已截止或到期但仍为 `OPEN` 的 poll，服务端普通 update 返回 409；前端不再显示“编辑”。本轮没有增加 reopen 操作。
- `RoomOperationsOverviewPanel` 的“下次开团”始终以正式 `RoomNextSession` 和正式出席统计为主信息；进行中 poll 仅作为候选数、待回复数和截止时间副信息。
- `createRoomSchedulePoll` 与其他事务写入口一致，将 Prisma `P2034` 映射为 409。
- 新增 `apps/server/scripts/room-schedule-poll.service.test.ts`，使用临时 SQLite 副本和真实 Prisma/handler 路径覆盖：非成员 403、管理能力、候选归属、截止后 update/vote 409、最终化事务重置正式出席、并发 create/finalize、P2034 映射、ICS 成员鉴权。
- 新增前端行为断言，覆盖截止后不可普通编辑，以及运营摘要不以 schedule poll 覆盖正式场次。

已知限制：

- 没有后台定时任务；到期后由接口判定不可投票，通知依赖 KP 手动提醒。
- `RoomNextSession` 没有 `endsAt`；ICS 通过最终候选关联恢复结束时间，否则使用 4 小时回退值。
- 一个 OPEN poll 的强约束依赖当前 SQLite 单写部署与服务事务；未来切换多写数据库时应升级为数据库约束。

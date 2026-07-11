# 开团协作 V2（站内房间排期）设计文档

## 结论

V2 只在“已创建的站内房间”内新增候选时间投票层。它不替代 Phase 5 已有的 `RoomNextSession` 和 `RoomAttendanceConfirmation`，而是在 KP 最终选定候选后，事务化写入正式下次开团时间，并把正式出席确认重置为 `PENDING`。

## 已读基线

- `AGENT.md`：当前唯一主仓库为 `Y:\sunkencity`，本轮在隔离工作树中开发；不得服务器直接改后端。
- `PRD.md`：房间身份、权限、生命周期、角色锁、结算与报告权限已完成兼容式升级；默认不做深度测试。
- `docs/superpowers/plans/2026-07-05-sunken-city-master-iteration-roadmap.zh-CN.md`：开团协作基础能力已完成，后续只做必要窄范围打磨，不能重写后端契约。
- `docs/superpowers/plans/2026-07-05-sunken-city-room-coordination-phase5.zh-CN.md`：已有下次开团时间、正式出席确认、公告和 `/coordination` REST 路由。
- `docs/superpowers/plans/2026-07-05-sunken-city-room-operations-overview.zh-CN.md`：运营总览只读聚合现有协作状态。
- `docs/room-system-main-thread-handoff-2026-07-09.md`、`docs/room-system-web-final-handoff-2026-07-08.zh-CN.md`、`docs/room-visual-release-freeze-2026-07-08.zh-CN.md`：房间桌面端和移动端已定版，本轮只加必要入口。

## 范围

本轮做：

- 一个房间最多一个 `OPEN` 排期投票，历史 `FINALIZED` / `CANCELLED` 可回看。
- KP 创建 2-8 个候选时间段，保存 UTC，显示创建者选择的 IANA timezone。
- 活跃成员对每个候选投 `AVAILABLE` / `TENTATIVE` / `UNAVAILABLE`；未提交显示为 `PENDING`。
- 自动统计每个候选的可参加、待定、不可参加、未回复人数，并给排序建议。
- KP 最终选定后写入现有 `RoomNextSession(status=SCHEDULED)`，并把现有 `RoomAttendanceConfirmation` 重置为 `PENDING`。
- 最终选定、取消、改期、提醒未回复成员复用现有通知系统。
- 为正式 `RoomNextSession` 提供成员鉴权 `.ics` 下载。
- 房间内工具区、移动端工具抽屉、房间列表和运营总览显示排期摘要。

不做：

- 后台/admin。
- 站外/线下通用活动排期。
- 未建房招募排期系统。
- 公开信誉分、评分、跨平台日历 OAuth。
- Socket 协议、骰点、战斗、私聊、生命周期、结算、语音、AI 面板改造。

## 数据模型

新增独立迁移 `20260710120000_add_room_schedule_polls`：

- `RoomSchedulePoll`
  - `roomId`：内部 `Room.id`。
  - `title`、`note`。
  - `timezone`：创建者选择的 IANA timezone，默认 `Asia/Shanghai`。
  - `status`：`OPEN` / `FINALIZED` / `CANCELLED`。
  - `closesAt`：可为空；为空表示 KP 手动关闭。
  - `finalizedOptionId`：最终选定候选。
  - `createdById`。
  - timestamps。
- `RoomScheduleOption`
  - `pollId`、`startsAt`、`endsAt`、`position`。
- `RoomScheduleVote`
  - `optionId`、`userId`、`status`、`note`。
  - `status` 为 `AVAILABLE` / `TENTATIVE` / `UNAVAILABLE`。

SQLite 不使用 partial unique index。一个房间一个 `OPEN` poll 由服务层事务检查保证。

## 权限

- 读取：必须通过 `requireRoomCapability(roomId, userId, 'canViewPublicContent')`，非成员不能读取。
- 投票：同读取权限，且只允许当前用户写自己的 vote。
- 管理：优先使用 `auth.capabilities.canUseKPTools || auth.capabilities.canManageMembers`。不从角色字符串硬编码权限，不使用 `isCreator` 或页面局部状态猜权限。
- `.ics`：同读取权限，只暴露已确定的正式 `RoomNextSession`。

## 时间规则

- API 输入均使用 ISO datetime；服务端以 `Date` 写入 UTC。
- 前端 `datetime-local` 按表单所选 IANA timezone 转换为 UTC，不按设备时区猜测；夏令时不存在或重复的墙上时间直接要求重新选择。
- `timezone` 必须通过 `Intl.DateTimeFormat(undefined, { timeZone })` 校验。
- 候选数量必须 2-8。
- 每个候选必须 `startsAt < endsAt`。
- `startsAt` 必须晚于当前服务端时间，不能创建已经开始的候选。
- 同一 poll 内候选不能重复，重复定义为 `startsAt.getTime()` 和 `endsAt.getTime()` 相同。
- `closesAt` 可为空；若存在，必须晚于当前服务端时间，且早于最早候选开始时间。
- 夏令时不自行换算显示文本；前端使用保存的 IANA timezone 交给 `Intl.DateTimeFormat` 显示。

## 排序建议

候选排序只推荐，不自动替 KP 决定。排序规则：

1. `AVAILABLE` 多者优先。
2. `UNAVAILABLE` 少者优先。
3. `TENTATIVE` 多者优先。
4. `PENDING` 少者优先。
5. 开始时间更早者优先。

每个 option 返回：

- `summary.available`
- `summary.tentative`
- `summary.unavailable`
- `summary.pending`
- `recommendationRank`
- `isRecommended`

## 最终化事务

最终化必须在 Prisma transaction 内完成：

1. 读取 poll、options、votes、room。
2. 确认 poll 属于当前 room 且 status 为 `OPEN`。
3. 确认 option 属于 poll。
4. 更新 poll 为 `FINALIZED` 并写 `finalizedOptionId`。
5. `upsert RoomNextSession`：`scheduledAt = option.startsAt`，`timezone = poll.timezone`，`title = poll.title`，`note = poll.note`，`status = SCHEDULED`。
6. 删除或重置当前 room 的 `RoomAttendanceConfirmation`，为活跃成员 upsert `PENDING`。
7. 事务成功后发送站内通知。

最终化事务的第一条数据库操作是对 `OPEN` poll 的条件写锁；若并发最终化，第二个请求会发现 poll 已非 `OPEN` 并返回 409，Prisma 写冲突也映射为 409。

## 通知

复用 `room-notifications.service.ts` 与 `Notification` 表，不新增 Socket 协议。

- 最终选定：通知房间成员，提示正式时间已确定，需要重新确认正式出席。
- 取消：通知房间成员，提示投票已取消。
- 改期：当已存在正式 `RoomNextSession` 后又通过新 poll finalized 覆盖，通知文案使用改期。
- 手动提醒未回复：KP 点击后通知尚未完成全部候选回复的成员。

## ICS

新增成员鉴权接口：

- `GET /api/rooms/:roomId/coordination/next-session.ics`

规则：

- 只导出未取消且 `scheduledAt` 非空的正式 `RoomNextSession`。
- `DTSTART` 使用 UTC。
- `DTEND` 优先使用最终候选的结束时间；正式场次不是由排期投票生成时，首版按 4 小时默认时长生成。
- `SUMMARY` 使用 `RoomNextSession.title` 或房间名。
- 不做 Google/Outlook OAuth。

## 前端入口

- PC：复用现有房间运营/准备工具区，新增 `RoomSchedulePollPanel`，并让 `RoomOperationsOverviewPanel` 展示 active poll 摘要。
- 移动端：放进现有工具抽屉；打开后使用现有侧边工具抽屉容器，不占聊天输入、骰点和语音控制。
- 房间列表：`RoomListStoryCard` 增加进行中排期 badge：候选数量、截止时间、待回复人数。正式时间仍继续显示现有 `nextSession`。

## 自审

- 范围自审：没有引入站外/线下通用排期、信誉分、OAuth、Socket 或后台。
- 复用自审：正式场次仍写入 `RoomNextSession`，正式确认仍使用 `RoomAttendanceConfirmation`。
- 权限自审：读取/投票/管理全部从 `requireRoomCapability` 和 capability 来，不使用 `isCreator`。
- 时间自审：过去时间、重复候选、夏令时显示、截止时间和并发最终化都有明确规则。
- 风险自审：SQLite 单 OPEN poll 依赖事务检查；在单实例 Express + SQLite 当前部署形态下可接受，未来多写入实例再补数据库级约束。

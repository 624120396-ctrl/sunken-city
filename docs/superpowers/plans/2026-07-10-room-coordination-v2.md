# Room Coordination V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为已创建的站内房间新增候选时间投票，并在 KP 最终选择后收口到现有正式下次开团时间与正式出席确认。

**Architecture:** 新增 `RoomSchedulePoll` / `RoomScheduleOption` / `RoomScheduleVote` 作为候选投票层，REST 接口挂在现有 `/api/rooms/:roomId/coordination/*` 下。正式时间仍使用 `RoomNextSession`，正式出席确认仍使用 `RoomAttendanceConfirmation`，通知复用现有 `Notification` 与 Socket 推送辅助，不新增 Socket 协议。

**Tech Stack:** Express + Prisma + SQLite + Zod，React 18 + TypeScript + Vite，Node test scripts，现有 room capability contract。

## Global Constraints

- 当前唯一主仓库：`Y:\sunkencity`；本任务工作树基线为 `e68a515`。
- 不部署生产。
- 不做深度测试、全站 E2E、深度 Playwright、全量视觉回归或生产写入冒烟。
- 不改后台/admin、站外/线下通用排期、信誉分、OAuth、Socket、骰点、战斗、私聊、生命周期、结算、语音、AI。
- 权限必须围绕 `myRole`、`myCapabilities`、`myBinding`、`lifecycle` 和服务端 capability；禁止用 `isCreator` 猜权限。
- 新 Prisma migration 独立可审计，不触碰现有生命周期或结算表语义。

---

## File Structure

Create:

- `apps/server/prisma/migrations/20260710120000_add_room_schedule_polls/migration.sql`
- `apps/server/src/modules/rooms/room-schedule-poll.logic.ts`
- `apps/server/src/modules/rooms/room-schedule-poll.service.ts`
- `apps/server/scripts/room-schedule-poll.logic.test.ts`
- `apps/server/scripts/room-schedule-notifications-ics.test.ts`
- `apps/web/src/pages/rooms/components/RoomSchedulePollPanel.tsx`
- `apps/web/scripts/room-schedule-summary.test.ts`

Modify:

- `apps/server/prisma/schema.prisma`
- `apps/server/src/modules/rooms/room-notifications.service.ts`
- `apps/server/src/modules/rooms/room-coordination.routes.ts`
- `apps/server/src/modules/rooms/room-overview.service.ts`
- `apps/web/src/types/room-coordination-contract.ts`
- `apps/web/src/types/room-overview-contract.ts`
- `apps/web/src/services/room-coordination.service.ts`
- `apps/web/src/pages/rooms/components/RoomOperationsOverviewPanel.tsx`
- `apps/web/src/pages/rooms/components/RoomListStoryCard.tsx`
- `apps/web/src/pages/rooms/RoomPage.tsx`

## Task 1: Poll Logic and Tests

**Files:**

- Create: `apps/server/src/modules/rooms/room-schedule-poll.logic.ts`
- Create: `apps/server/scripts/room-schedule-poll.logic.test.ts`

**Interfaces:**

- Produces: `validateSchedulePollInput(input, now)`, `buildOptionSummaries(options, votes, activeMemberIds)`, `sortScheduleOptions(options)`, `buildCalendarFile(input)`.

- [ ] Write failing tests for 2-8 candidates, invalid timezone, past candidates, duplicate candidates, deadline validation, pending member counts, and recommendation sorting.
- [ ] Run `node --test --experimental-strip-types apps/server/scripts/room-schedule-poll.logic.test.ts` and confirm RED.
- [ ] Implement the pure helpers.
- [ ] Run the same test and confirm GREEN.

## Task 2: Prisma Models and Migration

**Files:**

- Modify: `apps/server/prisma/schema.prisma`
- Create: `apps/server/prisma/migrations/20260710120000_add_room_schedule_polls/migration.sql`

**Interfaces:**

- Produces Prisma delegates: `roomSchedulePoll`, `roomScheduleOption`, `roomScheduleVote`.

- [ ] Add User and Room relations.
- [ ] Add `RoomSchedulePoll`, `RoomScheduleOption`, `RoomScheduleVote`.
- [ ] Create SQL migration with cascade delete and indexes for room/status, poll/position, option/user.
- [ ] Run `cd apps/server; npx prisma validate --schema prisma/schema.prisma`.

## Task 3: Notifications and ICS Tests

**Files:**

- Modify: `apps/server/src/modules/rooms/room-notifications.service.ts`
- Create: `apps/server/scripts/room-schedule-notifications-ics.test.ts`

**Interfaces:**

- Produces: `buildSchedulePollFinalizedNotification`, `buildSchedulePollCancelledNotification`, `buildSchedulePollReminderNotification`.
- Consumes: `buildCalendarFile` from Task 1.

- [ ] Write failing tests for finalized, cancelled, reminder notifications and `.ics` UTC fields.
- [ ] Run `node --test --experimental-strip-types apps/server/scripts/room-schedule-notifications-ics.test.ts` and confirm RED.
- [ ] Add notification builders and ICS helper implementation.
- [ ] Run the test and confirm GREEN.

## Task 4: Backend Coordination APIs

**Files:**

- Create: `apps/server/src/modules/rooms/room-schedule-poll.service.ts`
- Modify: `apps/server/src/modules/rooms/room-coordination.routes.ts`

**Interfaces:**

- Produces:
  - `GET /:roomId/coordination/schedule-polls`
  - `POST /:roomId/coordination/schedule-polls`
  - `PUT /:roomId/coordination/schedule-polls/:pollId`
  - `PUT /:roomId/coordination/schedule-polls/:pollId/my-votes`
  - `POST /:roomId/coordination/schedule-polls/:pollId/close`
  - `POST /:roomId/coordination/schedule-polls/:pollId/finalize`
  - `POST /:roomId/coordination/schedule-polls/:pollId/cancel`
  - `POST /:roomId/coordination/schedule-polls/:pollId/remind-pending`
  - `GET /:roomId/coordination/next-session.ics`

- [ ] Add Zod schemas for create/update/vote/finalize.
- [ ] Add mappers that include option summaries and `canManageSchedulePoll`.
- [ ] Implement list/create/update/vote/cancel/remind handlers with capability checks.
- [ ] Implement finalize inside `prisma.$transaction`.
- [ ] Implement authenticated ICS handler.
- [ ] Run server narrow tests and `npm run typecheck`.

## Task 5: Overview and Room List Summary

**Files:**

- Modify: `apps/server/src/modules/rooms/room-overview.service.ts`
- Modify: `apps/web/src/types/room-overview-contract.ts`
- Modify: `apps/web/src/pages/rooms/components/RoomOperationsOverviewPanel.tsx`
- Modify: `apps/web/src/pages/rooms/components/RoomListStoryCard.tsx`
- Create: `apps/web/scripts/room-schedule-summary.test.ts`

**Interfaces:**

- Produces overview fields: `coordination.schedulePoll`.

- [ ] Write a web script test for candidate count, deadline label fallback, pending count, and active poll badge text.
- [ ] Run `node --test --experimental-strip-types apps/web/scripts/room-schedule-summary.test.ts` and confirm RED.
- [ ] Add summary fields to server overview and web contracts.
- [ ] Show active poll summary in operations overview and room list card without hiding existing `nextSession`.
- [ ] Run the web script test and typecheck.

## Task 6: Room UI Panel

**Files:**

- Create: `apps/web/src/pages/rooms/components/RoomSchedulePollPanel.tsx`
- Modify: `apps/web/src/services/room-coordination.service.ts`
- Modify: `apps/web/src/types/room-coordination-contract.ts`
- Modify: `apps/web/src/pages/rooms/RoomPage.tsx`

**Interfaces:**

- Consumes Task 4 API routes.

- [ ] Add frontend contract and API functions.
- [ ] Build `RoomSchedulePollPanel` with create, member voting, KP finalize/cancel/remind and ICS link.
- [ ] Mount on PC in existing tool drawer.
- [ ] Add mobile tool drawer tile that opens the same side tool drawer panel.
- [ ] Run `cd apps/web; npm run typecheck`.

## Task 7: Final Verification and Commit

**Files:**

- All changed files.

- [ ] Run narrow server tests:
  - `node --test --experimental-strip-types apps/server/scripts/room-schedule-poll.logic.test.ts`
  - `node --test --experimental-strip-types apps/server/scripts/room-schedule-notifications-ics.test.ts`
  - `node --test --experimental-strip-types apps/server/scripts/room-notifications.test.ts`
  - `node --test --experimental-strip-types apps/server/scripts/room-launch-readiness.test.ts`
- [ ] Run web schedule test.
- [ ] Run `cd apps/server; npm run typecheck`.
- [ ] Run `cd apps/web; npm run typecheck`.
- [ ] Run `git diff --check`.
- [ ] Commit with AGENT trailers and push to `codex/frontend-system-v2-phase1` if branch state permits.

## Self-Review

- Spec coverage: 2-8 candidates, one OPEN poll, member-only vote/read, capability-based KP management, ranking, finalize to `RoomNextSession`, reset attendance, notifications, ICS, overview/list/UI entry, cleanup by cascade, transaction and time edges are mapped to tasks.
- Placeholder scan: no TBD/TODO/fill-in placeholders remain.
- Type consistency: server statuses are `OPEN/FINALIZED/CANCELLED` and `AVAILABLE/TENTATIVE/UNAVAILABLE`; formal attendance remains `PENDING/AVAILABLE/LEAVE/TENTATIVE`.

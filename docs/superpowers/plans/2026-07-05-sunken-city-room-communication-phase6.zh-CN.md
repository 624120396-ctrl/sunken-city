# Sunken City Room Communication Phase 6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为房间增加“当前沟通焦点 + 发言/行动轮候队列”的最小可用能力，缓解线上抢话、沉默、分心和不知道轮到谁的问题。

**Architecture:** Phase 6 使用独立旁路表和 `/api/rooms/:roomId/communication/*` REST 路由，不接入 Socket，不改变聊天、骰点、战斗、私聊、生命周期或结算契约。PL / OBSERVER / KP 可查看公开沟通状态，PL 可把自己加入轮候队列，KP 可管理队列、设置当前焦点和发起温和点名提示。

**Tech Stack:** Express + Prisma + SQLite + Zod，React 18 + TypeScript + Vite，复用 `requireRoomCapability`、`apiFetch`、房间页最小面板。

---

## 0. Scope Guard

本计划只做 Phase 6 第一版：

- 当前沟通焦点：当前话题、当前 spotlight 成员、KP 提示。
- 发言 / 行动轮候队列：`SPEAK` / `ACTION` / `CHECK_IN`。
- “轮到谁”轻提示：用队列中的 `ACTIVE` 项表达。
- KP 温和提醒：通过 `CHECK_IN` 队列项提醒某个成员回应。
- 开场前环境检查：保存为公开 checklist 文本数组，第一版只展示和勾选，不做设备检测。

本计划不做：

- 语音、麦克风检测、实时在线检测。
- 自动判断沉默玩家。
- AI 节奏建议。
- Socket 事件和实时推送。
- 战斗行动自动化。
- UI/UX 视觉重构。

2026-07-08 更新：

- 上述“语音、麦克风检测、实时在线检测”仍不属于 Phase 6。
- 真人房间实时语音已转入后续独立专项 `房间实时语音频道 V1`。
- 启动顺序：等待房间移动端专项和非房间全站 UI/UX 完成后，再评估 LiveKit / TURN / coturn 与网络验证。
- AI 语音、TTS、STT、录音、转写和跨房间语音大厅仍不进入该专项第一版。

## 1. File Structure

### Create

- `apps/server/prisma/migrations/20260705150000_add_room_communication/migration.sql`
- `apps/server/src/modules/rooms/room-communication.service.ts`
- `apps/server/src/modules/rooms/room-communication.routes.ts`
- `apps/web/src/types/room-communication-contract.ts`
- `apps/web/src/services/room-communication.service.ts`
- `apps/web/src/pages/rooms/components/RoomCommunicationPanel.tsx`

### Modify

- `apps/server/prisma/schema.prisma`
- `apps/server/src/index.ts`
- `apps/web/src/pages/rooms/RoomPage.tsx`

---

## 2. Data Model

Add two models:

```prisma
model RoomCommunicationState {
  id                   String   @id @default(uuid())
  roomId               String   @unique
  currentTopic         String   @default("")
  spotlightUserId      String?
  keeperPrompt         String   @default("")
  environmentChecklist String   @default("[]")
  updatedById          String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  room                 Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
}

model RoomActionQueueItem {
  id              String   @id @default(uuid())
  roomId          String
  kind            String   @default("SPEAK")
  status          String   @default("WAITING")
  label           String
  note            String   @default("")
  requesterUserId String?
  targetUserId    String?
  createdById     String
  resolvedById    String?
  sortOrder       Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  room            Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, status, sortOrder])
  @@index([roomId, createdAt])
}
```

Also add to `Room`:

```prisma
  communicationState RoomCommunicationState?
  actionQueueItems RoomActionQueueItem[]
```

## 3. Backend API

Routes:

- `GET /api/rooms/:roomId/communication`
- `PUT /api/rooms/:roomId/communication/state`
- `POST /api/rooms/:roomId/communication/queue`
- `PATCH /api/rooms/:roomId/communication/queue/:itemId`
- `DELETE /api/rooms/:roomId/communication/queue/:itemId`

Permissions:

- Read: `canViewPublicContent`
- Player self enqueue: `canViewPublicContent`, but `createdById` must be current user.
- KP manage state / status / delete / check-in for others: `canUseKPTools`
- Non-KP may only cancel their own waiting item.

## 4. Frontend

`RoomCommunicationPanel` should:

- Load communication state and queue on mount.
- Show current topic, spotlight member and KP prompt.
- Let PL add a “我想发言 / 我想行动” queue item.
- Let KP set current topic, spotlight member and environment checklist.
- Let KP mark queue items as `ACTIVE`, `DONE`, or `CANCELLED`.
- Keep styling minimal and consistent with existing room utility panels.

## 5. Light Verification

Run only targeted checks:

```powershell
Set-Location apps/server
npx prisma validate --schema prisma/schema.prisma
npm run typecheck
Set-Location ..\web
npm run typecheck
Set-Location ..\..
git diff --check
```

Apply local migration only after backing up local SQLite:

```powershell
Copy-Item "$env:LOCALAPPDATA\SunkenCity\dev.db" "$env:LOCALAPPDATA\SunkenCity\dev.before-room-communication-20260705.db"
Set-Location apps/server
npx prisma migrate deploy --schema prisma/schema.prisma
```

Do not run deep Playwright, production write smoke, full visual regression, or paid AI calls by default.

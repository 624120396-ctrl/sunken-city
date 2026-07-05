# Sunken City Room Coordination Phase 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为房间增加“下次开团时间、成员参加确认、KP 房间公告”的最小可用开团协作能力，降低网团改期、忘记开团和参与状态不清楚的问题。

**Architecture:** Phase 5 使用独立的房间协作数据表和 `/api/rooms/:roomId/coordination/*` 路由，不改现有房间生命周期、Socket、骰点、战斗、私聊或结算契约。权限继续依赖 `requireRoomCapability` 和 capability contract：成员可查看公开协作信息，KP 可管理排期和公告，成员只能更新自己的参加状态。

**Tech Stack:** Express + Prisma + SQLite + Zod，React 18 + TypeScript + Vite，复用现有房间页、`apiFetch`、`RoomCapabilities` 和最小可用面板组件。

---

## 0. Scope Guard

本计划只覆盖 Phase 5 的第一版：

- 下次开团时间。
- 成员参加确认：`PENDING` / `AVAILABLE` / `LEAVE` / `TENTATIVE`。
- KP 房间公告。
- 房间内最小可用面板。

本计划明确不做：

- 后台 admin。
- 站内推送、短信、邮件或真实通知发送。
- 日历订阅。
- 招募页、申请入团和风格匹配。
- AI、Seedream、语音、TTS、STT。
- 房间生命周期、Socket 事件、骰点、战斗、私聊、结算写回。
- UI/UX 全面视觉重构。

## 1. File Structure

### Create

- `apps/server/prisma/migrations/20260705140000_add_room_coordination/migration.sql`
- `apps/server/src/modules/rooms/room-coordination.service.ts`
- `apps/server/src/modules/rooms/room-coordination.routes.ts`
- `apps/web/src/types/room-coordination-contract.ts`
- `apps/web/src/services/room-coordination.service.ts`
- `apps/web/src/pages/rooms/components/RoomCoordinationPanel.tsx`

### Modify

- `apps/server/prisma/schema.prisma`
- `apps/server/src/index.ts`
- `apps/web/src/pages/rooms/RoomPage.tsx`

### Optional Later, Not In This Plan

- `apps/web/src/pages/rooms/RoomListPage.tsx`

房间列表显示“下次开团”和“未确认成员”属于有用增强，但当前工作区已有 UI/UX 线程对 `RoomListPage.tsx` 的未提交改动。本计划第一版先只放进房间内，避免混入 UI/UX 线程改动。

---

## Task 1: Prisma Models and Migration

**Files:**
- Modify: `apps/server/prisma/schema.prisma`
- Create: `apps/server/prisma/migrations/20260705140000_add_room_coordination/migration.sql`

- [ ] **Step 1: Add relations to `Room`**

In `apps/server/prisma/schema.prisma`, add these relations inside `model Room`:

```prisma
  nextSession RoomNextSession?
  attendanceConfirmations RoomAttendanceConfirmation[]
  roomAnnouncements RoomAnnouncement[]
```

- [ ] **Step 2: Add Phase 5 models**

Add the models near the other room investigation / continuity models:

```prisma
model RoomNextSession {
  id          String   @id @default(uuid())
  roomId      String   @unique
  scheduledAt DateTime?
  timezone    String   @default("Asia/Shanghai")
  title       String   @default("")
  note        String   @default("")
  status      String   @default("SCHEDULED")
  updatedById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  room        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([scheduledAt])
  @@index([status])
}

model RoomAttendanceConfirmation {
  id          String   @id @default(uuid())
  roomId      String
  userId      String
  status      String   @default("PENDING")
  note        String   @default("")
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  room        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([roomId, userId])
  @@index([roomId, status])
}

model RoomAnnouncement {
  id          String   @id @default(uuid())
  roomId      String
  title       String   @default("")
  content     String
  isPinned    Boolean  @default(true)
  createdById String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  room        Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  createdBy   User     @relation(fields: [createdById], references: [id], onDelete: Cascade)

  @@index([roomId, isPinned])
  @@index([roomId, createdAt])
}
```

- [ ] **Step 3: Add User relations**

In `model User`, add:

```prisma
  roomAttendanceConfirmations RoomAttendanceConfirmation[]
  roomAnnouncements RoomAnnouncement[]
```

- [ ] **Step 4: Create SQL migration**

Create `apps/server/prisma/migrations/20260705140000_add_room_coordination/migration.sql`:

```sql
CREATE TABLE "RoomNextSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "scheduledAt" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Shanghai',
    "title" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomNextSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoomAttendanceConfirmation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RoomAttendanceConfirmation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomAttendanceConfirmation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "RoomAnnouncement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RoomAnnouncement_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RoomAnnouncement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RoomNextSession_roomId_key" ON "RoomNextSession"("roomId");
CREATE INDEX "RoomNextSession_scheduledAt_idx" ON "RoomNextSession"("scheduledAt");
CREATE INDEX "RoomNextSession_status_idx" ON "RoomNextSession"("status");
CREATE UNIQUE INDEX "RoomAttendanceConfirmation_roomId_userId_key" ON "RoomAttendanceConfirmation"("roomId", "userId");
CREATE INDEX "RoomAttendanceConfirmation_roomId_status_idx" ON "RoomAttendanceConfirmation"("roomId", "status");
CREATE INDEX "RoomAnnouncement_roomId_isPinned_idx" ON "RoomAnnouncement"("roomId", "isPinned");
CREATE INDEX "RoomAnnouncement_roomId_createdAt_idx" ON "RoomAnnouncement"("roomId", "createdAt");
```

- [ ] **Step 5: Validate schema**

Run:

```powershell
Set-Location apps/server
npx prisma validate --schema prisma/schema.prisma
```

Expected: Prisma schema is valid.

---

## Task 2: Backend Coordination Service

**Files:**
- Create: `apps/server/src/modules/rooms/room-coordination.service.ts`

- [ ] **Step 1: Create shared types and schemas**

Create `room-coordination.service.ts` with:

```ts
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';

const attendanceStatuses = ['PENDING', 'AVAILABLE', 'LEAVE', 'TENTATIVE'] as const;

const nextSessionSchema = z.object({
  scheduledAt: z.string().datetime().nullable().optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  title: z.string().trim().max(120).optional(),
  note: z.string().trim().max(2000).optional(),
  status: z.enum(['SCHEDULED', 'RESCHEDULED', 'CANCELLED']).optional(),
});

const attendanceSchema = z.object({
  status: z.enum(attendanceStatuses),
  note: z.string().trim().max(500).optional(),
});

const announcementSchema = z.object({
  title: z.string().trim().max(120).optional(),
  content: z.string().trim().min(1).max(3000),
  isPinned: z.boolean().optional(),
});
```

- [ ] **Step 2: Add mappers**

Add:

```ts
function mapNextSession(session: {
  id: string;
  scheduledAt: Date | null;
  timezone: string;
  title: string;
  note: string;
  status: string;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...session,
    scheduledAt: session.scheduledAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function mapAttendance(entry: {
  id: string;
  userId: string;
  status: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  user?: { nickname: string | null; email: string };
}) {
  return {
    id: entry.id,
    userId: entry.userId,
    userNickname: entry.user?.nickname || entry.user?.email || '未知成员',
    status: entry.status,
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function mapAnnouncement(announcement: {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { nickname: string | null; email: string };
}) {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    isPinned: announcement.isPinned,
    createdById: announcement.createdById,
    createdByName: announcement.createdBy?.nickname || announcement.createdBy?.email || 'KP',
    createdAt: announcement.createdAt.toISOString(),
    updatedAt: announcement.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 3: Implement `getRoomCoordination`**

Add:

```ts
export async function getRoomCoordination(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');

    const [nextSession, attendance, announcements, activeMembers] = await Promise.all([
      prisma.roomNextSession.findUnique({ where: { roomId: auth.room.id } }),
      prisma.roomAttendanceConfirmation.findMany({
        where: { roomId: auth.room.id },
        include: { user: { select: { nickname: true, email: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.roomAnnouncement.findMany({
        where: { roomId: auth.room.id },
        include: { createdBy: { select: { nickname: true, email: true } } },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        take: 10,
      }),
      prisma.roomMember.findMany({
        where: { roomId: auth.room.id, leftAt: null },
        include: { user: { select: { nickname: true, email: true } } },
        orderBy: { joinedAt: 'asc' },
      }),
    ]);

    const attendanceByUser = new Map(attendance.map(entry => [entry.userId, entry]));
    const attendanceViews = activeMembers.map(member => {
      const entry = attendanceByUser.get(member.userId);
      if (entry) return mapAttendance(entry);
      return {
        id: null,
        userId: member.userId,
        userNickname: member.user.nickname || member.user.email || '未知成员',
        status: 'PENDING',
        note: '',
        createdAt: member.joinedAt.toISOString(),
        updatedAt: member.joinedAt.toISOString(),
      };
    });

    res.json({
      nextSession: nextSession ? mapNextSession(nextSession) : null,
      attendance: attendanceViews,
      announcements: announcements.map(mapAnnouncement),
      myAttendance: attendanceViews.find(entry => entry.userId === userId) ?? null,
      canManageCoordination: auth.capabilities.canUseKPTools,
    });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 4: Implement write handlers**

Add:

```ts
export async function saveRoomNextSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canUseKPTools');
    const payload = nextSessionSchema.parse(req.body);

    const saved = await prisma.roomNextSession.upsert({
      where: { roomId: auth.room.id },
      create: {
        roomId: auth.room.id,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        timezone: payload.timezone ?? 'Asia/Shanghai',
        title: payload.title ?? '',
        note: payload.note ?? '',
        status: payload.status ?? 'SCHEDULED',
        updatedById: userId,
      },
      update: {
        scheduledAt: payload.scheduledAt === undefined ? undefined : payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        timezone: payload.timezone,
        title: payload.title,
        note: payload.note,
        status: payload.status,
        updatedById: userId,
      },
    });

    res.json({ nextSession: mapNextSession(saved) });
  } catch (error) {
    next(error);
  }
}

export async function saveMyAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');
    const payload = attendanceSchema.parse(req.body);

    const saved = await prisma.roomAttendanceConfirmation.upsert({
      where: { roomId_userId: { roomId: auth.room.id, userId } },
      create: {
        roomId: auth.room.id,
        userId,
        status: payload.status,
        note: payload.note ?? '',
      },
      update: {
        status: payload.status,
        note: payload.note ?? '',
      },
      include: { user: { select: { nickname: true, email: true } } },
    });

    res.json({ attendance: mapAttendance(saved) });
  } catch (error) {
    next(error);
  }
}

export async function createRoomAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);
    const auth = await requireRoomCapability(roomId, userId, 'canUseKPTools');
    const payload = announcementSchema.parse(req.body);

    const announcement = await prisma.roomAnnouncement.create({
      data: {
        roomId: auth.room.id,
        title: payload.title ?? '',
        content: payload.content,
        isPinned: payload.isPinned ?? true,
        createdById: userId,
      },
      include: { createdBy: { select: { nickname: true, email: true } } },
    });

    res.status(201).json({ announcement: mapAnnouncement(announcement) });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 5: Implement delete announcement**

Add:

```ts
export async function deleteRoomAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId, announcementId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canUseKPTools');

    const existing = await prisma.roomAnnouncement.findFirst({
      where: { id: announcementId, roomId: auth.room.id },
    });

    if (!existing) {
      throw new AppError('ANNOUNCEMENT_NOT_FOUND', '房间公告不存在', 404);
    }

    await prisma.roomAnnouncement.delete({ where: { id: announcementId } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
```

---

## Task 3: Backend Routes

**Files:**
- Create: `apps/server/src/modules/rooms/room-coordination.routes.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: Create routes file**

Create:

```ts
import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import {
  createRoomAnnouncement,
  deleteRoomAnnouncement,
  getRoomCoordination,
  saveMyAttendance,
  saveRoomNextSession,
} from './room-coordination.service';

const router = Router();

router.get('/:roomId/coordination', authMiddleware, getRoomCoordination);
router.put('/:roomId/coordination/next-session', authMiddleware, saveRoomNextSession);
router.patch('/:roomId/coordination/next-session', authMiddleware, saveRoomNextSession);
router.put('/:roomId/coordination/my-attendance', authMiddleware, saveMyAttendance);
router.post('/:roomId/coordination/announcements', authMiddleware, createRoomAnnouncement);
router.delete('/:roomId/coordination/announcements/:announcementId', authMiddleware, deleteRoomAnnouncement);

export default router;
```

- [ ] **Step 2: Mount routes**

In `apps/server/src/index.ts`, add:

```ts
import roomCoordinationRoutes from './modules/rooms/room-coordination.routes';
```

Then mount after `roomLifecycleRoutes` or after `investigationBoardRoutes`:

```ts
app.use('/api/rooms', roomCoordinationRoutes);
```

- [ ] **Step 3: Run backend validation**

Run:

```powershell
Set-Location apps/server
npm run typecheck
```

Expected: TypeScript passes.

---

## Task 4: Frontend Contract and API Service

**Files:**
- Create: `apps/web/src/types/room-coordination-contract.ts`
- Create: `apps/web/src/services/room-coordination.service.ts`

- [ ] **Step 1: Add contract types**

Create `room-coordination-contract.ts`:

```ts
export type RoomAttendanceStatus = 'PENDING' | 'AVAILABLE' | 'LEAVE' | 'TENTATIVE';
export type RoomNextSessionStatus = 'SCHEDULED' | 'RESCHEDULED' | 'CANCELLED';

export interface RoomNextSessionView {
  id: string;
  scheduledAt: string | null;
  timezone: string;
  title: string;
  note: string;
  status: RoomNextSessionStatus;
  updatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomNextSessionPayload {
  scheduledAt?: string | null;
  timezone?: string;
  title?: string;
  note?: string;
  status?: RoomNextSessionStatus;
}

export interface RoomAttendanceView {
  id: string | null;
  userId: string;
  userNickname: string;
  status: RoomAttendanceStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomAttendancePayload {
  status: RoomAttendanceStatus;
  note?: string;
}

export interface RoomAnnouncementView {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomAnnouncementPayload {
  title?: string;
  content: string;
  isPinned?: boolean;
}

export interface RoomCoordinationView {
  nextSession: RoomNextSessionView | null;
  attendance: RoomAttendanceView[];
  announcements: RoomAnnouncementView[];
  myAttendance: RoomAttendanceView | null;
  canManageCoordination: boolean;
}
```

- [ ] **Step 2: Add API service**

Create `room-coordination.service.ts`:

```ts
import { apiFetch, handleApiResponse } from '@lib/api';
import type {
  RoomAnnouncementPayload,
  RoomAnnouncementView,
  RoomAttendancePayload,
  RoomAttendanceView,
  RoomCoordinationView,
  RoomNextSessionPayload,
  RoomNextSessionView,
} from '@/types/room-coordination-contract';

export async function getRoomCoordination(roomId: string): Promise<RoomCoordinationView> {
  return apiFetch(`/rooms/${roomId}/coordination`).then(
    res => handleApiResponse<RoomCoordinationView>(res)
  );
}

export async function saveRoomNextSession(
  roomId: string,
  payload: RoomNextSessionPayload
): Promise<RoomNextSessionView> {
  const data = await apiFetch(`/rooms/${roomId}/coordination/next-session`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ nextSession: RoomNextSessionView }>(res));
  return data.nextSession;
}

export async function saveMyRoomAttendance(
  roomId: string,
  payload: RoomAttendancePayload
): Promise<RoomAttendanceView> {
  const data = await apiFetch(`/rooms/${roomId}/coordination/my-attendance`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ attendance: RoomAttendanceView }>(res));
  return data.attendance;
}

export async function createRoomAnnouncement(
  roomId: string,
  payload: RoomAnnouncementPayload
): Promise<RoomAnnouncementView> {
  const data = await apiFetch(`/rooms/${roomId}/coordination/announcements`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(res => handleApiResponse<{ announcement: RoomAnnouncementView }>(res));
  return data.announcement;
}

export async function deleteRoomAnnouncement(roomId: string, announcementId: string): Promise<void> {
  await apiFetch(`/rooms/${roomId}/coordination/announcements/${announcementId}`, {
    method: 'DELETE',
  }).then(res => handleApiResponse(res));
}
```

- [ ] **Step 3: Run web type validation**

Run:

```powershell
Set-Location apps/web
npm run typecheck
```

Expected: TypeScript passes.

---

## Task 5: Minimal Room Coordination Panel

**Files:**
- Create: `apps/web/src/pages/rooms/components/RoomCoordinationPanel.tsx`
- Modify: `apps/web/src/pages/rooms/RoomPage.tsx`

- [ ] **Step 1: Create panel component**

Create a compact component with these props:

```ts
interface RoomCoordinationPanelProps {
  roomId: string;
}
```

The component must:

- Load `getRoomCoordination(roomId)` on mount.
- Show next session time, status and note.
- Let KP save next session fields when `canManageCoordination` is true.
- Let any room member update their own attendance status.
- Show attendance counts and member statuses.
- Let KP add/delete announcements.
- Use simple existing Tailwind classes only; visual polish is left to UI/UX thread.

- [ ] **Step 2: Use these labels**

Use these labels in the component:

```ts
const attendanceLabels = {
  PENDING: '待确认',
  AVAILABLE: '可参加',
  LEAVE: '请假',
  TENTATIVE: '待定',
} as const;

const sessionStatusLabels = {
  SCHEDULED: '已排期',
  RESCHEDULED: '已改期',
  CANCELLED: '已取消',
} as const;
```

- [ ] **Step 3: Mount panel in room page**

In `apps/web/src/pages/rooms/RoomPage.tsx`, import:

```ts
import { RoomCoordinationPanel } from './components/RoomCoordinationPanel';
```

Render it near the existing investigation tools entry, only when the user can view public room content:

```tsx
{(room?.myCapabilities?.canViewPublicContent ?? false) && room?.roomId && (
  <RoomCoordinationPanel roomId={room.roomId} />
)}
```

Do not use `isCreator` or local creator checks for permission display.

- [ ] **Step 4: Run web typecheck**

Run:

```powershell
Set-Location apps/web
npm run typecheck
```

Expected: TypeScript passes.

---

## Task 6: Light Verification

**Files:**
- No new files.

- [ ] **Step 1: Validate Prisma**

Run:

```powershell
Set-Location apps/server
npx prisma validate --schema prisma/schema.prisma
```

Expected: schema valid.

- [ ] **Step 2: Apply local migration only after DB backup**

Create a local backup before applying the migration:

```powershell
Copy-Item "$env:LOCALAPPDATA\SunkenCity\dev.db" "$env:LOCALAPPDATA\SunkenCity\dev.before-room-coordination-20260705.db"
Set-Location apps/server
npx prisma migrate dev --schema prisma/schema.prisma --name add_room_coordination
```

Expected: migration applies locally.

- [ ] **Step 3: Run targeted typechecks**

Run:

```powershell
Set-Location apps/server
npm run typecheck
Set-Location ..\web
npm run typecheck
```

Expected: both pass.

- [ ] **Step 4: Avoid deep testing by default**

Do not run large E2E, deep Playwright, production write smoke, full visual regression, or paid AI calls unless the user explicitly asks again.

---

## Self-Review

Spec coverage:

- 下次开团时间：Task 1, Task 2, Task 5。
- 成员参加确认 / 请假 / 待确认：Task 1, Task 2, Task 4, Task 5。
- KP 房间公告：Task 1, Task 2, Task 5。
- 房间入口可见信息：Task 5 covers room page; room list is intentionally deferred because current worktree has UI/UX edits in `RoomListPage.tsx`.
- 不碰核心契约：all data lives in new tables and REST routes; no Socket/lifecycle/dice/private chat/settlement edits.

Placeholder scan:

- No `TBD`, `TODO`, or unspecified implementation steps remain.

Type consistency:

- Backend response names match frontend service types: `nextSession`, `attendance`, `announcements`, `myAttendance`, `canManageCoordination`.
- Attendance statuses match between backend Zod schema and frontend union type.
- Next session statuses match between backend Zod schema and frontend union type.

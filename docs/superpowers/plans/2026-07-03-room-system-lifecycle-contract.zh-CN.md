# 房间系统身份绑定与生命周期 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏现有线上数据、Socket 事件和前端页面的前提下，把房间系统升级为清晰的 KP/PL/观察者身份、角色绑定锁定、开场/暂停/终局/结算生命周期，并为后续彻底重构与前端大改版保留稳定接口。

**Architecture:** 本轮不做彻底重构；采用“兼容层 + 新契约 + 新运行实例表”的增量方式。旧字段 `Room.creatorId`、`RoomMember.role`、`RoomMember.characterId`、`RoomMessage.isSecret`、现有 Socket 事件格式继续保留，新代码通过统一权限 helper、房间 capabilities、房间角色实例和生命周期状态逐步接管行为。前端不再直接理解权限细节，而是消费后端返回的 `myRole`、`myCapabilities`、`myBinding` 和 `roomLifecycle` 视图模型，后续 UI 重构可以替换页面布局而不重写后端规则。

**Tech Stack:** React 18 + Vite + Zustand + Socket.io client, Express + Prisma + SQLite + Socket.io, TypeScript, existing v2 UI system (`PageShell`, `Surface`, `ReadablePanel`, `Button`).

---

## 0. 决策结论

1. **彻底重构暂不安排在当前阶段。** 当前系统已有真实数据、强绑定 Socket 事件、房间日志、私聊、暗骰、子房间和报告能力；一次性重写风险高。当前阶段只做可回滚的兼容式升级。
2. **现在必须为彻底重构留空间。** 新增房间生命周期、角色实例、权限 helper 和前端 view-model 边界；后续如果要拆分 `RoomPage.tsx` 或替换 Socket 战斗实现，可以沿这些边界迁移。
3. **前端即将升级，所以本轮不把复杂业务规则塞进 UI。** 前端只根据 `capabilities` 渲染 KP/PL/观察者界面，避免未来 UI 重构时重新梳理权限。
4. **KP 不绑定角色卡。** KP 身份就是房间主持者，负责管理工具、骰点判定、PL 管理和结算。
5. **同一角色卡不能同时参与多个进行中/暂停中房间。** 允许准备阶段换卡，进行中换卡必须走 KP 审批/记录，避免影响结团后的角色卡成长机制。
6. **协助 KP 暂不开放，但保留口。** 数据和能力模型预留 `ASSISTANT_KP` / `canUseKPTools`，UI 不提供任命入口。
7. **观察者按只读公开信息处理。** 能看公开聊天、公开线索、公开投骰，不能私聊角色、不能进入战斗、不能看 KP 秘密。

---

## 1. 现有代码约束

### 必须保留

- `apps/server/prisma/schema.prisma`
  - `Room.creatorId`
  - `Room.status` 的既有 `ACTIVE | CLOSED` 数据
  - `RoomMember.role` 的既有 `'KP' | 'PLAYER'`
  - `RoomMember.leftAt`
  - `RoomMember.characterId`
  - `RoomMessage.isSecret`
  - `DiceRoll.successLevel`
- `apps/server/src/config/socket.ts`
  - `room:join`
  - `message:send`
  - `dice:roll`
  - `combat:*`
- `apps/server/src/modules/rooms/room.routes.ts`
  - `GET /api/rooms/:roomId`
  - `POST /api/rooms/:roomId/join`
  - `POST /api/rooms/:roomId/leave`
- `apps/web/src/pages/rooms/RoomPage.tsx`
  - 现有房间进入、Socket 连接、聊天、投骰和面板打开逻辑

### 当前风险

- `Room.creatorId` 与 `RoomMember.role === 'KP'` 混用。
- KP 创建房间时可能绑定 `User.displayedCharacterId`，与“KP 不绑定角色卡”的新规则冲突。
- `RoomMember.characterId` 与 `displayedCharacterId` 混用，前端还 fallback 到 `User.displayedCharacter`。
- 没有开团锁定，角色卡会被房间内操作直接影响。
- 没有结团写回，报告只是展示。
- 删除房间会级联删除大量数据，应避免新增硬删除入口。
- Socket 战斗状态仍依赖内存 Map，当前计划只隔离生命周期与角色锁定，不在第一阶段改造实时战斗。

---

## 2. 目标状态

### 2.1 房间生命周期

新增业务生命周期，兼容旧 `Room.status`：

```ts
type RoomLifecycle =
  | 'PREPARING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'FINISHING'
  | 'FINISHED'
  | 'CANCELLED';
```

兼容规则：

- 旧 `Room.status === 'ACTIVE'` 且无新生命周期字段时，视为 `PREPARING`。
- 旧 `Room.status === 'CLOSED'` 且无新生命周期字段时，视为 `FINISHED`，但不自动执行结算写回。
- 只有 `IN_PROGRESS` 和 `PAUSED` 会占用角色卡。
- `FINISHING` 停止普通推进，进入结算工作台。
- `FINISHED` 释放角色占用，写回经 KP 确认的结算结果。

### 2.2 身份与能力

对外返回稳定能力，不让前端自己推导：

```ts
type RoomRoleView = 'OWNER_KP' | 'ASSISTANT_KP' | 'PLAYER' | 'OBSERVER' | 'NON_MEMBER';

interface RoomCapabilities {
  canEnterRoom: boolean;
  canJoinAsPlayer: boolean;
  canJoinAsObserver: boolean;
  canChangeCharacter: boolean;
  canRequestCharacterChange: boolean;
  canStartRoom: boolean;
  canPauseRoom: boolean;
  canResumeRoom: boolean;
  canEnterFinishing: boolean;
  canFinalizeRoom: boolean;
  canCancelRoom: boolean;
  canCloseRoom: boolean;
  canUseKPTools: boolean;
  canManageMembers: boolean;
  canManageScene: boolean;
  canManageClues: boolean;
  canManageNpcs: boolean;
  canManageCombat: boolean;
  canSendPublicMessage: boolean;
  canSendPrivateMessage: boolean;
  canRollPublicDice: boolean;
  canRollSecretDice: boolean;
  canViewSecretEvents: boolean;
  canViewPublicContent: boolean;
}
```

### 2.3 角色绑定

- KP 不创建 `characterId` 绑定。
- PLAYER 必须绑定自己拥有的角色卡。
- OBSERVER 没有角色卡绑定。
- `PREPARING` / `READY`：PLAYER 可换卡，系统检查角色未被其他进行中/暂停中房间占用。
- `IN_PROGRESS` / `PAUSED`：PLAYER 不能直接换卡；先记录换卡申请，由 KP 批准后创建离场/入场记录。
- 结团写回只处理本场有效 PLAYER 的角色实例，不处理 KP 和 OBSERVER。

### 2.4 前端重构边界

前端页面后续可以按以下容器重构：

- `RoomShell`: 房间布局、顶部状态、左右抽屉挂载点。
- `RoomStage`: 聊天/剧情/场景主区。
- `RoomParticipantRail`: 成员、角色状态、观察者。
- `KpWorkbench`: KP 工具入口和面板容器。
- `PlayerConsole`: PL 快捷投骰、私聊、角色状态。
- `ObserverConsole`: 只读视图。

本轮先建立服务层和 view-model，不强行拆 `RoomPage.tsx`，避免与即将到来的前端视觉升级互相冲突。

---

## 3. 文件结构

### 新增文件

- `apps/server/src/modules/rooms/room-auth.ts`
  - 统一读取房间、当前成员、角色身份、能力矩阵。
- `apps/server/src/modules/rooms/room-lifecycle.service.ts`
  - 开场、暂停、恢复、进入终局、最终结算、取消房间。
- `apps/server/src/modules/rooms/room-binding.service.ts`
  - 角色占用检查、绑定、换卡申请、观察者加入。
- `apps/server/src/modules/rooms/room-lifecycle.routes.ts`
  - 新增生命周期 API。
- `apps/server/src/modules/rooms/room-view.ts`
  - 将 Prisma Room 映射为前端稳定 view-model。
- `apps/web/src/types/room-contract.ts`
  - 前端房间契约类型。
- `apps/web/src/services/room-lifecycle.service.ts`
  - 前端生命周期 API 调用。
- `apps/web/src/services/room-binding.service.ts`
  - 前端绑定/观察者/换卡 API 调用。
- `apps/web/src/pages/rooms/components/RoomLifecycleBanner.tsx`
  - 显示准备、进行、暂停、终局、已结团状态。
- `apps/web/src/pages/rooms/components/RoomJoinGate.tsx`
  - 未加入用户选择 PLAYER/OBSERVER 和角色。
- `apps/web/src/pages/rooms/components/KpLifecycleControls.tsx`
  - KP 开场、暂停、恢复、进入终局、最终结算入口。

### 修改文件

- `apps/server/prisma/schema.prisma`
  - 新增兼容式模型和索引，不删除旧字段。
- `apps/server/src/index.ts`
  - 挂载 `roomLifecycleRoutes`。
- `apps/server/src/modules/rooms/room.routes.ts`
  - 创建房间时 KP 不绑定角色卡。
  - `GET /:roomId` 返回 `myRole`、`myCapabilities`、`myBinding`、`lifecycle`。
  - `POST /:roomId/join` 支持 `joinAs: 'PLAYER' | 'OBSERVER'`。
- `apps/server/src/modules/rooms/gm-note.routes.ts`
- `apps/server/src/modules/rooms/clue.routes.ts`
- `apps/server/src/modules/rooms/npc.routes.ts`
- `apps/server/src/modules/rooms/phase.routes.ts`
- `apps/server/src/modules/rooms/scene-preset.routes.ts`
- `apps/server/src/modules/rooms/sub-room.routes.ts`
- `apps/server/src/modules/rooms/event-log.routes.ts`
- `apps/server/src/modules/rooms/combat-v2.routes.ts`
  - 替换散落的 `member.role !== 'KP'` 为 `requireRoomCapability(...)`。
- `apps/server/src/modules/private-message/private-message.routes.ts`
  - 短期仍保留 characterId 私聊；新增禁止 OBSERVER 私聊和绑定校验。
- `apps/server/src/modules/reports/report.routes.ts`
  - 报告读取新结算数据；旧房间保持原逻辑。
- `apps/web/src/pages/rooms/RoomPage.tsx`
  - 从 `room.isCreator` 过渡到 `room.myCapabilities`。
  - 加入入口改为 `RoomJoinGate`。
  - KP 生命周期入口挂到工具栏。
- `apps/web/src/pages/rooms/RoomListPage.tsx`
  - 使用后端返回的 `myRole`/`lifecycle`，修正“我主持/我参与/观察中/已结团”筛选。

### 暂不修改

- `apps/server/src/config/socket.ts`
  - 第一阶段只在进入 Socket 操作前补能力校验，不改变事件格式。
- `RoomMessage.isSecret`
- `DiceRoll.successLevel`
- 旧视觉系统和大规模 `RoomPage.tsx` 拆分

---

## 4. 数据模型方案

### 4.1 Prisma 增量模型

在 `apps/server/prisma/schema.prisma` 中新增：

```prisma
model RoomRun {
  id              String   @id @default(uuid())
  roomId          String   @unique
  lifecycle       String   @default("PREPARING")
  startedAt       DateTime?
  pausedAt        DateTime?
  finishingAt     DateTime?
  finishedAt      DateTime?
  cancelledAt     DateTime?
  finalizedById   String?
  startSnapshot   String   @default("{}")
  finishSummary   String   @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  room            Room     @relation(fields: [roomId], references: [id])
  participants    RoomRunParticipant[]
  characterLocks  RoomCharacterLock[]
  settlements     RoomSettlement[]

  @@index([lifecycle])
}

model RoomRunParticipant {
  id                 String   @id @default(uuid())
  roomRunId           String
  roomMemberId        String
  userId              String
  role                String   @default("PLAYER")
  characterId         String?
  initialSnapshot     String   @default("{}")
  joinSnapshot        String   @default("{}")
  finalSnapshot       String   @default("{}")
  participationStatus String   @default("ACTIVE")
  joinedRunAt         DateTime @default(now())
  leftRunAt           DateTime?

  roomRun             RoomRun  @relation(fields: [roomRunId], references: [id], onDelete: Cascade)

  @@index([roomRunId])
  @@index([userId])
  @@index([characterId])
  @@unique([roomRunId, userId])
}

model RoomCharacterLock {
  id          String   @id @default(uuid())
  characterId String
  roomId      String
  roomRunId   String
  userId      String
  status      String   @default("ACTIVE")
  lockedAt    DateTime @default(now())
  releasedAt  DateTime?

  roomRun     RoomRun  @relation(fields: [roomRunId], references: [id], onDelete: Cascade)

  @@index([characterId, status])
  @@index([roomId])
  @@index([roomRunId])
}

model RoomSettlement {
  id           String   @id @default(uuid())
  roomRunId     String
  characterId   String
  userId         String
  status         String   @default("DRAFT")
  outcome        String   @default("SURVIVED")
  hpFinal        Int?
  mpFinal        Int?
  sanFinal       Int?
  expAward       Int      @default(0)
  skillGrowth    String   @default("[]")
  itemChanges    String   @default("[]")
  kpNote         String?
  appliedAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  roomRun        RoomRun  @relation(fields: [roomRunId], references: [id], onDelete: Cascade)

  @@index([roomRunId])
  @@index([characterId])
  @@unique([roomRunId, characterId])
}
```

同时给 `Room` 增加关系：

```prisma
  roomRun RoomRun?
```

### 4.2 为什么不直接替换旧字段

- `RoomMember.role` 已有数据只能保留 `KP`/`PLAYER`。
- `RoomMember.characterId` 被私聊、报告、战斗、前端成员展示依赖。
- `displayedCharacterId` 是历史冗余，本轮只停止新增依赖，不立即删除。
- 新增 `RoomRun` 可以支持长期团多次开团的后续设计；本轮先用 `roomId @unique` 保持一个房间一个当前进程，未来可解除 unique 变成多 session。

---

## 5. 后端任务

### Task 1: 房间权限与 view-model 契约

**Files:**
- Create: `apps/server/src/modules/rooms/room-auth.ts`
- Create: `apps/server/src/modules/rooms/room-view.ts`
- Modify: `apps/server/src/modules/rooms/room.routes.ts`

- [ ] **Step 1: 新增 `RoomCapabilities` 和角色推导**

在 `room-auth.ts` 中建立统一能力矩阵：

```ts
import { AppError } from '../../middleware/error';
import { prisma } from '../../config/database';

export type RoomRoleView = 'OWNER_KP' | 'ASSISTANT_KP' | 'PLAYER' | 'OBSERVER' | 'NON_MEMBER';

export interface RoomCapabilities {
  canEnterRoom: boolean;
  canJoinAsPlayer: boolean;
  canJoinAsObserver: boolean;
  canChangeCharacter: boolean;
  canRequestCharacterChange: boolean;
  canStartRoom: boolean;
  canPauseRoom: boolean;
  canResumeRoom: boolean;
  canEnterFinishing: boolean;
  canFinalizeRoom: boolean;
  canCancelRoom: boolean;
  canCloseRoom: boolean;
  canUseKPTools: boolean;
  canManageMembers: boolean;
  canManageScene: boolean;
  canManageClues: boolean;
  canManageNpcs: boolean;
  canManageCombat: boolean;
  canSendPublicMessage: boolean;
  canSendPrivateMessage: boolean;
  canRollPublicDice: boolean;
  canRollSecretDice: boolean;
  canViewSecretEvents: boolean;
  canViewPublicContent: boolean;
}

export function deriveRoomRole(input: {
  creatorId: string;
  userId?: string;
  member?: { role: string; characterId: string | null; leftAt: Date | null } | null;
}): RoomRoleView {
  if (!input.userId) return 'NON_MEMBER';
  if (input.creatorId === input.userId) return 'OWNER_KP';
  if (!input.member || input.member.leftAt) return 'NON_MEMBER';
  if (input.member.role === 'KP') return 'ASSISTANT_KP';
  if (input.member.role === 'OBSERVER') return 'OBSERVER';
  return 'PLAYER';
}

export function capabilitiesFor(role: RoomRoleView, lifecycle: string): RoomCapabilities {
  const isKp = role === 'OWNER_KP' || role === 'ASSISTANT_KP';
  const isPlayer = role === 'PLAYER';
  const isObserver = role === 'OBSERVER';
  const isMember = isKp || isPlayer || isObserver;
  const beforeStart = lifecycle === 'PREPARING' || lifecycle === 'READY';
  const active = lifecycle === 'IN_PROGRESS' || lifecycle === 'PAUSED';
  const finishing = lifecycle === 'FINISHING';

  return {
    canEnterRoom: isMember,
    canJoinAsPlayer: role === 'NON_MEMBER' && beforeStart,
    canJoinAsObserver: role === 'NON_MEMBER' && lifecycle !== 'FINISHED' && lifecycle !== 'CANCELLED',
    canChangeCharacter: isPlayer && beforeStart,
    canRequestCharacterChange: isPlayer && active,
    canStartRoom: isKp && beforeStart,
    canPauseRoom: isKp && lifecycle === 'IN_PROGRESS',
    canResumeRoom: isKp && lifecycle === 'PAUSED',
    canEnterFinishing: isKp && (lifecycle === 'IN_PROGRESS' || lifecycle === 'PAUSED'),
    canFinalizeRoom: isKp && finishing,
    canCancelRoom: isKp && beforeStart,
    canCloseRoom: role === 'OWNER_KP',
    canUseKPTools: isKp,
    canManageMembers: isKp,
    canManageScene: isKp,
    canManageClues: isKp,
    canManageNpcs: isKp,
    canManageCombat: isKp,
    canSendPublicMessage: isMember && lifecycle !== 'FINISHED' && lifecycle !== 'CANCELLED',
    canSendPrivateMessage: isPlayer && lifecycle !== 'FINISHED' && lifecycle !== 'CANCELLED',
    canRollPublicDice: (isKp || isPlayer) && lifecycle !== 'FINISHED' && lifecycle !== 'CANCELLED',
    canRollSecretDice: isKp,
    canViewSecretEvents: isKp,
    canViewPublicContent: isMember,
  };
}

export async function requireRoomCapability(roomId: string, userId: string | undefined, capability: keyof RoomCapabilities) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: { members: true, roomRun: true },
  });
  if (!room) throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  const member = room.members.find((m) => m.userId === userId && !m.leftAt) || null;
  const lifecycle = room.roomRun?.lifecycle || (room.status === 'CLOSED' ? 'FINISHED' : 'PREPARING');
  const role = deriveRoomRole({ creatorId: room.creatorId, userId, member });
  const capabilities = capabilitiesFor(role, lifecycle);
  if (!capabilities[capability]) {
    throw new AppError('FORBIDDEN', '你没有执行此房间操作的权限', 403);
  }
  return { room, member, role, lifecycle, capabilities };
}
```

- [ ] **Step 2: `GET /api/rooms/:roomId` 增加兼容字段**

保留原 `isCreator`、`isMember`，新增：

```ts
myRole: role,
myCapabilities: capabilities,
myBinding: {
  roomMemberId: member?.id || null,
  characterId: member?.characterId || null,
  joinMode: role === 'OBSERVER' ? 'OBSERVER' : role === 'PLAYER' ? 'PLAYER' : role === 'OWNER_KP' ? 'KP' : 'NONE',
},
lifecycle,
```

- [ ] **Step 3: 轻量验证**

Run only when executing this plan:

```powershell
cd apps/server
npm run typecheck
```

Expected: TypeScript compiles. If legacy unrelated type errors appear, record them and do not silently refactor unrelated modules.

### Task 2: 数据迁移与生命周期服务

**Files:**
- Modify: `apps/server/prisma/schema.prisma`
- Create: `apps/server/src/modules/rooms/room-lifecycle.service.ts`
- Create: `apps/server/src/modules/rooms/room-lifecycle.routes.ts`
- Modify: `apps/server/src/index.ts`

- [ ] **Step 1: 新增 Prisma 模型**

Add models from section 4.1. Do not delete existing fields.

- [ ] **Step 2: 生成迁移**

Run only when executing this plan:

```powershell
cd apps/server
npx prisma migrate dev --name add_room_lifecycle_and_settlement
```

Expected: migration is created under `apps/server/prisma/migrations/` and existing SQLite data remains readable.

- [ ] **Step 3: 生命周期 API**

Create routes:

```ts
router.post('/:roomId/lifecycle/start', authMiddleware, startRoom);
router.post('/:roomId/lifecycle/pause', authMiddleware, pauseRoom);
router.post('/:roomId/lifecycle/resume', authMiddleware, resumeRoom);
router.post('/:roomId/lifecycle/finishing', authMiddleware, enterFinishing);
router.post('/:roomId/lifecycle/finalize', authMiddleware, finalizeRoom);
router.post('/:roomId/lifecycle/cancel', authMiddleware, cancelRoom);
```

Each handler must call `requireRoomCapability(...)` with the matching capability.

- [ ] **Step 4: 开场事务**

`startRoom` must:

1. Load active members.
2. Require at least one `PLAYER` with `characterId`.
3. Verify each character belongs to the member user.
4. Verify no `RoomCharacterLock` exists with same `characterId` and `status = 'ACTIVE'`.
5. Create or update `RoomRun` to `IN_PROGRESS`.
6. Create `RoomRunParticipant` snapshots.
7. Create `RoomCharacterLock` rows.

- [ ] **Step 5: 结团事务**

`finalizeRoom` must:

1. Require lifecycle `FINISHING`.
2. Apply confirmed `RoomSettlement` rows to `Character` only for PLAYER participants.
3. Release active `RoomCharacterLock` rows.
4. Set `RoomRun.lifecycle = 'FINISHED'`.
5. Set legacy `Room.status = 'CLOSED'`.

### Task 3: 角色绑定与观察者加入

**Files:**
- Create: `apps/server/src/modules/rooms/room-binding.service.ts`
- Modify: `apps/server/src/modules/rooms/room.routes.ts`
- Modify: `apps/server/src/modules/private-message/private-message.routes.ts`

- [ ] **Step 1: 创建房间时 KP 不再绑定角色**

In `POST /api/rooms`, change KP member create data to:

```ts
members: {
  create: {
    userId,
    role: 'KP',
    characterId: null,
    displayedCharacterId: null,
  },
},
```

- [ ] **Step 2: 加入房间支持模式**

Accept:

```ts
interface JoinRoomBody {
  joinAs?: 'PLAYER' | 'OBSERVER';
  characterId?: string;
}
```

Rules:

- default `joinAs` is `PLAYER` for old clients.
- `PLAYER` requires `characterId`.
- `OBSERVER` forces `characterId = null`.
- joining as PLAYER verifies `Character.userId === req.userId`.
- lifecycle `IN_PROGRESS` blocks direct player join unless KP later adds a controlled API.

- [ ] **Step 3: 私聊禁止观察者**

Before reading or sending private messages, derive current capabilities and require `canSendPrivateMessage` for send; read may be allowed only when current member is PLAYER with active `characterId`.

### Task 4: 替换分散 KP 权限

**Files:**
- Modify route files listed in section 3.

- [ ] **Step 1: Replace repeated KP checks**

Use:

```ts
const { room } = await requireRoomCapability(roomId, req.userId, 'canUseKPTools');
```

For module-specific routes:

- clue write routes: `canManageClues`
- npc write routes: `canManageNpcs`
- phase/scene routes: `canManageScene`
- combat management routes: `canManageCombat`
- event secret write: `canViewSecretEvents` or `canUseKPTools`

- [ ] **Step 2: Keep public read behavior compatible**

Public room-member reads should use `canViewPublicContent`, not KP-only checks.

- [ ] **Step 3: Do not change response shapes unless adding fields**

Existing front-end consumers must continue working during the migration window.

### Task 5: 前端契约层

**Files:**
- Create: `apps/web/src/types/room-contract.ts`
- Create: `apps/web/src/services/room-lifecycle.service.ts`
- Create: `apps/web/src/services/room-binding.service.ts`
- Modify: `apps/web/src/services/room.service.ts`

- [ ] **Step 1: Add front-end contract types**

```ts
export type RoomRoleView = 'OWNER_KP' | 'ASSISTANT_KP' | 'PLAYER' | 'OBSERVER' | 'NON_MEMBER';
export type RoomLifecycle = 'PREPARING' | 'READY' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHING' | 'FINISHED' | 'CANCELLED';

export interface RoomCapabilities {
  canEnterRoom: boolean;
  canJoinAsPlayer: boolean;
  canJoinAsObserver: boolean;
  canChangeCharacter: boolean;
  canRequestCharacterChange: boolean;
  canStartRoom: boolean;
  canPauseRoom: boolean;
  canResumeRoom: boolean;
  canEnterFinishing: boolean;
  canFinalizeRoom: boolean;
  canCancelRoom: boolean;
  canCloseRoom: boolean;
  canUseKPTools: boolean;
  canManageMembers: boolean;
  canManageScene: boolean;
  canManageClues: boolean;
  canManageNpcs: boolean;
  canManageCombat: boolean;
  canSendPublicMessage: boolean;
  canSendPrivateMessage: boolean;
  canRollPublicDice: boolean;
  canRollSecretDice: boolean;
  canViewSecretEvents: boolean;
  canViewPublicContent: boolean;
}
```

- [ ] **Step 2: Add service calls**

```ts
export function startRoom(roomId: string) {
  return apiFetch(`/rooms/${roomId}/lifecycle/start`, { method: 'POST' }).then(handleApiResponse);
}

export function pauseRoom(roomId: string) {
  return apiFetch(`/rooms/${roomId}/lifecycle/pause`, { method: 'POST' }).then(handleApiResponse);
}

export function resumeRoom(roomId: string) {
  return apiFetch(`/rooms/${roomId}/lifecycle/resume`, { method: 'POST' }).then(handleApiResponse);
}

export function enterFinishing(roomId: string) {
  return apiFetch(`/rooms/${roomId}/lifecycle/finishing`, { method: 'POST' }).then(handleApiResponse);
}

export function finalizeRoom(roomId: string, payload: unknown) {
  return apiFetch(`/rooms/${roomId}/lifecycle/finalize`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then(handleApiResponse);
}
```

### Task 6: 房间页兼容接入

**Files:**
- Modify: `apps/web/src/pages/rooms/RoomPage.tsx`
- Create: `apps/web/src/pages/rooms/components/RoomLifecycleBanner.tsx`
- Create: `apps/web/src/pages/rooms/components/RoomJoinGate.tsx`
- Create: `apps/web/src/pages/rooms/components/KpLifecycleControls.tsx`

- [ ] **Step 1: Extend Room interface**

Add:

```ts
myRole?: RoomRoleView;
myCapabilities?: RoomCapabilities;
myBinding?: {
  roomMemberId: string | null;
  characterId: string | null;
  joinMode: 'KP' | 'PLAYER' | 'OBSERVER' | 'NONE';
};
lifecycle?: RoomLifecycle;
```

- [ ] **Step 2: Replace KP UI checks gradually**

Use:

```ts
const caps = room?.myCapabilities;
const isKpView = !!caps?.canUseKPTools;
```

Then replace high-value gates first:

- GM kit
- clue panel KP controls
- NPC controls
- combat controls
- scene edit controls
- event log secret view

Keep `room.isCreator` as fallback only during the first patch:

```ts
const canUseKPTools = !!room?.myCapabilities?.canUseKPTools || !!room?.isCreator;
```

- [ ] **Step 3: Add join gate**

If `room.isMember === false`, render `RoomJoinGate` with:

- Join as PLAYER: requires character selection.
- Join as OBSERVER: no character.
- Disable PLAYER when lifecycle is not `PREPARING` or `READY`.

### Task 7: 结算工作台最小可用版本

**Files:**
- Create: `apps/web/src/pages/rooms/components/RoomSettlementPanel.tsx`
- Modify: `apps/server/src/modules/reports/report.routes.ts`
- Modify: `apps/web/src/pages/rooms/RoomReportPage.tsx`

- [ ] **Step 1: FINISHING 状态显示结算入口**

Only KP sees `RoomSettlementPanel`.

- [ ] **Step 2: Settlement fields**

Per character:

- outcome: `SURVIVED | DEAD | MISSING | INSANE | WITHDREW`
- final HP / MP / SAN
- exp award
- skill growth array
- item changes array
- KP note

- [ ] **Step 3: Finalize requires explicit confirmation**

Button copy:

```text
确认结团并写回角色卡
```

Dialog copy:

```text
此操作会释放本场角色占用，并将确认的结算结果写回角色卡。已结团房间不会继续普通游戏推进。
```

### Task 8: 房间列表与前端升级预留

**Files:**
- Modify: `apps/server/src/modules/rooms/room.routes.ts`
- Modify: `apps/web/src/pages/rooms/RoomListPage.tsx`

- [ ] **Step 1: Room list adds lifecycle and role**

Return:

```ts
{
  roomId,
  name,
  description,
  memberCount,
  lifecycle,
  myRole,
  myCapabilities,
}
```

- [ ] **Step 2: Filters**

Use filters:

- 全部
- 我主持
- 我参与
- 观察中
- 准备中
- 进行中
- 已结团

- [ ] **Step 3: UI future-proofing**

Keep room cards using existing system components (`ActionCard`, `Surface`, `Button`) and do not add one-off layout logic that a later room UI redesign must undo.

---

## 6. Thorough rewrite strategy

### Not now

Do not rewrite these now:

- Socket event names and payloads.
- `RoomPage.tsx` into many components in the same backend migration.
- `PrivateMessage` schema away from characterId.
- Socket in-memory combat into persistent combat engine.
- `RoomMember.role` enum values.

### Space reserved now

This plan reserves rewrite space by creating:

- `room-auth.ts`: future permission source of truth.
- `room-view.ts`: future response adapter.
- `RoomRun`: future multi-session room model.
- `RoomRunParticipant`: future in-room character instance.
- `RoomCharacterLock`: future global character occupancy guard.
- `RoomSettlement`: future formal growth/writeback surface.
- front-end `room-contract.ts`: future UI can rebuild around a stable contract.

### Later rewrite window

Schedule a larger rewrite only after the lifecycle upgrade is stable:

1. Split `RoomPage.tsx` into room shell and role-specific consoles.
2. Move combat Socket state to `CombatSession` persistence.
3. Redesign private messaging around room participants or users while preserving old messages.
4. Convert room deletion to archive/soft-delete.
5. Allow multiple `RoomRun` records per `Room` for long campaigns.

---

## 7. Front-end redesign compatibility

The upcoming front-end iteration should treat room business state as a view model:

```ts
interface RoomPageModel {
  roomId: string;
  lifecycle: RoomLifecycle;
  myRole: RoomRoleView;
  myCapabilities: RoomCapabilities;
  myBinding: {
    roomMemberId: string | null;
    characterId: string | null;
    joinMode: 'KP' | 'PLAYER' | 'OBSERVER' | 'NONE';
  };
  members: RoomMemberView[];
  currentPhase: unknown;
  currentScene: unknown;
}
```

Design rules:

- PC KP can be dense and tool-heavy.
- Mobile PL must prioritize chat, own character state, quick roll, private message, visible clues.
- Observer has a quiet read-only interface.
- Use capability checks, not role strings, for rendering controls.
- Keep game-surface components independent from API calls; services own network calls.
- Avoid nested cards and oversized decorative hero sections inside the room runtime.

---

## 8. Verification policy

User instruction says not to run deep tests unless explicitly requested.

During implementation, use only narrow checks unless user asks for deeper validation:

- Server typecheck after backend contract changes:
  - `cd apps/server; npm run typecheck`
- Web typecheck after front-end contract changes:
  - `cd apps/web; npm run typecheck`
- One targeted local smoke only if requested:
  - room creation
  - join as player
  - join as observer
  - start room
  - enter finishing
  - finalize

Do not run full visual regression or broad Playwright screenshot suites unless explicitly asked.

---

## 9. Rollback strategy

- Schema additions are additive; rollback can ignore new tables while old room system continues using old fields.
- Keep old response fields during migration (`isCreator`, `isMember`, `members[].character`).
- Keep old join default as PLAYER for old client compatibility.
- Do not remove old KP checks until all routes use `requireRoomCapability`.
- Do not delete data. Add archive/soft-delete later.

---

## 10. Recommended execution order

1. Task 1: permission helper and response view-model.
2. Task 2: schema and lifecycle routes.
3. Task 3: join/binding/observer.
4. Task 4: replace KP checks.
5. Task 5: front-end contract and services.
6. Task 6: room page capability gates.
7. Task 8: room list lifecycle visibility.
8. Task 7: settlement panel and writeback.

Reasoning: identity and capability contract must land before UI differentiation; lifecycle must land before settlement; settlement should wait until role/binding rules are stable.

---

## 11. Self-Review

- Spec coverage: covers KP/PL separation, player-room binding, KP no character card, observer mode, role/capability contract, opening/finale lifecycle, no concurrent character usage, rewrite deferral, and front-end redesign space.
- Placeholder scan: no unresolved TBD/TODO markers; future rewrite items are explicitly scheduled as later phases with concrete boundaries.
- Type consistency: `RoomRoleView`, `RoomLifecycle`, `RoomCapabilities`, `RoomRun`, `RoomRunParticipant`, `RoomCharacterLock`, and `RoomSettlement` names are consistent across backend and frontend sections.
- Testing constraint: plan limits verification to typechecks and targeted smoke tests only when execution is requested.


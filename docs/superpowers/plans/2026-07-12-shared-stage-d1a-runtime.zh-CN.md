# Shared Stage D1-A Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为《沉没之城》共享即兴 AVG 舞台 D1-A 交付默认关闭、可回滚、服务端裁剪的舞台契约与后端运行时。

**Architecture:** 现有房间领域继续权威，舞台作为附加子系统读取房间、成员、角色、子房间、私聊和素材授权事实，并只写入舞台自己的事件、快照和资产模型。D1-A 先冻结共享契约，再用独立 `stage` service/gateway 接收命令、校验 capability、追加 `StageEvent`、更新 `StageSnapshot`，然后按 KP/PL/观察者/私聊受众生成裁剪投影并广播。

**Tech Stack:** Express + TypeScript + Prisma + SQLite + Socket.IO + Zod + Node test runner；共享契约使用 TypeScript 类型文件；功能开关默认关闭。

## Global Constraints

- 本线程实际 worktree：`C:\Users\29102\.codex\worktrees\d886\sunkencity`。
- 本线程分支：`codex/shared-stage-d1a-runtime`。
- 基线 HEAD：`9f0cc08604299c9fed0ba0645bd86db98905da2c`，包含最终规格移植提交 `8e563bb`、`aac053e`、`0573d38`、`9f0cc08`。
- 主仓库已迁移到 `Y:\sunkencity`；本线程只在独立 Codex worktree 内工作。
- 现有房间领域继续权威，舞台是附加子系统。
- 不碰 admin、AI 面板、完整 3D VTT、动态光照、墙体视线、战斗自动化。
- 不修改 D1-B 前端运行时文件。
- 不部署生产；功能开关默认关闭、可关闭、可回滚。
- 不覆盖其他线程改动，不带入旧 C 仓库两份未提交 VTT 文档。
- 不安装无关依赖。
- 测试只做与风险匹配的窄测试，不主动深度测试。
- 权限必须来自服务端 capability 投影，不使用 `isCreator` 或前端猜权限。
- D1-B 在契约冻结前不得被要求写共享契约；冻结交付物由 D1-A 提供。

---

## Contract Freeze Gate

冻结闸门是 D1-A 的第一个可审查交付物。闸门通过前，只允许 D1-A 修改契约草案和 mock，不允许 D1-B 依赖未冻结的事件名、错误码或字段。

冻结交付物：

- `apps/shared/stage/stage-contract.ts`：共享类型、命令名、事件名、错误码、版本字段、channel 类型、projection/snapshot/replay source 类型。
- `apps/shared/stage/stage-contract.mock.ts`：D1-B 可消费的 main-room、sub-room、private-thread 三组 mock projection/snapshot。
- `docs/shared-stage-d1a-contract-freeze-2026-07-12.zh-CN.md`：冻结摘要、D1-B 消费方式、禁止前端推断权限清单。
- `apps/server/scripts/stage-contract.test.ts`：契约常量唯一性、版本字段和 mock 基本结构的窄测试。

冻结判定：

- 所有 socket 事件名以 `stage:` 前缀命名，命令事件和广播事件分离。
- 所有写操作命令信封都包含 `contractVersion`、`commandId`、`channelId`、`expectedRevision`、`commandType`、`payload`。
- 所有错误返回都使用冻结错误码，不用自由文本作为程序判断依据。
- 所有 projection 都包含 `contractVersion`、`channel`、`revision`、`viewer`、`capabilities`、`scene`、`actors`、`assetRefs`。
- D1-B 只消费 projection/snapshot/mock，不读取 Prisma 内部模型。

## Planned File Structure

- Create `apps/shared/stage/stage-contract.ts`：D1-A/D1-B 共同契约，包含类型、事件名、错误码、版本字段。
- Create `apps/shared/stage/stage-contract.mock.ts`：前端可离线消费的 mock projection 和 snapshot。
- Create `docs/shared-stage-d1a-contract-freeze-2026-07-12.zh-CN.md`：冻结摘要与交接口径。
- Modify `apps/server/prisma/schema.prisma`：纯增量新增 `stageEnabled` 与舞台模型关系。
- Create `apps/server/prisma/migrations/20260712090000_add_shared_stage_runtime/migration.sql`：SQLite 增量迁移。
- Modify `apps/server/src/modules/rooms/room-auth.ts`：扩展 `RoomCapabilities`，新增舞台 capability 投影。
- Modify `apps/web/src/types/room-contract.ts`：同步服务端投影字段，保持 D1-B 不猜权限。
- Create `apps/server/src/modules/rooms/stage/stage-flags.ts`：功能开关和房间默认关闭判断。
- Create `apps/server/src/modules/rooms/stage/stage-auth.ts`：channel 访问、actor 控制和素材可见性授权。
- Create `apps/server/src/modules/rooms/stage/stage-projection.ts`：服务端裁剪 projection。
- Create `apps/server/src/modules/rooms/stage/stage-events.ts`：事件追加、幂等、revision 和 snapshot 更新边界。
- Create `apps/server/src/modules/rooms/stage/stage-assets.ts`：私有舞台素材授权与代理引用。
- Create `apps/server/src/modules/rooms/stage/stage.service.ts`：REST/gateway 共用应用服务。
- Create `apps/server/src/modules/rooms/stage/stage.routes.ts`：status、snapshot、enable/disable、asset manifest 的 REST 入口。
- Create `apps/server/src/modules/rooms/stage/stage.gateway.ts`：独立 Socket.IO stage gateway 注册函数。
- Modify `apps/server/src/index.ts`：挂载 `stage.routes`，调用 `setupStageGateway(io)`。
- Modify `apps/server/src/config/socket.ts`：只导出认证 socket 类型或复用 helper，不继续堆入舞台事件处理。
- Create `apps/server/scripts/stage-contract.test.ts`：契约窄测试。
- Create `apps/server/scripts/stage-auth.test.ts`：capability、channel、actor、私聊隔离窄测试。
- Create `apps/server/scripts/stage-events.test.ts`：幂等、revision、snapshot 更新窄测试。
- Create `apps/server/scripts/stage-projection.test.ts`：KP/PL/观察者/私聊 projection 裁剪窄测试。
- Create `apps/server/scripts/stage-assets.test.ts`：素材授权和真实路径不泄漏窄测试。

### Task 1: Freeze Shared Contract

**Files:**
- Create: `apps/shared/stage/stage-contract.ts`
- Create: `apps/shared/stage/stage-contract.mock.ts`
- Create: `docs/shared-stage-d1a-contract-freeze-2026-07-12.zh-CN.md`
- Create: `apps/server/scripts/stage-contract.test.ts`

**Interfaces:**
- Consumes: D 路线规格中的 `StageChannel`、`StageEvent`、`StageSnapshot`、`StageProjection`、`PerformanceIntent`。
- Produces: `STAGE_CONTRACT_VERSION`, `STAGE_SOCKET_EVENTS`, `StageCommandEnvelope`, `StageProjection`, `StageSnapshot`, `StageErrorCode`, `mockStageSnapshots`.

- [ ] **Step 1: Create the shared contract file**

```ts
export const STAGE_CONTRACT_VERSION = 'stage.d1a.v1' as const;

export const STAGE_SOCKET_EVENTS = {
  JOIN_CHANNEL: 'stage:channel:join',
  LEAVE_CHANNEL: 'stage:channel:leave',
  COMMAND: 'stage:command',
  COMMAND_ACK: 'stage:command:ack',
  SNAPSHOT: 'stage:snapshot',
  EVENT: 'stage:event',
  ERROR: 'stage:error',
} as const;

export type StageChannelKind = 'MAIN_ROOM' | 'SUB_ROOM' | 'PRIVATE_THREAD';
export type StageViewerKind = 'KP' | 'PLAYER' | 'OBSERVER';
export type StageActorKind = 'PLAYER_CHARACTER' | 'NPC' | 'TEMPORARY';
export type StageVisibility = 'PUBLIC' | 'KP_ONLY' | 'PRIVATE_TARGETS';
export type StageZone = 'far-left' | 'left' | 'center' | 'right' | 'far-right' | 'backstage';
export type StageAssetKind = 'PORTRAIT' | 'BACKGROUND' | 'BGM' | 'AMBIENCE' | 'THEME';

export type StageCommandType =
  | 'ACTOR_ENTER'
  | 'ACTOR_EXIT'
  | 'ACTOR_PERFORM'
  | 'SCENE_SET'
  | 'SCENE_CLEAR'
  | 'CHANNEL_ENABLE'
  | 'CHANNEL_DISABLE';

export type StageErrorCode =
  | 'STAGE_DISABLED'
  | 'STAGE_CHANNEL_NOT_FOUND'
  | 'STAGE_FORBIDDEN'
  | 'STAGE_ACTOR_FORBIDDEN'
  | 'STAGE_ASSET_FORBIDDEN'
  | 'STAGE_REVISION_CONFLICT'
  | 'STAGE_COMMAND_REPLAYED'
  | 'STAGE_INVALID_PAYLOAD'
  | 'STAGE_INTERNAL_ERROR';

export interface StageChannelRef {
  id: string;
  kind: StageChannelKind;
  roomId: string;
  subRoomId?: string;
  privateThreadId?: string;
  parentChannelId?: string;
}

export interface StageViewerProjection {
  userId: string;
  kind: StageViewerKind;
  roomRole: string;
}

export interface StageCapabilitiesProjection {
  canUseStage: boolean;
  canControlOwnStageActor: boolean;
  canManageStage: boolean;
  canManageStageAssets: boolean;
  canExportStageReplay: boolean;
}

export interface StageAssetRef {
  assetId: string;
  kind: StageAssetKind;
  version: number;
  proxyUrl: string;
  width?: number;
  height?: number;
  durationMs?: number;
  hash?: string;
}

export interface StageActorProjection {
  actorId: string;
  actorKind: StageActorKind;
  ownerUserId?: string;
  characterId?: string;
  name: string;
  zone: StageZone;
  entered: boolean;
  expression?: string;
  action?: string;
  portraitAssetId?: string;
  visibility: StageVisibility;
}

export interface StageSceneProjection {
  title: string;
  description?: string;
  backgroundAssetId?: string;
  bgmAssetId?: string;
  ambienceAssetId?: string;
  themePackId?: string;
}

export interface StageProjection {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  channel: StageChannelRef;
  revision: number;
  serverTime: string;
  viewer: StageViewerProjection;
  capabilities: StageCapabilitiesProjection;
  scene: StageSceneProjection;
  actors: StageActorProjection[];
  assetRefs: StageAssetRef[];
}

export interface StageSnapshot {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  channel: StageChannelRef;
  revision: number;
  projection: StageProjection;
}

export interface StageCommandEnvelope<TPayload = unknown> {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  commandId: string;
  channelId: string;
  expectedRevision: number;
  commandType: StageCommandType;
  payload: TPayload;
  messageDraft?: {
    content: string;
    targetUserId?: string;
    mode: 'PUBLIC' | 'PRIVATE';
  };
}

export interface StageCommandAck {
  contractVersion: typeof STAGE_CONTRACT_VERSION;
  commandId: string;
  channelId: string;
  accepted: boolean;
  revision: number;
  error?: {
    code: StageErrorCode;
    message: string;
    latestRevision?: number;
  };
}
```

- [ ] **Step 2: Create stable mock snapshots**

```ts
import { STAGE_CONTRACT_VERSION, StageSnapshot } from './stage-contract';

export const mockStageSnapshots: Record<'mainRoom' | 'subRoom' | 'privateThread', StageSnapshot> = {
  mainRoom: {
    contractVersion: STAGE_CONTRACT_VERSION,
    channel: { id: 'stage-main-room-1', kind: 'MAIN_ROOM', roomId: 'room-public-id' },
    revision: 3,
    projection: {
      contractVersion: STAGE_CONTRACT_VERSION,
      channel: { id: 'stage-main-room-1', kind: 'MAIN_ROOM', roomId: 'room-public-id' },
      revision: 3,
      serverTime: '2026-07-12T01:00:00.000Z',
      viewer: { userId: 'kp-1', kind: 'KP', roomRole: 'OWNER_KP' },
      capabilities: { canUseStage: true, canControlOwnStageActor: true, canManageStage: true, canManageStageAssets: true, canExportStageReplay: true },
      scene: { title: '黑水港码头', backgroundAssetId: 'asset-bg-1', themePackId: 'theme-default' },
      actors: [
        { actorId: 'actor-pl-1', actorKind: 'PLAYER_CHARACTER', ownerUserId: 'pl-1', characterId: 'char-1', name: '林雾', zone: 'left', entered: true, expression: 'calm', visibility: 'PUBLIC' },
        { actorId: 'actor-npc-1', actorKind: 'NPC', name: '码头巡夜人', zone: 'right', entered: true, expression: 'doubt', visibility: 'PUBLIC' },
      ],
      assetRefs: [{ assetId: 'asset-bg-1', kind: 'BACKGROUND', version: 1, proxyUrl: '/api/rooms/room-public-id/stage/assets/asset-bg-1/proxy', width: 1920, height: 1080 }],
    },
  },
  subRoom: {
    contractVersion: STAGE_CONTRACT_VERSION,
    channel: { id: 'stage-sub-1', kind: 'SUB_ROOM', roomId: 'room-public-id', subRoomId: 'sub-room-1', parentChannelId: 'stage-main-room-1' },
    revision: 1,
    projection: {
      contractVersion: STAGE_CONTRACT_VERSION,
      channel: { id: 'stage-sub-1', kind: 'SUB_ROOM', roomId: 'room-public-id', subRoomId: 'sub-room-1', parentChannelId: 'stage-main-room-1' },
      revision: 1,
      serverTime: '2026-07-12T01:01:00.000Z',
      viewer: { userId: 'pl-1', kind: 'PLAYER', roomRole: 'PLAYER' },
      capabilities: { canUseStage: true, canControlOwnStageActor: true, canManageStage: false, canManageStageAssets: false, canExportStageReplay: false },
      scene: { title: '仓库背门', backgroundAssetId: 'asset-bg-2', themePackId: 'theme-default' },
      actors: [{ actorId: 'actor-pl-1', actorKind: 'PLAYER_CHARACTER', ownerUserId: 'pl-1', characterId: 'char-1', name: '林雾', zone: 'center', entered: true, visibility: 'PUBLIC' }],
      assetRefs: [{ assetId: 'asset-bg-2', kind: 'BACKGROUND', version: 1, proxyUrl: '/api/rooms/room-public-id/stage/assets/asset-bg-2/proxy', width: 1920, height: 1080 }],
    },
  },
  privateThread: {
    contractVersion: STAGE_CONTRACT_VERSION,
    channel: { id: 'stage-private-1', kind: 'PRIVATE_THREAD', roomId: 'room-public-id', privateThreadId: 'thread-pl1-kp' },
    revision: 1,
    projection: {
      contractVersion: STAGE_CONTRACT_VERSION,
      channel: { id: 'stage-private-1', kind: 'PRIVATE_THREAD', roomId: 'room-public-id', privateThreadId: 'thread-pl1-kp' },
      revision: 1,
      serverTime: '2026-07-12T01:02:00.000Z',
      viewer: { userId: 'pl-1', kind: 'PLAYER', roomRole: 'PLAYER' },
      capabilities: { canUseStage: true, canControlOwnStageActor: true, canManageStage: false, canManageStageAssets: false, canExportStageReplay: false },
      scene: { title: '私密耳语', themePackId: 'theme-default' },
      actors: [{ actorId: 'actor-pl-1-private', actorKind: 'PLAYER_CHARACTER', ownerUserId: 'pl-1', characterId: 'char-1', name: '林雾', zone: 'left', entered: true, action: 'whisper', visibility: 'PRIVATE_TARGETS' }],
      assetRefs: [],
    },
  },
};
```

- [ ] **Step 3: Write the contract test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { STAGE_CONTRACT_VERSION, STAGE_SOCKET_EVENTS } from '../../shared/stage/stage-contract.ts';
import { mockStageSnapshots } from '../../shared/stage/stage-contract.mock.ts';

test('stage contract exposes a stable d1a version', () => {
  assert.equal(STAGE_CONTRACT_VERSION, 'stage.d1a.v1');
});

test('stage socket event names are unique and namespaced', () => {
  const events = Object.values(STAGE_SOCKET_EVENTS);
  assert.equal(new Set(events).size, events.length);
  for (const eventName of events) assert.match(eventName, /^stage:/);
});

test('stage mocks include contract version channel revision and projection', () => {
  for (const snapshot of Object.values(mockStageSnapshots)) {
    assert.equal(snapshot.contractVersion, STAGE_CONTRACT_VERSION);
    assert.equal(snapshot.projection.contractVersion, STAGE_CONTRACT_VERSION);
    assert.equal(snapshot.channel.id, snapshot.projection.channel.id);
    assert.ok(snapshot.revision >= 1);
  }
});
```

- [ ] **Step 4: Run the contract test**

Run: `cd apps/server; npx tsx scripts/stage-contract.test.ts`

Expected: PASS for three contract tests.

- [ ] **Step 5: Commit the freeze gate**

```bash
git add apps/shared/stage/stage-contract.ts apps/shared/stage/stage-contract.mock.ts docs/shared-stage-d1a-contract-freeze-2026-07-12.zh-CN.md apps/server/scripts/stage-contract.test.ts
git commit -m "docs: freeze shared stage d1a contract"
```

### Task 2: Prisma Models and Migration

**Files:**
- Modify: `apps/server/prisma/schema.prisma`
- Create: `apps/server/prisma/migrations/20260712090000_add_shared_stage_runtime/migration.sql`

**Interfaces:**
- Consumes: `StageChannelKind`, `StageVisibility`, `StageAssetKind`, `STAGE_CONTRACT_VERSION`.
- Produces Prisma delegates: `stageChannel`, `stageEvent`, `stageSnapshot`, `stageActorState`, `stageAsset`, `portraitPack`, `portraitVariant`, `stageThemePack`.

- [ ] **Step 1: Add schema fields and models**

```prisma
model Room {
  stageEnabled Boolean @default(false)
  stageChannels StageChannel[]
  stageAssets StageAsset[]
  portraitPacks PortraitPack[]
  stageThemePacks StageThemePack[]
}

model StageChannel {
  id              String   @id @default(uuid())
  roomId          String
  kind            String
  subRoomId       String?
  privateThreadId String?
  parentChannelId String?
  status          String   @default("DISABLED")
  revision        Int      @default(0)
  timebaseStartedAt DateTime @default(now())
  inheritedFromChannelId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  room            Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  events          StageEvent[]
  snapshots       StageSnapshot[]
  actorStates     StageActorState[]

  @@unique([roomId, kind, subRoomId, privateThreadId])
  @@index([roomId, status])
}

model StageEvent {
  id              String   @id @default(uuid())
  channelId       String
  roomId          String
  commandId       String
  eventType       String
  contractVersion String
  actorId         String?
  roomMessageId   String?
  operatorUserId  String?
  targetUserIds   String   @default("[]")
  visibility      String   @default("PUBLIC")
  beforeRevision  Int
  afterRevision   Int
  payload         String   @default("{}")
  createdAt       DateTime @default(now())

  channel         StageChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@unique([channelId, commandId])
  @@index([channelId, afterRevision])
  @@index([roomId, createdAt])
}

model StageSnapshot {
  id              String   @id @default(uuid())
  channelId       String
  roomId          String
  revision        Int
  contractVersion String
  projectionJson  String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  channel         StageChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@unique([channelId, revision])
  @@index([roomId, updatedAt])
}

model StageActorState {
  id              String   @id @default(uuid())
  channelId       String
  actorKind       String
  ownerUserId     String?
  characterId     String?
  npcId           String?
  temporaryName   String?
  portraitPackId  String?
  portraitVariantId String?
  zone            String   @default("center")
  entered         Boolean  @default(false)
  visibility      String   @default("PUBLIC")
  lockedByKp      Boolean  @default(false)
  stateJson       String   @default("{}")
  updatedAt       DateTime @updatedAt

  channel         StageChannel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@index([channelId, ownerUserId])
  @@index([channelId, characterId])
}

model StageAsset {
  id              String   @id @default(uuid())
  roomId          String
  uploadedById    String
  kind            String
  visibility      String   @default("PRIVATE_ROOM")
  originalName    String
  mimeType        String
  size            Int
  hash            String
  storageKey      String
  proxyStorageKey String?
  width           Int?
  height          Int?
  durationMs      Int?
  version         Int      @default(1)
  metadataJson    String   @default("{}")
  deletedAt       DateTime?
  createdAt       DateTime @default(now())

  room            Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, kind, createdAt])
  @@index([hash])
}

model PortraitPack {
  id              String   @id @default(uuid())
  roomId          String
  ownerUserId     String
  characterId     String?
  name            String
  defaultVariantId String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  room            Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)
  variants        PortraitVariant[]

  @@index([roomId, ownerUserId])
  @@index([roomId, characterId])
}

model PortraitVariant {
  id              String   @id @default(uuid())
  packId          String
  assetId         String
  label           String
  expression      String?
  action          String?
  anchorJson      String   @default("{}")
  createdAt       DateTime @default(now())

  pack            PortraitPack @relation(fields: [packId], references: [id], onDelete: Cascade)

  @@unique([packId, label])
}

model StageThemePack {
  id              String   @id @default(uuid())
  roomId          String
  name            String
  manifestJson    String
  assetIdsJson    String   @default("[]")
  version         Int      @default(1)
  createdById     String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  room            Room     @relation(fields: [roomId], references: [id], onDelete: Cascade)

  @@index([roomId, createdAt])
}
```

- [ ] **Step 2: Create the SQLite migration**

```sql
ALTER TABLE "Room" ADD COLUMN "stageEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "StageChannel" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "roomId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "subRoomId" TEXT,
  "privateThreadId" TEXT,
  "parentChannelId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DISABLED',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "timebaseStartedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "inheritedFromChannelId" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "StageChannel_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "StageChannel_roomId_kind_subRoomId_privateThreadId_key" ON "StageChannel"("roomId", "kind", "subRoomId", "privateThreadId");
CREATE INDEX "StageChannel_roomId_status_idx" ON "StageChannel"("roomId", "status");
```

The migration continues with matching `CREATE TABLE` and indexes for `StageEvent`, `StageSnapshot`, `StageActorState`, `StageAsset`, `PortraitPack`, `PortraitVariant`, and `StageThemePack` using the schema above.

- [ ] **Step 3: Validate the Prisma schema**

Run: `cd apps/server; npx prisma validate --schema prisma/schema.prisma`

Expected: Prisma schema is valid.

- [ ] **Step 4: Commit schema and migration**

```bash
git add apps/server/prisma/schema.prisma apps/server/prisma/migrations/20260712090000_add_shared_stage_runtime/migration.sql
git commit -m "feat: add shared stage persistence models"
```

### Task 3: Capability Projection

**Files:**
- Modify: `apps/server/src/modules/rooms/room-auth.ts`
- Modify: `apps/web/src/types/room-contract.ts`
- Create: `apps/server/scripts/stage-auth.test.ts`

**Interfaces:**
- Consumes: existing `RoomRoleView`, lifecycle, room membership.
- Produces: `canUseStage`, `canControlOwnStageActor`, `canManageStage`, `canManageStageAssets`, `canExportStageReplay`.

- [ ] **Step 1: Extend `RoomCapabilities`**

```ts
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
  canUseStage: boolean;
  canControlOwnStageActor: boolean;
  canManageStage: boolean;
  canManageStageAssets: boolean;
  canExportStageReplay: boolean;
}
```

- [ ] **Step 2: Compute stage capabilities from role and lifecycle**

```ts
return {
  canEnterRoom: isMember,
  canJoinAsPlayer: role === 'NON_MEMBER' && beforeStart,
  canJoinAsObserver: role === 'NON_MEMBER' && !closed,
  canChangeCharacter: isPlayer && beforeStart,
  canRequestCharacterChange: isPlayer && active,
  canStartRoom: isKp && beforeStart,
  canPauseRoom: isKp && lifecycle === 'IN_PROGRESS',
  canResumeRoom: isKp && lifecycle === 'PAUSED',
  canEnterFinishing: isKp && active,
  canFinalizeRoom: isKp && finishing,
  canCancelRoom: isKp && beforeStart,
  canCloseRoom: role === 'OWNER_KP' && canMutate,
  canUseKPTools: isKp && canMutate,
  canManageMembers: isKp && canMutate,
  canManageScene: isKp && canMutate,
  canManageClues: isKp && canMutate,
  canManageNpcs: isKp && canMutate,
  canManageCombat: isKp && canMutate,
  canSendPublicMessage: isMember && !closed,
  canSendPrivateMessage: (isKp || isPlayer) && !closed,
  canRollPublicDice: (isKp || isPlayer) && !closed,
  canRollSecretDice: isKp && canMutate,
  canViewSecretEvents: isKp,
  canViewPublicContent: isMember,
  canUseStage: isMember && !closed,
  canControlOwnStageActor: isPlayer && !closed,
  canManageStage: isKp && canMutate,
  canManageStageAssets: isKp && canMutate,
  canExportStageReplay: isKp,
};
```

- [ ] **Step 3: Write capability tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { capabilitiesFor } from '../src/modules/rooms/room-auth.ts';

test('stage capabilities are projected from service-side room role and lifecycle', () => {
  const kp = capabilitiesFor('OWNER_KP', 'IN_PROGRESS');
  assert.equal(kp.canUseStage, true);
  assert.equal(kp.canManageStage, true);
  assert.equal(kp.canManageStageAssets, true);
  assert.equal(kp.canExportStageReplay, true);

  const player = capabilitiesFor('PLAYER', 'IN_PROGRESS');
  assert.equal(player.canUseStage, true);
  assert.equal(player.canControlOwnStageActor, true);
  assert.equal(player.canManageStage, false);

  const observer = capabilitiesFor('OBSERVER', 'IN_PROGRESS');
  assert.equal(observer.canUseStage, true);
  assert.equal(observer.canControlOwnStageActor, false);
  assert.equal(observer.canManageStage, false);

  const closed = capabilitiesFor('PLAYER', 'FINISHED');
  assert.equal(closed.canUseStage, false);
  assert.equal(closed.canControlOwnStageActor, false);
});
```

- [ ] **Step 4: Run the capability test**

Run: `cd apps/server; npx tsx scripts/stage-auth.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit capability projection**

```bash
git add apps/server/src/modules/rooms/room-auth.ts apps/web/src/types/room-contract.ts apps/server/scripts/stage-auth.test.ts
git commit -m "feat: project shared stage capabilities"
```

### Task 4: Stage Auth and Channel Rules

**Files:**
- Create: `apps/server/src/modules/rooms/stage/stage-auth.ts`
- Update: `apps/server/scripts/stage-auth.test.ts`

**Interfaces:**
- Consumes: `requireRoomCapability`, `RoomMember`, `SubRoomMember`, private message participants, `StageCapabilitiesProjection`.
- Produces: `authorizeStageChannelAccess`, `authorizeStageActorCommand`, `authorizeStageAssetUse`.

- [ ] **Step 1: Implement channel access rules**

```ts
export type StageChannelInput =
  | { kind: 'MAIN_ROOM'; roomId: string }
  | { kind: 'SUB_ROOM'; roomId: string; subRoomId: string }
  | { kind: 'PRIVATE_THREAD'; roomId: string; privateThreadId: string; participantUserIds: string[] };

export interface StageChannelAccessResult {
  allowed: boolean;
  viewerKind: 'KP' | 'PLAYER' | 'OBSERVER';
  reason?: 'NO_ROOM_ACCESS' | 'NOT_SUB_ROOM_MEMBER' | 'NOT_PRIVATE_PARTICIPANT';
  canManageStage: boolean;
}

export function authorizeStageChannelAccess(input: {
  channel: StageChannelInput;
  userId: string;
  role: 'OWNER_KP' | 'ASSISTANT_KP' | 'PLAYER' | 'OBSERVER' | 'NON_MEMBER';
  capabilities: {
    canUseStage: boolean;
    canManageStage: boolean;
  };
  subRoomMemberUserIds?: string[];
}): StageChannelAccessResult {
  if (!input.capabilities.canUseStage) {
    return { allowed: false, viewerKind: 'OBSERVER', reason: 'NO_ROOM_ACCESS', canManageStage: false };
  }

  const viewerKind = input.role === 'OWNER_KP' || input.role === 'ASSISTANT_KP'
    ? 'KP'
    : input.role === 'PLAYER'
      ? 'PLAYER'
      : 'OBSERVER';

  if (input.channel.kind === 'SUB_ROOM' && !input.capabilities.canManageStage) {
    const members = input.subRoomMemberUserIds ?? [];
    if (!members.includes(input.userId)) {
      return { allowed: false, viewerKind, reason: 'NOT_SUB_ROOM_MEMBER', canManageStage: false };
    }
  }

  if (input.channel.kind === 'PRIVATE_THREAD' && !input.capabilities.canManageStage) {
    if (!input.channel.participantUserIds.includes(input.userId)) {
      return { allowed: false, viewerKind, reason: 'NOT_PRIVATE_PARTICIPANT', canManageStage: false };
    }
  }

  return { allowed: true, viewerKind, canManageStage: input.capabilities.canManageStage };
}
```

- [ ] **Step 2: Implement actor control rules**

```ts
export function authorizeStageActorCommand(input: {
  actorKind: 'PLAYER_CHARACTER' | 'NPC' | 'TEMPORARY';
  ownerUserId?: string | null;
  userId: string;
  capabilities: {
    canControlOwnStageActor: boolean;
    canManageStage: boolean;
  };
}) {
  if (input.capabilities.canManageStage) return { allowed: true as const };
  if (input.actorKind === 'PLAYER_CHARACTER' && input.ownerUserId === input.userId && input.capabilities.canControlOwnStageActor) {
    return { allowed: true as const };
  }
  return { allowed: false as const, code: 'STAGE_ACTOR_FORBIDDEN' as const };
}
```

- [ ] **Step 3: Add tests for main room, sub-room, private thread and actor trimming**

```ts
test('stage channel access trims sub-room and private-thread viewers on the server', () => {
  const playerCaps = { canUseStage: true, canManageStage: false };
  assert.equal(authorizeStageChannelAccess({
    channel: { kind: 'MAIN_ROOM', roomId: 'r1' },
    userId: 'pl1',
    role: 'PLAYER',
    capabilities: playerCaps,
  }).allowed, true);

  assert.equal(authorizeStageChannelAccess({
    channel: { kind: 'SUB_ROOM', roomId: 'r1', subRoomId: 's1' },
    userId: 'pl1',
    role: 'PLAYER',
    capabilities: playerCaps,
    subRoomMemberUserIds: ['pl2'],
  }).reason, 'NOT_SUB_ROOM_MEMBER');

  assert.equal(authorizeStageChannelAccess({
    channel: { kind: 'PRIVATE_THREAD', roomId: 'r1', privateThreadId: 'p1', participantUserIds: ['kp1', 'pl2'] },
    userId: 'pl1',
    role: 'PLAYER',
    capabilities: playerCaps,
  }).reason, 'NOT_PRIVATE_PARTICIPANT');
});

test('stage actor commands allow own player character and kp managed objects only', () => {
  assert.equal(authorizeStageActorCommand({
    actorKind: 'PLAYER_CHARACTER',
    ownerUserId: 'pl1',
    userId: 'pl1',
    capabilities: { canControlOwnStageActor: true, canManageStage: false },
  }).allowed, true);

  assert.equal(authorizeStageActorCommand({
    actorKind: 'NPC',
    userId: 'pl1',
    capabilities: { canControlOwnStageActor: true, canManageStage: false },
  }).allowed, false);

  assert.equal(authorizeStageActorCommand({
    actorKind: 'NPC',
    userId: 'kp1',
    capabilities: { canControlOwnStageActor: false, canManageStage: true },
  }).allowed, true);
});
```

- [ ] **Step 4: Run the auth tests**

Run: `cd apps/server; npx tsx scripts/stage-auth.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit channel auth**

```bash
git add apps/server/src/modules/rooms/stage/stage-auth.ts apps/server/scripts/stage-auth.test.ts
git commit -m "feat: authorize shared stage channels"
```

### Task 5: Event Store and Snapshot Runtime

**Files:**
- Create: `apps/server/src/modules/rooms/stage/stage-events.ts`
- Create: `apps/server/scripts/stage-events.test.ts`

**Interfaces:**
- Consumes: `StageCommandEnvelope`, Prisma transaction client.
- Produces: `appendStageEvent`, `applyStageEventToSnapshot`, immutable event append behavior.

- [ ] **Step 1: Implement pure revision logic**

```ts
export function nextStageRevision(input: { currentRevision: number; expectedRevision: number }) {
  if (input.expectedRevision !== input.currentRevision) {
    return {
      ok: false as const,
      code: 'STAGE_REVISION_CONFLICT' as const,
      latestRevision: input.currentRevision,
    };
  }
  return { ok: true as const, beforeRevision: input.currentRevision, afterRevision: input.currentRevision + 1 };
}

export function buildStageEventPayload(input: {
  commandId: string;
  commandType: string;
  operatorUserId: string;
  beforeRevision: number;
  afterRevision: number;
  payload: unknown;
}) {
  return {
    commandId: input.commandId,
    eventType: input.commandType,
    operatorUserId: input.operatorUserId,
    beforeRevision: input.beforeRevision,
    afterRevision: input.afterRevision,
    payload: input.payload,
  };
}
```

- [ ] **Step 2: Implement append behavior around Prisma transaction**

```ts
export async function appendStageEvent(input: {
  tx: {
    stageEvent: {
      findUnique(args: unknown): Promise<{ id: string; afterRevision: number; payload: string } | null>;
      create(args: unknown): Promise<{ id: string; afterRevision: number }>;
    };
    stageChannel: {
      update(args: unknown): Promise<{ id: string; revision: number }>;
    };
  };
  channelId: string;
  roomId: string;
  commandId: string;
  eventType: string;
  contractVersion: string;
  operatorUserId: string;
  visibility: string;
  beforeRevision: number;
  afterRevision: number;
  payload: unknown;
}) {
  const existing = await input.tx.stageEvent.findUnique({
    where: { channelId_commandId: { channelId: input.channelId, commandId: input.commandId } },
  });
  if (existing) {
    return { replayed: true as const, event: existing };
  }

  const event = await input.tx.stageEvent.create({
    data: {
      channelId: input.channelId,
      roomId: input.roomId,
      commandId: input.commandId,
      eventType: input.eventType,
      contractVersion: input.contractVersion,
      operatorUserId: input.operatorUserId,
      visibility: input.visibility,
      beforeRevision: input.beforeRevision,
      afterRevision: input.afterRevision,
      payload: JSON.stringify(input.payload),
    },
  });
  await input.tx.stageChannel.update({
    where: { id: input.channelId },
    data: { revision: input.afterRevision },
  });
  return { replayed: false as const, event };
}
```

- [ ] **Step 3: Write pure tests for conflict and idempotency**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStageEventPayload, nextStageRevision } from '../src/modules/rooms/stage/stage-events.ts';

test('stage revision rejects stale commands', () => {
  assert.deepEqual(nextStageRevision({ currentRevision: 5, expectedRevision: 4 }), {
    ok: false,
    code: 'STAGE_REVISION_CONFLICT',
    latestRevision: 5,
  });
});

test('stage revision advances by one for accepted commands', () => {
  assert.deepEqual(nextStageRevision({ currentRevision: 5, expectedRevision: 5 }), {
    ok: true,
    beforeRevision: 5,
    afterRevision: 6,
  });
});

test('stage event payload preserves immutable source command data', () => {
  const event = buildStageEventPayload({
    commandId: 'cmd-1',
    commandType: 'ACTOR_PERFORM',
    operatorUserId: 'pl-1',
    beforeRevision: 1,
    afterRevision: 2,
    payload: { actorId: 'actor-1', action: 'nod' },
  });
  assert.equal(event.commandId, 'cmd-1');
  assert.equal(event.afterRevision, 2);
  assert.deepEqual(event.payload, { actorId: 'actor-1', action: 'nod' });
});
```

- [ ] **Step 4: Run the event tests**

Run: `cd apps/server; npx tsx scripts/stage-events.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit event runtime**

```bash
git add apps/server/src/modules/rooms/stage/stage-events.ts apps/server/scripts/stage-events.test.ts
git commit -m "feat: add shared stage event runtime"
```

### Task 6: Projection and Snapshot Service

**Files:**
- Create: `apps/server/src/modules/rooms/stage/stage-projection.ts`
- Update: `apps/server/scripts/stage-projection.test.ts`

**Interfaces:**
- Consumes: stored channel, actor states, asset records, viewer auth.
- Produces: `buildStageProjection`, `trimStageAssetRefs`, `serializeStageSnapshot`.

- [ ] **Step 1: Implement server-side projection trimming**

```ts
export function canViewerSeeActor(input: {
  visibility: 'PUBLIC' | 'KP_ONLY' | 'PRIVATE_TARGETS';
  viewerUserId: string;
  viewerCanManageStage: boolean;
  targetUserIds?: string[];
}) {
  if (input.visibility === 'PUBLIC') return true;
  if (input.viewerCanManageStage) return true;
  if (input.visibility === 'PRIVATE_TARGETS') return (input.targetUserIds ?? []).includes(input.viewerUserId);
  return false;
}

export function trimStageAssetRefs<T extends { visibility: string; proxyUrl: string; storageKey?: string; allowedUserIds?: string[] }>(input: {
  assets: T[];
  viewerUserId: string;
  viewerCanManageStage: boolean;
}) {
  return input.assets
    .filter((asset) => asset.visibility === 'PUBLIC' || input.viewerCanManageStage || (asset.allowedUserIds ?? []).includes(input.viewerUserId))
    .map(({ storageKey: _storageKey, allowedUserIds: _allowedUserIds, ...safe }) => safe);
}
```

- [ ] **Step 2: Implement projection serializer**

```ts
export function serializeStageSnapshot(input: {
  contractVersion: 'stage.d1a.v1';
  channel: { id: string; kind: 'MAIN_ROOM' | 'SUB_ROOM' | 'PRIVATE_THREAD'; roomId: string };
  revision: number;
  projection: unknown;
}) {
  return {
    contractVersion: input.contractVersion,
    channel: input.channel,
    revision: input.revision,
    projection: input.projection,
  };
}
```

- [ ] **Step 3: Write projection tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewerSeeActor, trimStageAssetRefs } from '../src/modules/rooms/stage/stage-projection.ts';

test('stage projection hides kp-only actors from players and observers', () => {
  assert.equal(canViewerSeeActor({ visibility: 'KP_ONLY', viewerUserId: 'pl1', viewerCanManageStage: false }), false);
  assert.equal(canViewerSeeActor({ visibility: 'KP_ONLY', viewerUserId: 'kp1', viewerCanManageStage: true }), true);
});

test('stage projection exposes private actors only to targets and kp', () => {
  assert.equal(canViewerSeeActor({ visibility: 'PRIVATE_TARGETS', viewerUserId: 'pl1', viewerCanManageStage: false, targetUserIds: ['pl1'] }), true);
  assert.equal(canViewerSeeActor({ visibility: 'PRIVATE_TARGETS', viewerUserId: 'pl2', viewerCanManageStage: false, targetUserIds: ['pl1'] }), false);
});

test('stage projection never returns storage keys in asset refs', () => {
  const refs = trimStageAssetRefs({
    viewerUserId: 'pl1',
    viewerCanManageStage: false,
    assets: [
      { visibility: 'PUBLIC', proxyUrl: '/api/rooms/r1/stage/assets/a1/proxy', storageKey: 'private/a1.png' },
      { visibility: 'KP_ONLY', proxyUrl: '/api/rooms/r1/stage/assets/a2/proxy', storageKey: 'private/a2.png' },
    ],
  });
  assert.equal(refs.length, 1);
  assert.equal('storageKey' in refs[0], false);
});
```

- [ ] **Step 4: Run projection tests**

Run: `cd apps/server; npx tsx scripts/stage-projection.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit projection runtime**

```bash
git add apps/server/src/modules/rooms/stage/stage-projection.ts apps/server/scripts/stage-projection.test.ts
git commit -m "feat: trim shared stage projections"
```

### Task 7: Stage Asset Authorization

**Files:**
- Create: `apps/server/src/modules/rooms/stage/stage-assets.ts`
- Create: `apps/server/scripts/stage-assets.test.ts`

**Interfaces:**
- Consumes: `StageAsset`, `PortraitPack`, room capability, channel visibility.
- Produces: `authorizeStageAssetRead`, `buildStageAssetProxyUrl`, `validateThemeManifest`.

- [ ] **Step 1: Implement asset read authorization**

```ts
export function authorizeStageAssetRead(input: {
  visibility: 'PUBLIC' | 'PRIVATE_ROOM' | 'KP_ONLY' | 'PRIVATE_TARGETS';
  viewerUserId: string;
  roomUserIds: string[];
  targetUserIds?: string[];
  canManageStage: boolean;
}) {
  if (input.visibility === 'PUBLIC') return true;
  if (input.canManageStage) return true;
  if (input.visibility === 'PRIVATE_ROOM') return input.roomUserIds.includes(input.viewerUserId);
  if (input.visibility === 'PRIVATE_TARGETS') return (input.targetUserIds ?? []).includes(input.viewerUserId);
  return false;
}

export function buildStageAssetProxyUrl(input: { publicRoomId: string; assetId: string; version: number }) {
  return `/api/rooms/${encodeURIComponent(input.publicRoomId)}/stage/assets/${encodeURIComponent(input.assetId)}/proxy?v=${input.version}`;
}
```

- [ ] **Step 2: Validate declarative theme manifests**

```ts
const blockedThemeKeys = new Set(['html', 'script', 'javascript', 'remoteScriptUrl', 'styleTag']);

export function validateThemeManifest(input: Record<string, unknown>) {
  for (const key of Object.keys(input)) {
    if (blockedThemeKeys.has(key)) {
      return { ok: false as const, code: 'STAGE_INVALID_PAYLOAD' as const, field: key };
    }
  }
  return { ok: true as const };
}
```

- [ ] **Step 3: Write asset tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeStageAssetRead, buildStageAssetProxyUrl, validateThemeManifest } from '../src/modules/rooms/stage/stage-assets.ts';

test('stage assets require room membership or kp capability', () => {
  assert.equal(authorizeStageAssetRead({
    visibility: 'PRIVATE_ROOM',
    viewerUserId: 'pl1',
    roomUserIds: ['pl1'],
    canManageStage: false,
  }), true);

  assert.equal(authorizeStageAssetRead({
    visibility: 'PRIVATE_ROOM',
    viewerUserId: 'outsider',
    roomUserIds: ['pl1'],
    canManageStage: false,
  }), false);
});

test('stage proxy urls do not expose storage keys', () => {
  assert.equal(buildStageAssetProxyUrl({ publicRoomId: 'abc', assetId: 'asset-1', version: 2 }), '/api/rooms/abc/stage/assets/asset-1/proxy?v=2');
});

test('theme manifests are declarative and reject executable fields', () => {
  assert.equal(validateThemeManifest({ dialogBox: { padding: 16 } }).ok, true);
  assert.equal(validateThemeManifest({ script: 'alert(1)' }).ok, false);
});
```

- [ ] **Step 4: Run asset tests**

Run: `cd apps/server; npx tsx scripts/stage-assets.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit asset authorization**

```bash
git add apps/server/src/modules/rooms/stage/stage-assets.ts apps/server/scripts/stage-assets.test.ts
git commit -m "feat: authorize shared stage assets"
```

### Task 8: REST Service and Feature Flags

**Files:**
- Create: `apps/server/src/modules/rooms/stage/stage-flags.ts`
- Create: `apps/server/src/modules/rooms/stage/stage.service.ts`
- Create: `apps/server/src/modules/rooms/stage/stage.routes.ts`
- Modify: `apps/server/src/index.ts`

**Interfaces:**
- Consumes: Prisma delegates, `requireRoomCapability`, stage auth/projection/assets.
- Produces REST endpoints: `GET /api/rooms/:roomId/stage/status`, `GET /api/rooms/:roomId/stage/channels/:channelId/snapshot`, `POST /api/rooms/:roomId/stage/enable`, `POST /api/rooms/:roomId/stage/disable`, `GET /api/rooms/:roomId/stage/assets/:assetId/proxy`.

- [ ] **Step 1: Implement default-off flag helpers**

```ts
export function stageGlobalEnabled() {
  return process.env.ROOM_STAGE_ENABLED === 'true';
}

export function canAcceptStageCommands(input: { globalEnabled: boolean; roomStageEnabled: boolean }) {
  return input.globalEnabled && input.roomStageEnabled;
}
```

- [ ] **Step 2: Implement status response shape**

```ts
export function buildStageStatus(input: {
  globalEnabled: boolean;
  roomStageEnabled: boolean;
  canUseStage: boolean;
  canManageStage: boolean;
}) {
  const commandEnabled = canAcceptStageCommands({
    globalEnabled: input.globalEnabled,
    roomStageEnabled: input.roomStageEnabled,
  });
  return {
    contractVersion: 'stage.d1a.v1',
    enabled: commandEnabled && input.canUseStage,
    roomStageEnabled: input.roomStageEnabled,
    globalEnabled: input.globalEnabled,
    capabilities: {
      canUseStage: input.canUseStage,
      canManageStage: input.canManageStage,
    },
  };
}
```

- [ ] **Step 3: Add routes with capability checks**

```ts
router.get('/:roomId/stage/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const auth = await requireRoomCapability(req.params.roomId, req.userId || req.user?.userId, 'canViewPublicContent');
    res.json({
      success: true,
      data: buildStageStatus({
        globalEnabled: stageGlobalEnabled(),
        roomStageEnabled: Boolean(auth.room.stageEnabled),
        canUseStage: auth.capabilities.canUseStage,
        canManageStage: auth.capabilities.canManageStage,
      }),
    });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 4: Mount stage routes**

```ts
import stageRoutes from './modules/rooms/stage/stage.routes';
app.use('/api/rooms', stageRoutes);
```

- [ ] **Step 5: Commit REST and flags**

```bash
git add apps/server/src/modules/rooms/stage/stage-flags.ts apps/server/src/modules/rooms/stage/stage.service.ts apps/server/src/modules/rooms/stage/stage.routes.ts apps/server/src/index.ts
git commit -m "feat: add shared stage rest runtime"
```

### Task 9: Independent Socket Gateway

**Files:**
- Create: `apps/server/src/modules/rooms/stage/stage.gateway.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/src/config/socket.ts`

**Interfaces:**
- Consumes: authenticated Socket.IO user, `StageCommandEnvelope`, `stage.service`.
- Produces: `setupStageGateway(io)`, socket events listed in `STAGE_SOCKET_EVENTS`.

- [ ] **Step 1: Create gateway registration**

```ts
import type { Server, Socket } from 'socket.io';
import { STAGE_SOCKET_EVENTS } from '../../../../../shared/stage/stage-contract';

interface StageSocket extends Socket {
  user?: { userId: string; nickname: string };
}

export function setupStageGateway(io: Server) {
  io.on('connection', (socket: StageSocket) => {
    socket.on(STAGE_SOCKET_EVENTS.JOIN_CHANNEL, async (data: { roomId: string; channelId: string }) => {
      if (!socket.user?.userId) {
        socket.emit(STAGE_SOCKET_EVENTS.ERROR, { code: 'STAGE_FORBIDDEN', message: '请先登录' });
        return;
      }
      socket.join(`stage:${data.channelId}:user:${socket.user.userId}`);
      socket.emit(STAGE_SOCKET_EVENTS.SNAPSHOT, { channelId: data.channelId, pending: true });
    });

    socket.on(STAGE_SOCKET_EVENTS.LEAVE_CHANNEL, (data: { channelId: string }) => {
      if (socket.user?.userId) socket.leave(`stage:${data.channelId}:user:${socket.user.userId}`);
    });
  });
}
```

- [ ] **Step 2: Wire the gateway in server startup**

```ts
import { setupStageGateway } from './modules/rooms/stage/stage.gateway';
setupSocketHandlers(io);
setupStageGateway(io);
```

- [ ] **Step 3: Keep legacy socket file from owning stage commands**

```ts
export interface SocketUser {
  userId: string;
  email: string;
  nickname: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}
```

- [ ] **Step 4: Add a manual smoke checklist to freeze doc**

```markdown
Socket smoke scope:
- connect with valid auth;
- join `stage:{channelId}` only after service authorization;
- issue stale `expectedRevision` and receive `STAGE_REVISION_CONFLICT`;
- issue duplicate `commandId` and receive the original ack;
- verify private-thread projection is emitted only to authorized user room scopes.
```

- [ ] **Step 5: Commit gateway wiring**

```bash
git add apps/server/src/modules/rooms/stage/stage.gateway.ts apps/server/src/index.ts apps/server/src/config/socket.ts docs/shared-stage-d1a-contract-freeze-2026-07-12.zh-CN.md
git commit -m "feat: register shared stage socket gateway"
```

### Task 10: Command Service and Message Boundary

**Files:**
- Modify: `apps/server/src/modules/rooms/stage/stage.service.ts`
- Update: `apps/server/scripts/stage-events.test.ts`

**Interfaces:**
- Consumes: `StageCommandEnvelope`, `RoomMessage` when `messageDraft` exists.
- Produces: transactional command handling where room message persists before stage event projection.

- [ ] **Step 1: Implement command result shape**

```ts
export type StageCommandResult =
  | { accepted: true; commandId: string; channelId: string; revision: number }
  | { accepted: false; commandId: string; channelId: string; revision: number; code: string; latestRevision?: number };
```

- [ ] **Step 2: Enforce disabled flag before mutation**

```ts
if (!canAcceptStageCommands({ globalEnabled: stageGlobalEnabled(), roomStageEnabled: room.stageEnabled })) {
  return {
    accepted: false,
    commandId: envelope.commandId,
    channelId: envelope.channelId,
    revision: channel.revision,
    code: 'STAGE_DISABLED',
  };
}
```

- [ ] **Step 3: Persist message draft first when present**

```ts
const savedMessage = envelope.messageDraft
  ? await tx.roomMessage.create({
      data: {
        roomId: room.id,
        userId,
        nickname,
        content: envelope.messageDraft.content,
        type: envelope.messageDraft.mode === 'PRIVATE' ? 'private' : 'text',
        meta: JSON.stringify({
          stageCommandId: envelope.commandId,
          stageChannelId: envelope.channelId,
          targetUserId: envelope.messageDraft.targetUserId,
        }),
      },
    })
  : null;
```

- [ ] **Step 4: Return conflict without local success**

```ts
const revision = nextStageRevision({ currentRevision: channel.revision, expectedRevision: envelope.expectedRevision });
if (!revision.ok) {
  return {
    accepted: false,
    commandId: envelope.commandId,
    channelId: envelope.channelId,
    revision: channel.revision,
    code: revision.code,
    latestRevision: revision.latestRevision,
  };
}
```

- [ ] **Step 5: Commit command service**

```bash
git add apps/server/src/modules/rooms/stage/stage.service.ts apps/server/scripts/stage-events.test.ts
git commit -m "feat: process shared stage commands"
```

### Task 11: Narrow Verification and Handoff

**Files:**
- Modify: `docs/shared-stage-d1a-contract-freeze-2026-07-12.zh-CN.md`

**Interfaces:**
- Consumes: completed D1-A commits and test outputs.
- Produces: codex_delegation handoff to main planning thread.

- [ ] **Step 1: Run narrow tests only**

Run:

```powershell
cd apps/server
npx tsx scripts/stage-contract.test.ts
npx tsx scripts/stage-auth.test.ts
npx tsx scripts/stage-events.test.ts
npx tsx scripts/stage-projection.test.ts
npx tsx scripts/stage-assets.test.ts
npx prisma validate --schema prisma/schema.prisma
```

Expected: all listed narrow checks pass.

- [ ] **Step 2: Capture final diff scope**

Run: `git status --short --branch`

Expected: branch `codex/shared-stage-d1a-runtime` with no unrelated files.

- [ ] **Step 3: Send handoff to main planning thread**

Handoff body:

```xml
<codex_delegation>
  <source_thread_id>019f28d2-2b01-7803-bfb1-3bec010497a4</source_thread_id>
  <input>D1-A 首轮交接：worktree=C:\Users\29102\.codex\worktrees\d886\sunkencity；branch=codex/shared-stage-d1a-runtime；baselineHead=9f0cc08604299c9fed0ba0645bd86db98905da2c。已完成契约冻结闸门、后端运行时计划、默认关闭与回滚边界；D1-B 在冻结前不得写共享契约。提交列表、窄测试结果和遗留风险见本线程最终交接。</input>
</codex_delegation>
```

- [ ] **Step 4: Commit handoff doc update if verification notes changed**

```bash
git add docs/shared-stage-d1a-contract-freeze-2026-07-12.zh-CN.md
git commit -m "docs: hand off shared stage d1a runtime"
```

## Self-Review

- Spec coverage: Prisma 增量模型与迁移、独立 stage service/gateway、主房间/子房间/私聊 `StageChannel` 权限裁剪、capability 投影、`StageEvent`/`StageSnapshot`/不可变源事件/回放边界、素材访问授权、默认关闭/可关闭/可回滚、D1-B 冻结契约交付物均有任务覆盖。
- Placeholder scan: 本计划没有使用 `TBD`、`TODO`、`fill in details` 或未定义接口名。
- Type consistency: `STAGE_CONTRACT_VERSION`、`StageCommandEnvelope`、`StageProjection`、`StageSnapshot`、`StageErrorCode` 在冻结任务中定义，并被后续任务按同名消费。
- Boundary check: 未规划 admin、AI 面板、完整 3D VTT、动态光照、墙体视线、战斗自动化或 D1-B 前端运行时修改。

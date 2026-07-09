# 结团后的角色成长 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在房间生命周期与结算链路稳定后，建立正式的“结团后角色成长”流程，让 KP 结算、PL 成长检定、角色卡写回和报告展示各自职责清晰。

**Architecture:** 不把技能成长逻辑继续塞进 `RoomSettlementPanel`。后端在 `RoomSettlement.skillGrowth` 草案之外新增独立的房间成长服务与状态字段，前端新增“结团成长”入口，PL 只能处理自己已结团房间的角色成长，KP 保留查看和确认边界。现有 `POST /api/characters/:id/growth` 继续保留为角色页手动成长入口，但房间成长走新接口，避免绕过房间成员、结算和已应用状态。

**Tech Stack:** Express + Prisma + SQLite + Zod，React 18 + TypeScript + Vite，现有 `room-contract.ts`、`room-settlement.service.ts`、`CharacterGrowthPage` 成长规则函数、房间 capability contract。

---

## 0. 当前边界

已上线能力：

- 房间身份：`OWNER_KP | ASSISTANT_KP | PLAYER | OBSERVER | NON_MEMBER`
- 房间生命周期：`PREPARING | READY | IN_PROGRESS | PAUSED | FINISHING | FINISHED | CANCELLED`
- 结算表：`RoomSettlement`
- 结团写回：当前只写回 HP / MP / SAN 和用户 EXP
- 报告页：能读取结算摘要、KP 备注、`skillGrowth` JSON 草案

本计划不修改：

- Socket 事件格式
- 战斗系统
- 房间生命周期状态机
- 后台 admin
- `outputs/`

验证策略：

- 默认只跑窄范围 `typecheck` 和针对性脚本。
- 不跑深度 E2E、Playwright 或全站视觉回归，除非用户明确要求。

## 1. 文件结构

### 新增文件

- `apps/server/src/modules/rooms/room-growth.service.ts`
  - 房间成长读取、投骰、保存、应用写回。
- `apps/web/src/services/room-growth.service.ts`
  - 前端调用房间成长接口。
- `apps/web/src/pages/rooms/components/RoomGrowthPanel.tsx`
  - 已结团房间中的 PL 成长界面。

### 修改文件

- `apps/server/prisma/schema.prisma`
  - 为房间成长新增最小持久化模型。
- `apps/server/src/modules/rooms/room-lifecycle.routes.ts`
  - 挂载成长接口。
- `apps/server/src/modules/characters/character.routes.ts`
  - 给旧手动成长接口补输入校验；不移除。
- `apps/server/src/modules/reports/report.routes.ts`
  - 报告页读取正式成长结果，而不是只读 JSON 草案。
- `apps/web/src/types/room-contract.ts`
  - 增加房间成长类型。
- `apps/web/src/pages/rooms/RoomReportPage.tsx`
  - 显示已完成成长结果。
- `apps/web/src/pages/rooms/RoomPage.tsx`
  - 在 `FINISHED` 且当前用户是相关 PL 时显示成长入口。
- `apps/web/src/pages/characters/CharacterGrowthPage.tsx`
  - 继续保留手动成长，但文案区分“手动战后成长”和“房间结团成长”。

## 2. 数据模型

### Task 1: 增加房间成长记录

**Files:**

- Modify: `apps/server/prisma/schema.prisma`

- [ ] **Step 1: 新增 Prisma 模型**

在 `RoomSettlement` 下方新增：

```prisma
model RoomCharacterGrowth {
  id           String   @id @default(uuid())
  roomRunId     String
  roomId        String
  characterId   String
  userId        String
  status        String   @default("PENDING") // PENDING | ROLLED | APPLIED
  source        String   @default("room_settlement")
  eligibleSkills String  @default("[]")
  growthResults String   @default("[]")
  appliedAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  roomRun      RoomRun   @relation(fields: [roomRunId], references: [id], onDelete: Cascade)
  room         Room      @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  character    Character @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@unique([roomRunId, characterId])
  @@index([roomId])
  @@index([userId])
  @@index([characterId])
  @@index([status])
}
```

同时给相关模型补关系：

```prisma
model User {
  roomCharacterGrowths RoomCharacterGrowth[]
}

model Character {
  roomCharacterGrowths RoomCharacterGrowth[]
}

model Room {
  characterGrowths RoomCharacterGrowth[]
}

model RoomRun {
  characterGrowths RoomCharacterGrowth[]
}
```

- [ ] **Step 2: 迁移命名**

执行时使用：

```powershell
cd apps/server
npx prisma migrate dev --name add_room_character_growth
```

预期：生成一个只新增 `RoomCharacterGrowth` 和关系索引的迁移，不改旧表字段。

## 3. 后端成长服务

### Task 2: 建立房间成长服务

**Files:**

- Create: `apps/server/src/modules/rooms/room-growth.service.ts`
- Modify: `apps/server/src/modules/rooms/room-lifecycle.routes.ts`

- [ ] **Step 1: 新增输入 schema**

在 `room-growth.service.ts` 中定义：

```ts
import { NextFunction, Response } from 'express';
import { z, ZodError } from 'zod';
import { prisma } from '../../config/database';
import { AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { requireRoomCapability } from './room-auth';

const eligibleSkillSchema = z.object({
  skillKey: z.string().min(1),
  skillName: z.string().min(1),
  before: z.number().int().min(0).max(99),
});

const growthResultSchema = eligibleSkillSchema.extend({
  rollResult: z.number().int().min(1).max(100),
  success: z.boolean(),
  after: z.number().int().min(0).max(99),
});

const saveEligibleSkillsSchema = z.object({
  eligibleSkills: z.array(eligibleSkillSchema).max(30),
});
```

- [ ] **Step 2: 添加安全 JSON helper**

```ts
function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function rollSkillGrowth(currentValue: number) {
  const rollResult = Math.floor(Math.random() * 100) + 1;
  const success = rollResult > currentValue;
  const gain = success ? Math.floor(Math.random() * 10) + 1 : 0;
  return {
    rollResult,
    success,
    after: Math.min(99, currentValue + gain),
  };
}
```

- [ ] **Step 3: 读取当前用户的房间成长**

```ts
export async function getMyRoomGrowth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { room, role, lifecycle } = await requireRoomCapability(roomId, userId, 'canViewPublicContent');

    if (lifecycle !== 'FINISHED') {
      throw new AppError('ROOM_GROWTH_NOT_AVAILABLE', '只有已结团房间可以进行角色成长', 400);
    }

    if (role !== 'PLAYER') {
      throw new AppError('ROOM_GROWTH_PLAYER_ONLY', '只有本房间玩家可以处理自己的角色成长', 403);
    }

    const run = await prisma.roomRun.findUnique({
      where: { roomId: room.id },
      include: {
        participants: {
          where: { userId, role: 'PLAYER', characterId: { not: null } },
          include: { character: true },
        },
        settlements: true,
      },
    });

    if (!run || run.participants.length !== 1 || !run.participants[0].characterId) {
      throw new AppError('ROOM_GROWTH_PARTICIPANT_NOT_FOUND', '未找到本房间的玩家角色记录', 404);
    }

    const participant = run.participants[0];
    const existing = await prisma.roomCharacterGrowth.findUnique({
      where: { roomRunId_characterId: { roomRunId: run.id, characterId: participant.characterId! } },
    });

    res.json({
      success: true,
      data: {
        roomRunId: run.id,
        lifecycle,
        character: participant.character,
        growth: existing
          ? {
              ...existing,
              eligibleSkills: parseJsonArray(existing.eligibleSkills),
              growthResults: parseJsonArray(existing.growthResults),
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
}
```

- [ ] **Step 4: 保存可成长技能**

```ts
export async function saveMyRoomGrowthEligibleSkills(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const payload = saveEligibleSkillsSchema.parse(req.body ?? {});
    const { room, role, lifecycle } = await requireRoomCapability(roomId, userId, 'canViewPublicContent');

    if (lifecycle !== 'FINISHED') {
      throw new AppError('ROOM_GROWTH_NOT_AVAILABLE', '只有已结团房间可以保存成长技能', 400);
    }
    if (role !== 'PLAYER') {
      throw new AppError('ROOM_GROWTH_PLAYER_ONLY', '只有本房间玩家可以保存自己的成长技能', 403);
    }

    const run = await prisma.roomRun.findUnique({
      where: { roomId: room.id },
      include: { participants: { where: { userId, role: 'PLAYER', characterId: { not: null } } } },
    });
    const participant = run?.participants[0];
    if (!run || !participant?.characterId) {
      throw new AppError('ROOM_GROWTH_PARTICIPANT_NOT_FOUND', '未找到本房间的玩家角色记录', 404);
    }

    const growth = await prisma.roomCharacterGrowth.upsert({
      where: { roomRunId_characterId: { roomRunId: run.id, characterId: participant.characterId } },
      create: {
        roomRunId: run.id,
        roomId: room.id,
        characterId: participant.characterId,
        userId,
        status: 'PENDING',
        eligibleSkills: JSON.stringify(payload.eligibleSkills),
        growthResults: '[]',
      },
      update: {
        eligibleSkills: JSON.stringify(payload.eligibleSkills),
        status: 'PENDING',
        growthResults: '[]',
      },
    });

    res.json({ success: true, data: { growth } });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_ROOM_GROWTH_PAYLOAD', '成长数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}
```

- [ ] **Step 5: 执行成长检定**

```ts
export async function rollMyRoomGrowth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { room, role, lifecycle } = await requireRoomCapability(roomId, userId, 'canViewPublicContent');

    if (lifecycle !== 'FINISHED') {
      throw new AppError('ROOM_GROWTH_NOT_AVAILABLE', '只有已结团房间可以执行成长检定', 400);
    }
    if (role !== 'PLAYER') {
      throw new AppError('ROOM_GROWTH_PLAYER_ONLY', '只有本房间玩家可以执行自己的成长检定', 403);
    }

    const run = await prisma.roomRun.findUnique({ where: { roomId: room.id } });
    if (!run) throw new AppError('ROOM_RUN_NOT_FOUND', '房间进程不存在', 404);

    const growth = await prisma.roomCharacterGrowth.findFirst({
      where: { roomRunId: run.id, userId, status: 'PENDING' },
    });
    if (!growth) {
      throw new AppError('ROOM_GROWTH_NOT_READY', '请先选择可成长技能', 400);
    }

    const eligibleSkills = eligibleSkillSchema.array().parse(parseJsonArray(growth.eligibleSkills));
    const growthResults = eligibleSkills.map(skill => ({
      ...skill,
      ...rollSkillGrowth(skill.before),
    }));

    const updated = await prisma.roomCharacterGrowth.update({
      where: { id: growth.id },
      data: { status: 'ROLLED', growthResults: JSON.stringify(growthResults) },
    });

    res.json({ success: true, data: { growth: updated, growthResults } });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_ROOM_GROWTH_PAYLOAD', '成长数据格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}
```

- [ ] **Step 6: 应用成长写回角色卡**

```ts
export async function applyMyRoomGrowth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomId } = req.params;
    const userId = req.userId!;
    const { room, role, lifecycle } = await requireRoomCapability(roomId, userId, 'canViewPublicContent');

    if (lifecycle !== 'FINISHED') {
      throw new AppError('ROOM_GROWTH_NOT_AVAILABLE', '只有已结团房间可以应用成长', 400);
    }
    if (role !== 'PLAYER') {
      throw new AppError('ROOM_GROWTH_PLAYER_ONLY', '只有本房间玩家可以应用自己的成长', 403);
    }

    const result = await prisma.$transaction(async tx => {
      const run = await tx.roomRun.findUnique({ where: { roomId: room.id } });
      if (!run) throw new AppError('ROOM_RUN_NOT_FOUND', '房间进程不存在', 404);

      const growth = await tx.roomCharacterGrowth.findFirst({
        where: { roomRunId: run.id, userId, status: 'ROLLED', appliedAt: null },
        include: { character: true },
      });
      if (!growth) throw new AppError('ROOM_GROWTH_NOT_ROLLED', '没有可应用的成长结果', 400);

      const growthResults = growthResultSchema.array().parse(parseJsonArray(growth.growthResults));
      const currentSkills = JSON.parse(growth.character.skills || '{}') as Record<string, number>;
      for (const item of growthResults) {
        currentSkills[item.skillKey] = item.after;
      }

      const character = await tx.character.update({
        where: { id: growth.characterId },
        data: { skills: JSON.stringify(currentSkills) },
      });
      const updatedGrowth = await tx.roomCharacterGrowth.update({
        where: { id: growth.id },
        data: { status: 'APPLIED', appliedAt: new Date() },
      });

      return { character, growth: updatedGrowth, appliedGrowthCount: growthResults.length };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return next(new AppError('INVALID_ROOM_GROWTH_RESULT', '成长结果格式不正确', 400, error.flatten()));
    }
    next(error);
  }
}
```

- [ ] **Step 7: 挂载路由**

在 `room-lifecycle.routes.ts` 增加：

```ts
import {
  applyMyRoomGrowth,
  getMyRoomGrowth,
  rollMyRoomGrowth,
  saveMyRoomGrowthEligibleSkills,
} from './room-growth.service';

router.get('/:roomId/growth/me', authMiddleware, getMyRoomGrowth);
router.put('/:roomId/growth/me/eligible-skills', authMiddleware, saveMyRoomGrowthEligibleSkills);
router.post('/:roomId/growth/me/roll', authMiddleware, rollMyRoomGrowth);
router.post('/:roomId/growth/me/apply', authMiddleware, applyMyRoomGrowth);
```

## 4. 前端接入

### Task 3: 增加前端契约和 service

**Files:**

- Modify: `apps/web/src/types/room-contract.ts`
- Create: `apps/web/src/services/room-growth.service.ts`

- [ ] **Step 1: 增加类型**

```ts
export interface RoomGrowthEligibleSkill {
  skillKey: string;
  skillName: string;
  before: number;
}

export interface RoomGrowthResult extends RoomGrowthEligibleSkill {
  rollResult: number;
  success: boolean;
  after: number;
}

export interface RoomCharacterGrowthView {
  id: string;
  roomRunId: string;
  roomId: string;
  characterId: string;
  userId: string;
  status: 'PENDING' | 'ROLLED' | 'APPLIED';
  eligibleSkills: RoomGrowthEligibleSkill[];
  growthResults: RoomGrowthResult[];
  appliedAt: string | null;
}

export interface RoomGrowthMeResponse {
  roomRunId: string;
  lifecycle: RoomLifecycle;
  character: unknown;
  growth: RoomCharacterGrowthView | null;
}
```

- [ ] **Step 2: 新增 service**

```ts
import { apiFetch, handleApiResponse } from '../lib/api';
import type { RoomGrowthEligibleSkill, RoomGrowthMeResponse, RoomGrowthResult } from '../types/room-contract';

export function getMyRoomGrowth(roomId: string) {
  return apiFetch(`/rooms/${roomId}/growth/me`).then((res) => handleApiResponse<RoomGrowthMeResponse>(res));
}

export function saveMyRoomGrowthEligibleSkills(roomId: string, eligibleSkills: RoomGrowthEligibleSkill[]) {
  return apiFetch(`/rooms/${roomId}/growth/me/eligible-skills`, {
    method: 'PUT',
    body: JSON.stringify({ eligibleSkills }),
  }).then((res) => handleApiResponse(res));
}

export function rollMyRoomGrowth(roomId: string) {
  return apiFetch(`/rooms/${roomId}/growth/me/roll`, { method: 'POST' })
    .then((res) => handleApiResponse<{ growthResults: RoomGrowthResult[] }>(res));
}

export function applyMyRoomGrowth(roomId: string) {
  return apiFetch(`/rooms/${roomId}/growth/me/apply`, { method: 'POST' })
    .then((res) => handleApiResponse<{ appliedGrowthCount: number }>(res));
}
```

### Task 4: 新增结团成长面板

**Files:**

- Create: `apps/web/src/pages/rooms/components/RoomGrowthPanel.tsx`
- Modify: `apps/web/src/pages/rooms/RoomPage.tsx`

- [ ] **Step 1: 面板职责**

`RoomGrowthPanel` 只处理当前登录 PL 自己的角色成长：

- 读取已结团房间成长状态。
- 从角色当前技能里选择本局可成长技能。
- 保存选择。
- 执行成长检定。
- 应用写回。

- [ ] **Step 2: 状态结构**

```ts
interface RoomGrowthPanelProps {
  roomId: string;
}

type GrowthStep = 'select' | 'rolled' | 'applied';
```

- [ ] **Step 3: 渲染规则**

在 `RoomPage.tsx` 中只在以下条件显示：

```tsx
{room.lifecycle === 'FINISHED' && room.myRole === 'PLAYER' && (
  <RoomGrowthPanel roomId={room.roomId} />
)}
```

不要给 KP 或 OBSERVER 显示操作入口。KP 查看成长汇总放报告页，不放这里。

### Task 5: 报告页显示正式成长结果

**Files:**

- Modify: `apps/server/src/modules/reports/report.routes.ts`
- Modify: `apps/web/src/pages/rooms/RoomReportPage.tsx`

- [ ] **Step 1: 后端报告聚合 `RoomCharacterGrowth`**

在报告查询 `roomRun` include 中增加：

```ts
characterGrowths: true
```

把成长记录按 `characterId` 合并到 `characterProgress`：

```ts
const growthByCharacterId = new Map(
  (room.roomRun?.characterGrowths || []).map(growth => [
    growth.characterId,
    {
      status: growth.status,
      eligibleSkills: parseJsonArray(growth.eligibleSkills),
      growthResults: parseJsonArray(growth.growthResults),
      appliedAt: growth.appliedAt,
    },
  ])
);
```

- [ ] **Step 2: 前端报告显示**

在“角色成长”tab 中优先显示正式 `roomGrowth.growthResults`；如果不存在，再显示旧 `settlement.skillGrowth` 草案。

文案：

```text
正式成长结果
结算草案记录
```

## 5. 旧角色成长接口加固

### Task 6: 给手动成长接口补输入校验

**Files:**

- Modify: `apps/server/src/modules/characters/character.routes.ts`
- Modify: `apps/web/src/pages/characters/CharacterGrowthPage.tsx`

- [ ] **Step 1: 后端校验**

在 `POST /api/characters/:id/growth` 中加入：

```ts
const growthPayloadSchema = z.object({
  growths: z.array(z.object({
    skillName: z.string().min(1),
    newValue: z.number().int().min(0).max(99),
  })).max(30),
});
```

用 `growthPayloadSchema.parse(req.body)` 替代直接读取 `req.body.growths`。

- [ ] **Step 2: 前端文案区分**

把 `CharacterGrowthPage` 说明改为：

```text
这是手动战后成长工具。已结团房间的正式成长请从对应房间报告或房间页进入。
```

## 6. 验证

### Task 7: 窄范围验证

**Files:**

- No source file change required

- [ ] **Step 1: 后端 typecheck**

```powershell
cd apps/server
npm run typecheck
```

Expected: TypeScript exits 0.

- [ ] **Step 2: 前端 typecheck**

```powershell
cd apps/web
npm run typecheck
```

Expected: TypeScript exits 0.

- [ ] **Step 3: 只在用户明确要求时跑写入型专项冒烟**

```powershell
cd apps/server
$env:DATABASE_URL="file:./dev.db"
$env:ROOM_SYSTEM_SMOKE_WRITE="1"
$env:ROOM_SYSTEM_SMOKE_BASE_URL="http://127.0.0.1:3001"
npm run test:room-system
```

Expected: 仅在本地测试库生成 `CodexSmoke*` 数据。不要对生产库随手执行。

## 7. 验收标准

- KP 结算工作台仍然只负责结算，不直接执行技能成长。
- 已结团 PL 能进入自己的成长流程。
- OBSERVER、NON_MEMBER 不能执行成长。
- 成长结果只能应用一次。
- 应用后角色卡技能更新，报告页显示正式成长结果。
- 旧手动成长页仍可用，但不会被误认为房间正式成长。
- 不改变已上线生命周期、角色锁、结团写回 HP / MP / SAN / EXP 的行为。

## 8. 推荐执行顺序

1. Task 1：数据模型。
2. Task 2：后端成长服务。
3. Task 3：前端契约与 service。
4. Task 4：PL 成长面板。
5. Task 5：报告页汇总。
6. Task 6：旧手动成长接口加固。
7. Task 7：窄范围验证。

原因：先建立可重复、可追踪的数据来源，再接前端；报告页最后聚合，避免 UI 先依赖临时字段。

## 9. Self-Review

- Spec coverage: 覆盖交接建议中的“结团后的角色成长机制”，且没有把技能成长直接塞进现有最小结算工作台。
- Placeholder scan: 未发现占位式任务；后续阶段均有明确文件、接口、数据结构和验证范围。
- Type consistency: 后端 `RoomCharacterGrowth`、前端 `RoomCharacterGrowthView`、成长状态 `PENDING | ROLLED | APPLIED` 命名一致。
- Testing constraint: 默认只使用 typecheck；写入型冒烟脚本明确标注必须用户授权，不对生产随手执行。

# Sunken City Room Recruitment Phase 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为房间增加招募资料、跑团风格标签、玩家申请和新手/KP 小抄的最小数据与接口底座，降低凑人难、风格不匹配和新手门槛。

**Architecture:** Phase 7 使用独立招募资料和申请表，不改变房间成员绑定、加入流程、生命周期或结算契约。第一版仅让 KP 描述房间风格、查看/审核申请，并让玩家提交申请；批准申请不会自动加入房间，后续邀请/加入机制单独实现。

**Tech Stack:** Express + Prisma + SQLite + Zod，React 18 + TypeScript + Vite，复用 `requireRoomCapability`、`apiFetch` 和房间页最小面板。

---

## Scope

包含：

- 房间招募资料：状态、招募标题、简介、风格标签、人数建议、时间要求、门槛说明。
- 玩家申请加入：申请留言、经验说明、可用时间、偏好标签。
- KP 审核申请：待审核、通过、拒绝、撤回。
- 新手 PL 入房小抄。
- 新手 KP 开团检查清单。

不包含：

- 招募广场视觉页。
- 自动加入房间。
- 后台 admin。
- AI 招募文案生成。
- 官方规则书自动化。
- Socket、骰点、战斗、私聊、生命周期、结算写回。

## Data Model

新增：

- `RoomRecruitmentProfile`
- `RoomJoinApplication`

`RoomRecruitmentProfile` 绑定房间招募资料，`RoomJoinApplication` 记录用户申请。`RoomJoinApplication.status` 使用：

```text
PENDING
APPROVED
DECLINED
WITHDRAWN
```

## API

新增路由：

- `GET /api/rooms/:roomId/recruitment`
- `PUT /api/rooms/:roomId/recruitment/profile`
- `POST /api/rooms/:roomId/recruitment/applications`
- `PATCH /api/rooms/:roomId/recruitment/applications/:applicationId`
- `POST /api/rooms/:roomId/recruitment/applications/:applicationId/withdraw`

权限：

- 已登录用户可读取公开招募资料。
- KP 使用 `canManageMembers` 管理招募资料和审核申请。
- 非成员可提交自己的申请。
- 申请人可撤回自己的待审核申请。

## Frontend

新增 `RoomRecruitmentPanel`：

- KP 可编辑招募资料和新手/KP 小抄。
- KP 可查看申请列表并通过/拒绝。
- 非 KP 可查看风格标签、人数建议和小抄。
- 非成员申请入口后续由招募页接入；本面板先提供房间内最小管理和展示。

## Verification

仅执行轻量验证：

```powershell
Set-Location apps/server
npx prisma validate --schema prisma/schema.prisma
npm run typecheck
Set-Location ..\web
npm run typecheck
Set-Location ..\..
git diff --check
```

应用本地迁移前备份 SQLite：

```powershell
Copy-Item "$env:LOCALAPPDATA\SunkenCity\dev.db" "$env:LOCALAPPDATA\SunkenCity\dev.before-room-recruitment-20260705.db"
Set-Location apps/server
npx prisma migrate deploy --schema prisma/schema.prisma
```

# Sunken City Room Operations Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 AI 展示暂时留空的前提下，为房间页增加一个非 AI 的跑团总览入口，把调查、排期、沟通和招募待办汇总到一处。

**Architecture:** 不新增数据库表，只新增只读聚合接口 `GET /api/rooms/:roomId/overview`。接口使用现有 capability contract，PL 只看到公开统计，KP 额外看到待处理申请、邀请、KP 私密便签数量等管理待办。前端新增最小面板，不做视觉重构。

**Tech Stack:** Express + Prisma + React TypeScript，复用已有 RoomCurrentFocus、Investigation、Coordination、Communication、Recruitment 数据。

---

## Scope

- [ ] 新增 `room-overview.service.ts` 和 `room-overview.routes.ts`。
- [ ] 在 `index.ts` 挂载 `/api/rooms/:roomId/overview`。
- [ ] 新增 `room-overview-contract.ts` 与 `room-overview.service.ts`。
- [ ] 新增 `RoomOperationsOverviewPanel.tsx`。
- [ ] 在 `RoomPage.tsx` 挂载总览面板。
- [ ] 从 `RoomPage.tsx` 暂时移除 AI 基础面板展示，保留后台 AI 骨架。

## Non-goals

- 不新增数据库表。
- 不调用 AI。
- 不改 Socket、骰点、战斗、私聊、结算或房间生命周期。
- 不做视觉重构。

## Validation

- 后端 `npm run typecheck`
- 前端 `npm run typecheck`
- `git diff --check`
- 后端 `/health`

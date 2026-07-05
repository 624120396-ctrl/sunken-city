# Sunken City AI Foundation Phase 8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为调查体验升级建立安全的 AI 基础骨架：房间级设置、任务队列、上下文边界和用量审计，但不调用任何真实 AI 供应商接口。

**Architecture:** 后端新增独立 `room-ai` 路由和服务，所有 AI 操作先写入 `AiJob` 草稿/队列记录，供应商与模型由 `ai-provider.service.ts` 按任务类型和房间设置解析。上下文构建只支持 `PLAYER_VISIBLE` 第一版：公开调查档案、当前焦点、备团公开内容、公开日志和当前用户自己的角色绑定；不读取私聊、KP 私密便签、隐藏线索、未公开 NPC/场景或后台数据。

**Tech Stack:** Express + Prisma + SQLite，React 18 + TypeScript。模型路线保留 DeepSeek V4 / V4.1 Flash、Doubao-Seed-Character、Seedream 4.5 的可配置字段；语音能力只保留只读关闭状态。

---

## Scope

- [ ] 新增 `RoomAiSettings`、`AiJob`、`AiUsageLedger`、`AiContextSnapshot`。
- [ ] 新增迁移 `20260705180000_add_room_ai_foundation`。
- [ ] 新增 `ai-provider.service.ts`，只做模型选择，不发请求。
- [ ] 新增 `room-ai-context.service.ts`，只构建 `PLAYER_VISIBLE` 上下文。
- [ ] 新增 `room-ai.routes.ts`，提供设置、上下文预览、任务创建、任务列表、审计列表。
- [ ] 新增最小前端 `RoomAiFoundationPanel`，仅用于查看/配置/创建草稿任务。
- [ ] 路由挂载到 `/api/rooms/:roomId/ai-foundation`，不触碰旧 Socket、骰点、战斗、私聊和生命周期契约。

## Non-goals

- 不调用 DeepSeek、Doubao、Seedream 或任何付费接口。
- 不做 AI 自动 KP。
- 不读取 KP 私密便签、私聊、隐藏线索、隐藏 NPC、隐藏场景。
- 不开启 TTS、STT、实时语音。
- 不做视觉重构。
- 不碰后台 admin。

## Validation

- `npx prisma validate --schema prisma/schema.prisma`
- `npx prisma generate --schema prisma/schema.prisma`
- `npx prisma migrate deploy --schema prisma/schema.prisma`
- `npx prisma migrate status --schema prisma/schema.prisma`
- `npm run typecheck` in `apps/server`
- `npm run typecheck` in `apps/web`
- `git diff --check`
- `GET http://127.0.0.1:3001/health`

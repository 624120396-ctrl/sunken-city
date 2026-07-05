# Sunken City AI Asset Registry Phase 9 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Seedream 4.5 素材工坊建立不付费的资产台账和语音能力预留结构，先管理提示词、用途、关联对象、可见性和审批状态。

**Architecture:** 在 Phase 8 的 `ai-foundation` 路由下扩展 `AiAsset` 草稿管理。当前只保存素材意图和外部 URL / 存储路径占位，不调用 Seedream、不上传、不生成文件。所有素材默认 `KP_ONLY + DRAFT`，公开需要 KP 手动修改。

**Tech Stack:** Prisma + Express + React TypeScript。素材类型覆盖 `IMAGE`、`TEXT`、`AUDIO_RESERVED`；语音仍保持预留，不提供开启入口。

---

## Scope

- [ ] 新增 `AiAsset` 模型。
- [ ] 新增迁移 `20260705190000_add_ai_asset_registry`。
- [ ] 扩展 `room-ai.routes.ts`：
  - `GET /:roomId/ai-foundation/assets`
  - `POST /:roomId/ai-foundation/assets`
  - `PATCH /:roomId/ai-foundation/assets/:assetId`
- [ ] 扩展前端契约、服务和 `RoomAiFoundationPanel` 的素材草稿区。

## Non-goals

- 不调用 Seedream 4.5。
- 不生成图片、不生成语音。
- 不做文件上传。
- 不做视觉重构。

## Validation

- `npx prisma validate --schema prisma/schema.prisma`
- `npx prisma generate --schema prisma/schema.prisma`
- `npx prisma migrate deploy --schema prisma/schema.prisma`
- 后端 / 前端 `npm run typecheck`
- `git diff --check`
- 后端 `/health`

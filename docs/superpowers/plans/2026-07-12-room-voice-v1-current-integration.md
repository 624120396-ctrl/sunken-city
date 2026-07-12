# 房间语音 V1 当前集成基线实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在共享舞台与发布脚本硬化基线 `96641b2` 上保留所有现有功能，并让房间真人语音具备明确的生命周期、容量准入和 KP/PL 三入口。

**Architecture:** 不从旧语音分支 cherry-pick。以 `96641b2` 已有 LiveKit SDK、房间权限和舞台实现为唯一基础，在语音 token 路由中先做生命周期与容量校验，再签发短期 token。容量使用 LiveKit `RoomServiceClient.listParticipants()`，查询失败时拒绝签发；并发 token 请求仍是服务端查询后的近似边界。

**Tech Stack:** Express、Prisma 房间视图、LiveKit Server SDK、React、Node test/tsx、Vite。

---

### Task 1: 建立当前基线语音与舞台保真测试

**Files:**
- Modify: `apps/server/scripts/room-voice-access.test.ts`
- Create: `apps/web/scripts/room-voice-entry.test.ts`
- Create: `apps/web/scripts/room-voice-stage-integration.test.ts`
- Modify: `apps/web/scripts/room-voice-panel.test.ts`
- Modify: `apps/server/package.json`
- Modify: `apps/web/package.json`

- [x] 写入生命周期允许/拒绝和容量边界的断言，先运行 `npx tsx --test scripts/room-voice-access.test.ts`，预期因缺少 guard 失败。
- [x] 写入 PL 桌面调查板、PL 移动行动抽屉、KP CommandRail 的源码装配断言，先运行 `npm run test:room-voice`，预期因 PL 调查板入口缺失失败。
- [x] 写入舞台保真断言：`RoomPage` 保留 `RoomStageShell`，`RoomStageShell` 保留频道标签，服务端 `index.ts` 继续注册 stage routes；先运行该测试，预期在实现前失败或确认基线保真。

### Task 2: 语音生命周期与容量准入

**Files:**
- Modify: `apps/server/src/modules/rooms/room-voice.service.ts`
- Modify: `apps/server/src/modules/rooms/room-voice.routes.ts`
- Modify: `apps/server/scripts/room-voice-access.test.ts`

- [x] 导出 `isRoomVoiceLifecycleAllowed(lifecycle)`，仅接受 `PREPARING`、`READY`、`IN_PROGRESS`、`PAUSED`。
- [x] 在 status 与 token 共用的房间鉴权路径中拒绝 `FINISHING`、`FINISHED`、`CANCELLED`，保留现有 `myRole`、`myCapabilities`、`myBinding` 计算，不用 `isCreator` 或页面状态推断权限。
- [x] 用 `RoomServiceClient.listParticipants(roomName)` 检查当前参与者数；到达 `ROOM_VOICE_MAX_PARTICIPANTS` 时返回 `VOICE_ROOM_FULL`，查询失败时以 `VOICE_CAPACITY_CHECK_FAILED` 503 fail-closed。
- [x] 将容量检查置于 token 签发之前；在交接中注明这是查询后近似上限，不能把并发请求宣称为原子硬锁。

### Task 3: 人工三方前端整合

**Files:**
- Modify: `apps/web/src/pages/rooms/RoomPage.tsx`
- Modify: `apps/web/src/pages/rooms/components/RoomPlayerView.tsx`
- Modify: `apps/web/src/pages/rooms/components/RoomCommandRail.tsx`
- Modify: `apps/web/src/pages/rooms/components/RoomVoicePanel.tsx`
- Create: `apps/web/src/pages/rooms/components/roomVoiceMeta.ts`
- Modify: `apps/web/src/styles/room-visual-rebuild.css`

- [x] KP 只在 CommandRail 挂载语音面板。
- [x] PL 桌面在 `room-player-board` 顶部挂载紧凑语音面板，避免依赖 KP rail 的布局位置。
- [x] PL 移动端继续只在行动抽屉挂载，保持聊天输入与骰点区域不被挤占。
- [x] 抽离无 JSX 的语音状态文案工具模块，使 Node 窄测试不直接加载 LiveKit React 面板。

### Task 4: 验证、交接与提交

**Files:**
- Create: `docs/room-voice-v1-current-integration-handoff-2026-07-12.zh-CN.md`

- [x] 运行 `npm run test:room-voice`（server 与 web）、`npm run test:stage`、server/web `npm run typecheck` 与 web `npm run build`。
- [x] 检查暂存 diff 只涉及语音、测试和语音交接，不包含 stage public contract、admin、AI、发布脚本或生成 outputs。
- [ ] 在 `codex/voice-v1-current-integration` 提交、HTTPS 推送；如网络失败，保留精确 commit 并报告失败证据。

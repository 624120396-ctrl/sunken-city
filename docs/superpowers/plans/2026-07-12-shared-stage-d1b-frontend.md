# Shared Improvisational AVG Stage D1-B Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏已定版房间基础体验的前提下，以可关闭、路由级懒加载的 2D Pixi AVG 舞台扩展 KP、PL 与观察者的房间前端。

**Architecture:** 既有 `RoomPage` 继续拥有房间、聊天、调查与现有工具状态；新增的房间舞台功能只消费 D1-A 服务端裁剪后的快照、事件和能力投影。`RoomStageShell` 负责本地视图偏好、活动 `StageChannel`、renderer 生命周期与 DOM 回退；Pixi、音频和 DOM 各自只消费同一份 adapter 输出，绝不成为业务真相。

**Tech Stack:** React 18、TypeScript、现有 Socket.IO client、D1-A 冻结的 stage 前端契约、PixiJS（房间路由级动态导入）、既有 CSS 与 Lucide。

## Global Constraints

- 本计划仅覆盖 D1-B；不实现 D2 回放工作室、D3 剪辑导出或 D4 桌面客户端。
- 已部署房间桌面三栏与既有移动端信息架构是受保护基线；AVG 舞台只作为中央主视图的可关闭附加子系统接入。
- 房间级 `stageEnabled` 默认关闭；用户级舞台视图偏好只存本地，绝不写入公共房间状态。
- 只依据 D1-A 服务端投影显示与启用控件；不得使用 `isCreator`、角色名、局部推断或未裁剪的房间状态判断权限。
- 主房间、每个子房间和每个可演出的私聊分别消费独立 `StageChannel`；同一客户端一次只运行一个 Pixi renderer。
- Pixi display object、纹理、音频实例、DOM 节点、抽屉状态和输入草稿均为客户端临时状态，不能成为房间真相。
- 关闭舞台、reduced-motion、低功耗、WebGL 不可用或 context 丢失时，DOM 记录与输入必须继续可用；renderer 失败不得影响消息、骰点、线索或角色数值。
- 首期不接入 Three/R3F、Live2D、AI 面板、admin、动态光照、墙体视线、战斗自动化或完整 3D VTT。
- 不在 D1-A 冻结前定义、模拟或推断共享 REST/Socket 事件、Prisma 模型、权限字段或服务端 gateway。
- 除风险匹配的窄验证外，不执行深度测试、不部署生产、不提交 `outputs/`、截图或 `tmp/`。

---

## Contract Freeze Gate

本仓库的当前 `RoomCapabilities` 只含既有房间能力，`apps/web/package.json` 也尚未引入 PixiJS；当前分支没有可消费的 stage 共享类型或 Socket 绑定。因而以下所有正式实现任务必须等待 D1-A 的冻结提交进入本分支或由主线程提供可 cherry-pick 的提交。

在开始 Task 2 前，D1-B 维护者必须将 D1-A 提交 SHA 与实际导出路径补入本节，并用 TypeScript 编译确认下列内容均可直接导入。此处不是让 D1-B 补写这些定义：这些内容完全由 D1-A 拥有。

1. `stageEnabled` 与 D1-A 最终的舞台能力投影，至少能区分查看、控制自己 actor、管理全局舞台与管理舞台资产；能力为 `false` 时前端不得发送相应命令。
2. `StageChannel` 标识、channel 参与范围、继承/覆盖信息、统一时间基准，以及主房间、子房间和私聊的选择方式。
3. 已裁剪的 `StageSnapshot`、增量 `StageEvent`、投影 revision、受众安全的逻辑资产引用，以及完整的初次获取/重连恢复入口。
4. 统一命令信封的最终 TypeScript 类型和结果类型：`commandId`、`channelId`、`expectedRevision`、`commandType`、`payload` 与可选 `messageDraft`；包括幂等成功、权限拒绝、revision 冲突和返回最新快照的表达方式。
5. 最终 Socket 订阅/取消订阅、事件广播和 snapshot 请求绑定；不同 `StageChannel` 不得通过客户端过滤达成隔离。
6. 带消息表演与无对白动作各自的最终命令类型；文本消息与舞台事件的关联结果、失败语义和聊天室记录投影。
7. `StageThemePack`、背景、立绘代理图、音频和缺失资产的受控逻辑引用；前端不得拼接原始资源 URL 或读取 KP 私密素材。
8. D1-A 明确的功能开关未启用、资产失效、权限撤销、服务不可用和断线恢复语义。

**Gate failure rule:** 上述任何一项缺失、只给后端内部类型、或与最终规格的“先裁剪再广播”冲突时，停止在 Task 1，不创建临时接口、mock socket 或前端兼容层，并把缺项逐条退回主线程/D1-A。

## File Ownership and Planned Structure

| 路径 | D1-B 职责 | 状态 |
| --- | --- | --- |
| `apps/web/src/pages/rooms/RoomPage.tsx` | 仅接入 stage feature 边界、传递现有房间/聊天交互、保持既有 KP 与 PL 容器 | D1-B 修改 |
| `apps/web/src/pages/rooms/components/RoomPlayerView.tsx` | PL 中央主视图的 stage shell 插槽；不改调查员档案/调查板业务 | D1-B 修改 |
| `apps/web/src/pages/rooms/components/RoomCommandRail.tsx` | KP 右栏中导演工具的插槽与可见性入口 | D1-B 修改 |
| `apps/web/src/pages/rooms/components/RoomChatComposer.tsx` | 带消息表演的 composer 插槽；保留现有私聊目标、骰点与普通发送 | D1-B 修改 |
| `apps/web/src/pages/rooms/components/RoomChatTranscript.tsx` | 将 D1-A 的可读舞台记录显示为可折叠记录，不重建权威聊天历史 | D1-B 修改 |
| `apps/web/src/features/room-stage/` | 新增 feature 根目录：shell、契约 adapter、channel controller、Pixi runtime、audio runtime、DOM 回退、PL/KP 控件、样式与窄单测 | D1-B 新增 |
| `apps/web/src/styles/room-stage.css` | 舞台专属布局、移动端与 reduced-motion 样式；由 `styles/index.css` 导入 | D1-B 新增/修改入口 |
| `apps/web/package.json`、锁文件 | 仅在 Gate 通过后加入与 React 18 兼容的锁定 PixiJS 版本 | D1-B 修改 |

不属于 D1-B：`apps/server/**`、Prisma migration、D1-A 的共享 stage 契约定义、Socket gateway、资产服务、现有房间生命周期/骰点/战斗实现、admin、AI 面板、回放路由。

## Task 1: Freeze Intake and Dependency Lock

**Files:**
- Modify: `docs/superpowers/plans/2026-07-12-shared-stage-d1b-frontend.md` (Contract Freeze Gate completion record)
- Inspect only: D1-A freeze commit's exported frontend contract, `apps/web/package.json`, `apps/web/src/hooks/useSocket.ts`

**Consumes:** D1-A commit SHA and its public frontend exports.

**Produces:** A reviewed, verbatim dependency record that later tasks import; no D1-B replacement type or transport abstraction.

- [ ] **Step 1: Verify the handoff is a frozen public contract**

  Check the D1-A diff and exports against all eight Gate items. Record the commit SHA, module paths and exported symbol names in the Gate section. Reject any handoff that exposes only database/service internals or asks the client to filter private events.

- [ ] **Step 2: Compile an import-only probe**

  Add no production behavior. Run the web typecheck after importing the exact D1-A public types from the planned feature boundary; if an import cannot compile without recreating a type locally, revert the probe and return the missing export to D1-A.

  Run: `pnpm --filter @sunken-city/web typecheck`

  Expected: exit code `0`, with every required D1-A public type resolved from its owned module.

- [ ] **Step 3: Lock the rendering dependency only after the Gate passes**

  Add the approved PixiJS package to `apps/web/package.json` and the existing lockfile using the repository package manager. Keep it behind a dynamic import from the room-stage feature root; do not add `@pixi/react`, React 19 or a global renderer provider.

- [ ] **Step 4: Commit the reviewed intake boundary**

  Run: `git add docs/superpowers/plans/2026-07-12-shared-stage-d1b-frontend.md apps/web/package.json <lockfile>`

  Run: `git commit -m "chore(stage): lock D1-B frontend contract and renderer dependency"`

## Task 2: Build the Contract-Only Stage Controller and View Model

**Files:**
- Create: `apps/web/src/features/room-stage/RoomStageShell.tsx`
- Create: `apps/web/src/features/room-stage/useRoomStageChannel.ts`
- Create: `apps/web/src/features/room-stage/stage-view-model.ts`
- Create: `apps/web/src/features/room-stage/stage-layout.ts`
- Create: `apps/web/src/features/room-stage/stage-layout.test.ts`

**Consumes:** The exact D1-A snapshot/event/command/result/channel/capability exports recorded in Task 1.

**Produces:** One renderer-independent view model for the active channel, a single authoritative command dispatcher, and deterministic five-zone placement.

- [ ] **Step 1: Write failing pure layout tests**

  Cover the specification's deterministic local rules: the semantic zones are `far-left`, `left`, `center`, `right`, `far-right`; desktop foreground selection is capped at six; mobile foreground selection is capped at three; conflicting preferred zones select the nearest free semantic position; actors beyond the cap remain present in the background list. The test input must be the local renderer view model, never raw room state.

- [ ] **Step 2: Run the narrow layout test**

  Run: `node --test --experimental-strip-types apps/web/src/features/room-stage/stage-layout.test.ts`

  Expected: fail before `stage-layout.ts` exists, then pass after the deterministic resolver is implemented.

- [ ] **Step 3: Implement the adapter and channel controller**

  `stage-view-model.ts` converts only the D1-A server projection into renderer-safe display data. It must preserve the channel revision, distinguish accessible logical assets from fallback state, retain channel-local unread state, and never merge data from a different channel.

  `useRoomStageChannel.ts` subscribes only to the chosen accessible `StageChannel`, requests the current snapshot on activation/reconnect, replaces local state on a newer snapshot, applies only contiguous accepted events, and hands the exact D1-A command envelope to its transport. On a revision conflict it replaces the local snapshot with the server result; it never predicts a successful actor/scenario change.

  `RoomStageShell.tsx` owns the local `stageViewPreference`, selects one active renderer channel, keeps subscriptions alive while visual rendering is off if the frozen contract requires it, and tears down renderer/audio resources whenever the preference, channel, room, route or component lifecycle changes.

- [ ] **Step 4: Verify the controller boundary**

  Run: `pnpm --filter @sunken-city/web typecheck`

  Expected: exit code `0`; no import from `apps/server`, no `isCreator`, and no raw full-room stage model in the feature directory.

- [ ] **Step 5: Commit the controller slice**

  Run: `git add apps/web/src/features/room-stage`

  Run: `git commit -m "feat(stage): add projection-driven channel controller"`

## Task 3: Add the Lazy Pixi and Audio Runtimes

**Files:**
- Create: `apps/web/src/features/room-stage/PixiStageRuntime.ts`
- Create: `apps/web/src/features/room-stage/PixiStageCanvas.tsx`
- Create: `apps/web/src/features/room-stage/StageAudioRuntime.ts`
- Create: `apps/web/src/features/room-stage/useStageAudio.ts`
- Create: `apps/web/src/features/room-stage/DomStageFallback.tsx`

**Consumes:** Task 2's renderer view model and the frozen D1-A logical asset references.

**Produces:** A lazily loaded Pixi canvas, isolated audio lifecycle, and a complete DOM projection with the same view model.

- [ ] **Step 1: Implement the Pixi lifecycle boundary**

  Create Pixi only after `RoomStageShell` has an enabled preference, a current snapshot and a WebGL-capable surface. Render the fixed layer order from the specification: background, environment, rear actors, foreground/current speaker, short event effects, dialogue frame, then DOM controls. The runtime owns no command, socket or room business state.

- [ ] **Step 2: Implement the asset failure paths**

  Render a theme color/title for failed backgrounds, the actor's default portrait for failed variants, and a labelled system silhouette for failed defaults. A broken `StageThemePack` selects the system theme while retaining the supplied theme identity for diagnostics. Do not fetch arbitrary URLs or infer a replacement from an inaccessible asset.

- [ ] **Step 3: Implement audio independently of Pixi**

  Start BGM/environment audio only after an explicit browser media-unlock action. Playback failure leaves the stage and inputs active and exposes an enable/retry control. Channel change, stage disable, unmount and context loss stop and release audio; no audio instance is stored in React room state or a Pixi display tree.

- [ ] **Step 4: Implement and select the DOM fallback**

  `DomStageFallback` renders the same background title, present actor labels, current dialogue, private/target label, accessible action labels, error/retry controls and composer/director entry points. It becomes active for user-disabled Pixi, reduced motion/low-power policy, WebGL creation failure and context loss.

- [ ] **Step 5: Verify the lazy boundary**

  Run: `pnpm --filter @sunken-city/web build`

  Expected: exit code `0`; the room-stage/Pixi chunk is emitted separately from the non-room entry path.

- [ ] **Step 6: Commit the renderer slice**

  Run: `git add apps/web/src/features/room-stage apps/web/package.json <lockfile>`

  Run: `git commit -m "feat(stage): add lazy Pixi, audio, and DOM fallback runtimes"`

## Task 4: Add Player Composer Controls and Authoritative Chat Linkage

**Files:**
- Create: `apps/web/src/features/room-stage/StageComposerControls.tsx`
- Create: `apps/web/src/features/room-stage/StageQuickActions.tsx`
- Modify: `apps/web/src/pages/rooms/components/RoomChatComposer.tsx`
- Modify: `apps/web/src/pages/rooms/components/RoomChatTranscript.tsx`

**Consumes:** The exact D1-A command types for message performance, silent action, allowed actor controls and action-record projection.

**Produces:** Accessible PL controls for self-only performance and a non-duplicated chat rendering of server-confirmed stage records.

- [ ] **Step 1: Add capability-driven composer slots**

  Render expression, action, semantic zone and enter/exit controls only when the frozen own-actor capability is true and the D1-A projection offers the corresponding allowed choice. Keep the existing message target selector authoritative for public/private routing; a private message performance uses only its server-selected private `StageChannel`.

- [ ] **Step 2: Submit a single authoritative operation**

  When text and performance are both selected, send the exact frozen combined command once. A failed visual asset must preserve normal text sending under the D1-A result semantics. A rejected permission or revision command shows the server result and must not mutate the local actor view model optimistically.

- [ ] **Step 3: Add silent action controls**

  Show only the D1 controlled set: nod, shake head, silence, approach, retreat, turn, startled, injured, fall, enter and exit, filtered by the server projection. Send no ordinary chat bubble for these actions; display only the returned collapsible stage-record projection in the transcript.

- [ ] **Step 4: Verify existing chat regression boundary**

  Run: `pnpm --filter @sunken-city/web typecheck`

  Expected: exit code `0`; public and private normal chat, dice controls and the existing target selector keep their current props and transport.

- [ ] **Step 5: Commit the player interaction slice**

  Run: `git add apps/web/src/features/room-stage apps/web/src/pages/rooms/components/RoomChatComposer.tsx apps/web/src/pages/rooms/components/RoomChatTranscript.tsx`

  Run: `git commit -m "feat(stage): add projection-bound player performance controls"`

## Task 5: Add KP Director Tools Without Reusing Broad KP Permission

**Files:**
- Create: `apps/web/src/features/room-stage/StageDirectorTools.tsx`
- Create: `apps/web/src/features/room-stage/StageChannelTabs.tsx`
- Modify: `apps/web/src/pages/rooms/components/RoomCommandRail.tsx`

**Consumes:** D1-A's stage-management and stage-asset capabilities, accessible channel list, allowed global controls and final director command types.

**Produces:** A KP-only director surface that can operate only the server-authorized channel and controls.

- [ ] **Step 1: Add channel tabs from the projection**

  List only D1-A-projected channels. Main room, each accessible sub-room and each accessible private track retain separate selected state, snapshot, unread count and inherited/overridden presentation. Switching the active tab destroys the previous renderer and starts one renderer for the new active channel.

- [ ] **Step 2: Add permission-specific director controls**

  Show scene/background, BGM/environment, NPC, actor correction, clear-stage, temporary control lock and theme controls only when their exact stage capability is true. Existing `canUseKPTools` remains an existing-room UI concern and must not authorize any stage command.

- [ ] **Step 3: Keep asset and theme boundaries declarative**

  Use only D1-A asset picker/manifest contracts. Theme selection changes the central stage frame only; it cannot inject HTML, CSS, JavaScript, alter room columns or suppress mute, exit or accessibility controls.

- [ ] **Step 4: Verify absence of permission fallback**

  Run: `rg -n "isCreator|canUseKPTools" apps/web/src/features/room-stage`

  Expected: no authorization branch is based on either identifier; any `canUseKPTools` occurrence is rejected during review.

- [ ] **Step 5: Commit the KP tools slice**

  Run: `git add apps/web/src/features/room-stage apps/web/src/pages/rooms/components/RoomCommandRail.tsx`

  Run: `git commit -m "feat(stage): add capability-scoped director tools"`

## Task 6: Integrate the Protected Desktop Shell and Mobile Stage-First View

**Files:**
- Modify: `apps/web/src/pages/rooms/RoomPage.tsx`
- Modify: `apps/web/src/pages/rooms/components/RoomPlayerView.tsx`
- Modify: `apps/web/src/styles/index.css`
- Create: `apps/web/src/styles/room-stage.css`

**Consumes:** Tasks 2-5's `RoomStageShell`, composer slot and director slot.

**Produces:** A central stage replacement that preserves the existing three-column desktop base and its separate mobile drawer model.

- [ ] **Step 1: Add a feature-flagged central shell**

  Mount the stage boundary only for an enabled room and a participant with stage-view capability. Keep legacy central chat/scene presentation as the immediately available traditional mode. The personal toggle changes only local preference and never emits a room event.

- [ ] **Step 2: Preserve desktop geometry**

  Retain left identity/participant and right tools/record columns at their existing roles. Give the central stage `minmax(0, 1fr)` behavior and allow the existing side rails to collapse before the dialogue frame or two-actor composition becomes unusable. The authoritative transcript stays independently scrollable with its existing unread behavior.

- [ ] **Step 3: Implement mobile as a distinct stage-first layout**

  Make the stage the mobile main view, keep the composer fixed at the bottom, expose left/right information as mutually exclusive existing drawers, and keep the transcript as a bottom sheet with unread state. Restrict quick actions to a finite button/menu surface; do not compress the desktop three-column layout into mobile.

- [ ] **Step 4: Add accessibility and reduced-motion rules**

  Provide text labels for portraits, expressions and actions; keyboard paths for send, expression/action/zone choice and enter/exit; live-readable stage change records; and `prefers-reduced-motion` styles that remove movement, flashing and nonessential particles while keeping all commands usable.

- [ ] **Step 5: Verify the integration compilation**

  Run: `pnpm --filter @sunken-city/web typecheck`

  Expected: exit code `0`; the existing room page still compiles for KP, PL and observer paths.

- [ ] **Step 6: Commit the layout integration**

  Run: `git add apps/web/src/pages/rooms/RoomPage.tsx apps/web/src/pages/rooms/components/RoomPlayerView.tsx apps/web/src/styles/index.css apps/web/src/styles/room-stage.css`

  Run: `git commit -m "feat(stage): integrate optional room stage on desktop and mobile"`

## Task 7: Add Focused Failure and Lifecycle Checks

**Files:**
- Create: `apps/web/src/features/room-stage/stage-view-model.test.ts`
- Create: `apps/web/src/features/room-stage/stage-channel-controller.test.ts`
- Modify: any Task 2-6 file only where a focused check exposes a defect

**Consumes:** Frozen D1-A public types and the completed D1-B feature boundary.

**Produces:** Narrow contract-level proof that renderer state never owns or leaks room truth.

- [ ] **Step 1: Write focused tests**

  Exercise only the D1-B boundary: snapshot replacement after reconnect; channel switch clears renderer-local resources; event for channel A never changes B; a forbidden command is not dispatched; revision conflict replaces the view model with the returned snapshot; missing portrait/background/theme chooses the specified DOM/Pixi fallback; and user-disabled/WebGL-failed views retain DOM controls.

- [ ] **Step 2: Run the focused tests and typecheck**

  Run: `node --test --experimental-strip-types apps/web/src/features/room-stage/stage-layout.test.ts apps/web/src/features/room-stage/stage-view-model.test.ts apps/web/src/features/room-stage/stage-channel-controller.test.ts`

  Expected: all listed tests pass.

  Run: `pnpm --filter @sunken-city/web typecheck`

  Expected: exit code `0`.

- [ ] **Step 3: Commit validation-facing code only**

  Run: `git add apps/web/src/features/room-stage`

  Run: `git commit -m "test(stage): cover channel isolation and renderer fallbacks"`

## Task 8: Final D1-B Handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-07-12-shared-stage-d1b-frontend.md` (mark completed tasks and record D1-A SHA)
- Create: `docs/shared-stage-d1b-frontend-handoff-2026-07-12.zh-CN.md`

**Consumes:** Completed tasks, commit SHAs and narrow validation output.

**Produces:** A handoff that lets the main thread run the larger audit without guessing feature boundaries.

- [ ] **Step 1: Record delivered ownership and deferred scope**

  State the imported D1-A public contract paths and SHA, D1-B file list, Pixi version, feature-flag behavior, DOM fallback behavior, channel isolation handling, and explicit non-goals.

- [ ] **Step 2: Record only performed verification**

  Include the exact focused test and typecheck/build commands actually run, their exit results, and any unperformed visual/device/production validation as pending for the main-thread test/audit lane. Do not claim deep testing, browser matrix testing or deployment.

- [ ] **Step 3: Commit the handoff**

  Run: `git add docs/superpowers/plans/2026-07-12-shared-stage-d1b-frontend.md docs/shared-stage-d1b-frontend-handoff-2026-07-12.zh-CN.md`

  Run: `git commit -m "docs(stage): hand off D1-B frontend integration"`

## Plan Self-Review

- **Specification coverage:** Tasks 2-7 cover the D1-B allocation in the final specification: protected three-column integration, React/DOM shell, 2D Pixi renderer, single active renderer, independent audio, PL self-controls, KP director tools, separate StageChannels, server-first visibility, per-user toggle, mobile stage-first layout, accessibility, reduced motion, lazy loading, fallbacks and resource release.
- **Intentional exclusions:** backend models/gateway/assets, replay, editable timeline, arbitrary scripts, 3D systems, AI/admin, lighting/vision, and production deployment remain out of scope.
- **Contract integrity:** The plan names required contract categories but intentionally does not invent exported type names, REST paths, Socket event names, command payloads or database structure. Task 1 blocks every behavior-dependent task until D1-A supplies those exact public definitions.
- **Validation scope:** Only pure/layout/controller checks, TypeScript and build boundaries are planned. Product sessions, cross-browser/device matrices, end-to-end flows and production checks remain for the main-thread audit lane, consistent with the no-deep-testing instruction.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-12-shared-stage-d1b-frontend.md`. Execution is intentionally blocked at the D1-A Contract Freeze Gate; after the frozen commit is supplied, execute Tasks 1-8 inline in this dedicated D1-B worktree and keep the stated review checkpoints.

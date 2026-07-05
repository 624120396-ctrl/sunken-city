# 沉没之城调查体验升级阶段收口说明

日期：2026-07-05

## 1. 本文档用途

本文档用于收口“调查体验升级”当前线程的实际交付范围，避免后续提交、交接或 UI/UX 线程恢复时把不同专项的改动混在一起。

当前调查体验主计划仍是：

- `docs/superpowers/plans/2026-07-04-sunken-city-investigation-experience-upgrade.zh-CN.md`

该主计划是总路线图，不应一次性整体开工。当前线程已完成的是基础调查工作台能力和若干低成本联动能力；AI、Seedream、语音和视觉重构不在本次收口范围内。

## 2. 当前已完成能力

### Phase 1：调查档案系统 V1

- 房间内线索板：KP 可创建、编辑、公开、隐藏和删除线索。
- NPC 档案柜：KP 可维护 NPC 档案，PL 只能看到公开档案。
- 场景 / 地点系统：KP 可维护场景并设置当前场景。
- 调查日志时间线：支持公开日志与 KP 私密日志。
- KP 私密便签：仅 KP 可读写，不向 PL / OBSERVER 暴露。
- 公开线索、公开 NPC、当前场景切换会写入调查日志。

### Phase 2：团前 / 团后连续性

- 备团中心：保存上次回顾、开团检查、未解决问题。
- 当前焦点：保存当前目标、置顶提示、当前场景摘要。
- PL 进入房间后可看到公开的团前/当前焦点信息。

### Phase 3：线上参与焦点

- 房间页顶部增加调查焦点条。
- 展示当前目标、置顶提示、当前场景、最新公开线索和最近关键骰点。
- 使用现有 capability contract 判定展示与操作权限。

### Phase 4：低成本效率工具

- KP 可把重要聊天消息归档到调查日志。
- KP 可把关键骰点归档到调查日志。
- 团后报告导出包含调查摘要、公开线索、NPC、场景和调查时间线。
- 增加只读角色状态同步检查，用于提示 HP / MP / SAN 范围异常或未绑定角色。

## 3. 本线程应纳入的文件范围

### 数据模型与迁移

- `apps/server/prisma/schema.prisma`
- `apps/server/prisma/migrations/20260704120000_add_investigation_workspace/migration.sql`
- `apps/server/prisma/migrations/20260704123000_add_room_session_continuity/migration.sql`

### 后端调查服务与路由

- `apps/server/src/index.ts`
- `apps/server/src/modules/rooms/investigation-board.routes.ts`
- `apps/server/src/modules/rooms/investigation-clue.service.ts`
- `apps/server/src/modules/rooms/investigation-npc.service.ts`
- `apps/server/src/modules/rooms/investigation-scene.service.ts`
- `apps/server/src/modules/rooms/investigation-log.service.ts`
- `apps/server/src/modules/rooms/kp-note.service.ts`
- `apps/server/src/modules/rooms/session-prep.service.ts`
- `apps/server/src/modules/rooms/session-recap.service.ts`
- `apps/server/src/modules/reports/report.routes.ts`

### 前端最小可用交互

- `apps/web/src/types/investigation-contract.ts`
- `apps/web/src/services/investigation.service.ts`
- `apps/web/src/pages/rooms/RoomPage.tsx`
- `apps/web/src/pages/rooms/RoomReportPage.tsx`
- `apps/web/src/pages/rooms/components/InvestigationDock.tsx`
- `apps/web/src/pages/rooms/components/ClueBoardPanel.tsx`
- `apps/web/src/pages/rooms/components/NpcArchivePanel.tsx`
- `apps/web/src/pages/rooms/components/ScenePanel.tsx`
- `apps/web/src/pages/rooms/components/InvestigationTimelinePanel.tsx`
- `apps/web/src/pages/rooms/components/KpPrivateNotesPanel.tsx`
- `apps/web/src/pages/rooms/components/SessionPrepPanel.tsx`
- `apps/web/src/pages/rooms/components/CurrentFocusPanel.tsx`
- `apps/web/src/pages/rooms/components/RoomInvestigationFocusStrip.tsx`

### 相关说明文档

- `docs/superpowers/plans/2026-07-04-sunken-city-investigation-experience-upgrade.zh-CN.md`
- `docs/superpowers/plans/2026-07-05-sunken-city-investigation-delivery-scope.zh-CN.md`

### 伴随修复

- `apps/web/src/lib/animation.ts`

该文件的改动是为了修复本轮验证中暴露的 TypeScript 可选回调类型问题：仅在存在 `onComplete` 时传入动画参数，避免把 `undefined` 显式传入。

## 4. 不应混入本线程提交的改动

以下改动属于 UI/UX、视觉资产、产品文档或其他专项，除非用户另行要求，不应与调查体验功能一起提交：

- `PRODUCT.md`
- `PRD.md`
- `apps/web/src/components/system/*`
- `apps/web/src/styles/index.css`
- `apps/web/src/styles/system-v2.css`
- `apps/web/src/styles/tokens-v2.css`
- `apps/web/src/styles/rooms.css`
- `apps/web/public/ui-textures/*`
- `apps/web/src/pages/rooms/RoomListPage.tsx`
- `docs/superpowers/plans/2026-06-30-sunken-city-frontend-system-v2-phase1.md`
- `docs/superpowers/plans/2026-07-01-sunken-city-ui-readability-redesign*.md`
- `docs/superpowers/plans/2026-07-02-harbor-oracle-game-ui-upgrade.zh-CN.md`
- `docs/superpowers/plans/2026-07-04-sunken-city-luminous-archive-visual-upgrade.zh-CN.md`
- `docs/superpowers/plans/2026-07-04-sunken-city-ui-asset-pipeline.zh-CN.md`
- `docs/superpowers/plans/2026-07-04-sunken-city-ui-document-audit.zh-CN.md`
- `docs/superpowers/plans/2026-07-04-sunken-city-ui-ux-product-design-master-plan.zh-CN.md`

`docs/superpowers/plans/2026-07-04-room-post-finale-character-growth.zh-CN.md` 属于已冻结的结团后角色成长方向，等待用户提供规则文档后再处理。

## 5. 已完成验证记录

当前线程已执行过一次用户授权的深度验证，结论如下：

- Prisma schema 校验通过。
- 本地数据库迁移状态通过。
- Server typecheck 通过。
- Server build 通过。
- Web typecheck 通过。
- Web build 通过。
- UI system 检查通过。
- 现有 Web 脚本测试通过。
- 房间系统写入型 smoke 通过，测试数据已清理。
- 调查体验 API 验证通过，覆盖权限、CRUD、公开/私密可见性、报告和时间线。
- 浏览器验证通过，覆盖 KP / PL 桌面和移动端最小可用路径。
- 重要消息归档、关键骰点归档、角色状态同步 API 验证通过。
- `git diff --check` 通过，仅有 Windows 换行提示。

后续默认只做轻量验证；除非用户再次明确要求，不主动跑大规模 E2E、深度 Playwright、生产写入型冒烟或真实 AI 付费调用。

## 6. 下一阶段建议

下一阶段不建议直接进入 AI 或 Seedream。原因是 AI 需要稳定的结构化档案作为输入，否则容易变成一次性文本生成，难以审计、复用和控权。

建议下一步单独拆出 Phase 5-7 的小计划，优先做：

1. 下次开团时间。
2. 成员参加确认 / 请假 / 待确认。
3. KP 房间公告。
4. 房间列表或房间入口显示“下一次开团”和“未确认成员”。

该阶段仍应只依赖现有房间成员与 capability contract，不改 Socket、骰点、战斗、私聊、生命周期或结算核心契约。

AI 相关 Phase 8-10 后续启动时，第一步也只应做数据模型、上下文过滤、用量审计、禁用态语音预留和 provider adapter 骨架，不接真实付费调用，不写死具体供应商模型。

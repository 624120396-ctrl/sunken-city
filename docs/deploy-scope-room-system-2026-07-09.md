# 本次部署范围建议：房间系统 Web 定版

日期：2026-07-09

## 建议结论

建议本次部署以“房间系统 Web 定版 + 房间列表页接口预留 + 必要 Socket 修复”为主，不把角色页、消息中心等其他页面作为本次部署验收重点。

原因：

- 房间系统已经完成深度测试，并有明确通过记录。
- Socket 入房竞态属于房间实时功能的必要修复，应随房间系统一起部署。
- 房间列表页改动与本轮房间系统入口相关，可以纳入同一批。
- 角色页、消息中心等改动当前不属于本轮深测主线，建议另列发布项，避免扩大验收范围。

## 建议纳入本次部署

核心房间系统：

- `apps/server/src/config/socket.ts`
- `apps/web/src/pages/rooms/RoomPage.tsx`
- `apps/web/src/styles/room-visual-rebuild.css`

房间列表页：

- `apps/web/src/pages/rooms/RoomListPage.tsx`
- `apps/web/src/pages/rooms/components/RoomListRecruitmentEntry.tsx`
- `apps/web/src/pages/rooms/components/RoomListStoryCard.tsx`
- `apps/web/src/styles/rooms.css`

部署/交接文档：

- `docs/room-system-deploy-readiness-2026-07-09.md`
- `docs/deploy-scope-room-system-2026-07-09.md`

仓库卫生：

- `.gitignore`

## 建议暂缓纳入本次部署验收

以下文件目前有改动，但不建议作为本次“房间系统定版部署”的主验收范围：

- `apps/web/src/pages/characters/CharacterCreateV2Page.tsx`
- `apps/web/src/pages/characters/CharacterDetailPage.tsx`
- `apps/web/src/pages/characters/CharacterListPage.tsx`
- `apps/web/src/pages/messages/MessageCenterPage.tsx`
- `apps/web/src/styles/characters.css`
- `apps/web/src/styles/index.css`
- `apps/web/src/styles/messages.css`

这些改动可以保留在工作区，但正式部署前需要单独确认它们是否已完成验收。

## 明确不应提交

- `.codex-run/`
- `pnpm-lock.yaml`
- `apps/web/pnpm-lock.yaml`
- `apps/web/pnpm-workspace.yaml`

说明：这些是本地测试、包管理或临时环境产物，不属于本轮产品改造交付。

## 已完成验证

- 后端 TypeScript：通过。
- 前端 TypeScript：通过。
- 房间系统 API/Socket 深测：通过。
- KP 浏览器操作验证：通过。

详见：

- `docs/room-system-deploy-readiness-2026-07-09.md`

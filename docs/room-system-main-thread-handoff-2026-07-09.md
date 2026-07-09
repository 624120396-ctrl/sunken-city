# 房间系统 Web 定版交接

日期：2026-07-09

## 结论

房间系统 Web 端已完成本轮定版级整理，建议进入部署准备阶段。本轮应只带上房间系统、房间列表页接口预留、以及 Socket 连接竞态修复；角色页、消息中心等其他页面当前虽有工作区改动，但不建议混入本次部署。

## 本轮建议纳入部署

- `apps/server/src/config/socket.ts`
  - 修复 Socket 初始化竞态：服务端不再因为等待在线用户列表而延后注册 `room:join` 监听，避免前端进入房间后偶发无法及时加入实时房间。
- `apps/web/src/pages/rooms/RoomPage.tsx`
  - 保留 KP/PL 视觉定版后的房间页面。
  - 恢复 KP 可见的房间状态/生命周期控制区域。
  - 保留 KP/PL 工具栏整合、暗骰可见性修正、斜杠骰点指令识别等房间内核心能力。
- `apps/web/src/styles/room-visual-rebuild.css`
  - 保留房间系统最终视觉材质、侧栏、聊天区、工具栏、骰点结果、角饰等样式。
- `apps/web/src/pages/rooms/RoomListPage.tsx`
- `apps/web/src/pages/rooms/components/RoomListRecruitmentEntry.tsx`
- `apps/web/src/pages/rooms/components/RoomListStoryCard.tsx`
- `apps/web/src/styles/rooms.css`
  - 房间列表页继续沿用房间系统设计语言。
  - 招募公告只保留新版招募系统入口位，不在本轮扩展站内招募功能。
- `.gitignore`
  - 忽略 `.codex-run/`，避免本地深度测试截图、脚本、JSON 结果误提交。
- `docs/room-system-deploy-readiness-2026-07-09.md`
  - 本轮深度测试、修复点、验证结果说明。
- `docs/deploy-scope-room-system-2026-07-09.md`
  - 部署范围与排除范围说明。
- `docs/superpowers/plans/2026-07-09-room-list-readability-recruitment-upgrade.zh-CN.md`
  - 房间列表页可读性与招募入口改造计划。

## 本轮不建议纳入部署

以下文件当前在工作区有改动或新增，但不属于本次房间系统部署主线，建议另行确认后再进入独立批次：

- `apps/web/src/pages/characters/CharacterCreateV2Page.tsx`
- `apps/web/src/pages/characters/CharacterDetailPage.tsx`
- `apps/web/src/pages/characters/CharacterListPage.tsx`
- `apps/web/src/styles/characters.css`
- `apps/web/src/pages/messages/MessageCenterPage.tsx`
- `apps/web/src/styles/messages.css`
- `apps/web/src/styles/index.css`

以下文件也不建议提交：

- `pnpm-lock.yaml`
- `apps/web/pnpm-lock.yaml`
- `apps/web/pnpm-workspace.yaml`
- `.codex-run/`

## 已验证事项

本轮深度验证已覆盖：

- KP 创建房间。
- PL 绑定角色后加入房间。
- 观众加入房间。
- KP 设置开团时间。
- KP 设置当前剧情焦点。
- KP 保存 Session Prep。
- KP 推进房间生命周期：开场、暂停、恢复、结团。
- PL 无权修改 KP 专属设置。
- 斜杠骰点指令，例如 `/2d4+4`。
- KP 暗骰不再对 PL 可见。
- KP/PL 房间页面基础可操作性。
- Web 与 Server TypeScript 检查通过。

详细记录见 `docs/room-system-deploy-readiness-2026-07-09.md`。

## 部署注意

- 本地测试使用临时后端端口 `3011`，原因是默认 `3001` 当时不可用。
- 本机没有可用 Docker 命令，因此本轮没有跑容器化验证。
- 本机 SSH 默认可能走 `gntcloud` 虚拟网卡，若后续部署出现 `Connection timed out during banner exchange`，应优先使用静态前端发布路径，或在 Windows SSH 配置里用 `BindAddress` 强制走物理 WLAN。
- 本地 `dev.db` 里包含 Codex 测试产生的临时房间和用户数据，不应作为生产数据来源。

## 建议提交范围

如果主线程准备打包部署，建议使用“只添加明确文件”的方式，不要直接 `git add .`。

建议纳入的文件清单：

```text
.gitignore
apps/server/src/config/socket.ts
apps/web/src/pages/rooms/RoomListPage.tsx
apps/web/src/pages/rooms/RoomPage.tsx
apps/web/src/pages/rooms/components/RoomListRecruitmentEntry.tsx
apps/web/src/pages/rooms/components/RoomListStoryCard.tsx
apps/web/src/styles/room-visual-rebuild.css
apps/web/src/styles/rooms.css
docs/room-system-deploy-readiness-2026-07-09.md
docs/deploy-scope-room-system-2026-07-09.md
docs/superpowers/plans/2026-07-09-room-list-readability-recruitment-upgrade.zh-CN.md
docs/room-system-main-thread-handoff-2026-07-09.md
```

## 给主线程的建议

主线程可以把本轮视为“房间系统 Web 端定版部署包”。部署前只需做一次轻量确认：

1. 检查部署包是否只包含上方建议文件。
2. 运行 Web 与 Server 的 TypeScript 检查。
3. 线上发布后，用一个 KP 账号和一个 PL 账号验证：进入房间、发送消息、公开骰、暗骰、斜杠骰点、设置开团时间、推进房间状态。

不建议在本轮临近部署时继续扩大范围到移动端、角色卡完整重构、消息中心或独立招募系统。

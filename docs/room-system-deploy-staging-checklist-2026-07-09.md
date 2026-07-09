# 房间系统部署提交清单

日期：2026-07-09

## 当前状态

本轮已完成轻量部署门禁：

- Server TypeScript 检查通过。
- Web TypeScript 检查通过。
- 本次部署范围内已跟踪文件未发现 `git diff --check` 阻断问题。
- `.codex-run/` 已加入 `.gitignore`，本地深度测试产物不会误入提交。
- 本地提交 `3b69240` 已通过 HTTPS 推送到远端分支 `codex/frontend-system-v2-phase1`。
- 当前服务器部署脚本以 `origin/develop` 为基准；正式部署前需要先把该分支合入 `develop`，或明确采用静态前端发布/指定提交发布路径。

## 只建议提交这些文件

```powershell
git add -- `
  .gitignore `
  apps/server/src/config/socket.ts `
  apps/web/src/pages/rooms/RoomListPage.tsx `
  apps/web/src/pages/rooms/RoomPage.tsx `
  apps/web/src/pages/rooms/components/RoomListRecruitmentEntry.tsx `
  apps/web/src/pages/rooms/components/RoomListStoryCard.tsx `
  apps/web/src/styles/room-visual-rebuild.css `
  apps/web/src/styles/rooms.css `
  docs/room-system-deploy-readiness-2026-07-09.md `
  docs/deploy-scope-room-system-2026-07-09.md `
  docs/room-system-main-thread-handoff-2026-07-09.md `
  docs/room-system-deploy-staging-checklist-2026-07-09.md `
  docs/superpowers/plans/2026-07-09-room-list-readability-recruitment-upgrade.zh-CN.md
```

提交前复核：

```powershell
git status --short
git diff --cached --name-status
```

建议提交信息：

```text
Finalize room system web deployment package
```

## 远端集成

当前远端分支：

```text
codex/frontend-system-v2-phase1 -> 3b69240
develop -> 2136a10
```

PR 创建地址：

```text
https://github.com/624120396-ctrl/sunken-city/compare/develop...codex/frontend-system-v2-phase1?expand=1
```

注意：本机 SSH 到 GitHub 不稳定，表现为 22/443 端口连接或 banner 阶段超时。当前可用路径是 HTTPS Git；如果部署机侧仍依赖 SSH，应优先检查是否被 `gntcloud` 虚拟网卡劫持，必要时使用 `BindAddress` 指向物理 WLAN，或改用 HTTPS/静态前端发布路径。

## 不建议提交

以下文件当前在工作区存在，但不属于本次房间系统部署包：

```text
apps/web/src/pages/characters/CharacterCreateV2Page.tsx
apps/web/src/pages/characters/CharacterDetailPage.tsx
apps/web/src/pages/characters/CharacterListPage.tsx
apps/web/src/pages/messages/MessageCenterPage.tsx
apps/web/src/styles/characters.css
apps/web/src/styles/index.css
apps/web/src/styles/messages.css
pnpm-lock.yaml
apps/web/pnpm-lock.yaml
apps/web/pnpm-workspace.yaml
```

## 部署前建议

部署前不要再扩大范围。只做一次轻量确认即可：

```powershell
cd C:\Users\29102\Documents\沉没之城\apps\server
node node_modules\typescript\bin\tsc --noEmit

cd C:\Users\29102\Documents\沉没之城\apps\web
node node_modules\typescript\bin\tsc --noEmit
```

上线后用一个 KP 账号和一个 PL 账号确认：

- KP 能进入房间。
- PL 能进入房间。
- 普通消息能发送。
- 公开骰能显示。
- KP 暗骰不对 PL 可见。
- `/1d2`、`/2d4+4` 这类聊天框骰点指令可用。
- KP 能设置开团时间和推进房间状态。

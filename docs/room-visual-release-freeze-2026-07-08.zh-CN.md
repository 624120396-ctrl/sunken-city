# 房间系统视觉定版上线前说明

日期：2026-07-08

## 结论

房间系统入口页、KP 房间页、PL 房间页前端视觉版本已达到可进入部署准备的状态。

本轮检查仅覆盖上线前轻量封版验证：改动范围核对、前端类型检查、前端生产构建、KP / PL 视觉截图核对。未执行深度业务测试。

## 本次建议上线范围

- 房间列表页视觉版本。
- 房间详情页 KP 视觉版本。
- 房间详情页 PL 视觉版本。
- 房间列表页的故事卡片、快速进入、招募公告、当前索引、报告归档。
- 房间页左右侧栏、顶部栏、中间聊天区、底部输入区、骰点工具、快捷技能、当前场景卡片。
- 房间页视觉素材：LOGO、角饰、骷髅头装饰、羊皮纸 / 控制台 / 顶栏等纹理素材。
- 房间页视觉相关组件：
  - `apps/web/src/pages/rooms/RoomListPage.tsx`
  - `apps/web/src/pages/rooms/RoomPage.tsx`
  - `apps/web/src/pages/rooms/components/RoomChatComposer.tsx`
  - `apps/web/src/pages/rooms/components/RoomChatTranscript.tsx`
  - `apps/web/src/pages/rooms/components/RoomCommandRail.tsx`
  - `apps/web/src/pages/rooms/components/RoomGameplayTypes.ts`
  - `apps/web/src/pages/rooms/components/RoomKeeperRollDock.tsx`
  - `apps/web/src/pages/rooms/components/RoomParticipantRail.tsx`
  - `apps/web/src/pages/rooms/components/RoomPlayerView.tsx`
  - `apps/web/src/pages/rooms/components/RoomSceneBanner.tsx`
  - `apps/web/src/styles/room-visual-rebuild.css`
  - `apps/web/src/components/room/QuickPhrases.tsx`
  - `apps/web/src/components/room/QuickRollBar.tsx`
  - `apps/web/src/components/room/MentionInput.tsx`
  - `apps/web/src/components/room/KPDicePanel.tsx`
  - `apps/web/src/styles/rooms.css`

## 明确未改动的上线边界

- 不涉及后台 / admin。
- 不涉及后端业务逻辑。
- 不涉及 Socket 事件协议。
- 不涉及真实骰点、战斗、私聊、生命周期写回规则。
- 不涉及官方规则机制，尤其结团后的角色成长机制。
- AI 面板仍保持空置，不触发真实 AI 调用。

## 部署时需要排除或谨慎处理

- `.serena/`：本地工具目录，不应部署。
- `test-artifacts/`：截图与临时验证产物，不应提交或部署。
- `outputs/`：如存在，不应提交或部署。
- `PRD.md`、历史计划文档、非房间视觉相关文档：不应作为本次上线必要内容。
- `pnpm-lock.yaml`、`apps/web/pnpm-lock.yaml`、`apps/web/pnpm-workspace.yaml`：本轮没有新增依赖，部署前应确认是否确实需要纳入。

## 轻量验证结果

- `pnpm --filter @sunken-city/web typecheck`：通过。
- `pnpm --filter @sunken-city/web build`：通过。
- Vite 构建仅提示既有的大 chunk 体积提醒，不是构建失败。

## 定版截图

截图目录：

`test-artifacts/room-release-freeze-2026-07-08/`

文件：

- `kp-release-freeze.png`
- `pl-release-freeze.png`

房间列表页截图目录：

`test-artifacts/room-list-release-freeze-2026-07-08/`

文件：

- `room-list-release-freeze.png`

截图使用前端 mock 数据，仅用于视觉核对；未连接真实 Socket，也未触发真实业务流程。

## 部署前建议

1. 先备份服务器当前前端构建产物和运行目录。
2. 仅打包本轮房间视觉相关源码与素材。
3. 在服务器构建后，先打开 KP / PL 房间页做一次肉眼核对。
4. 核对通过后再切换到正式入口。
5. 若上线后出现视觉异常，优先回滚前端构建产物，不需要动数据库。

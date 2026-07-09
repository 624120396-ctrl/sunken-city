# 房间系统 Web 端部署前收口记录

日期：2026-07-09

## 结论

房间系统 Web 端本轮深度测试通过，已修复测试中发现的两个关键问题，可以进入部署准备。

## 本轮修复

1. Socket 入房竞态
   - 文件：`apps/server/src/config/socket.ts`
   - 问题：客户端连接后立即发送 `room:join` 时，服务端可能仍在等待在线用户查询，导致入房监听尚未注册，房间 Socket 加入失败。
   - 处理：在线人数刷新改为异步执行，不阻塞后续 Socket 事件监听注册。

2. KP 房间状态控制不可见
   - 文件：`apps/web/src/pages/rooms/RoomPage.tsx`
   - 文件：`apps/web/src/styles/room-visual-rebuild.css`
   - 问题：视觉重构 CSS 将 `.room-gameplay-status-row` 隐藏，导致 KP 无法直观看到“开场 / 暂停 / 继续 / 进入终局 / 取消房间”状态控制。
   - 处理：状态控制条改为 KP 专用显示，并补齐与房间视觉系统一致的羊皮纸材质样式。

## 深度测试覆盖

已通过：

- KP 创建房间。
- PL 使用角色卡加入。
- 旁观加入。
- KP / PL / 旁观权限边界。
- KP 设置下次开团时间，PL 可查看但不可修改。
- KP 案板开团准备保存，PL 不可修改。
- KP 当前剧情焦点保存，PL 不可修改。
- 生命周期：开场、暂停、继续、进入终局。
- 准备阶段取消房间。
- 取消后禁止继续加入旁观。
- 聊天框 `/2d4+4` 斜杠骰点识别。
- KP 暗骰实时可见性：PL 只看到提示，KP 看到详情。
- KP 暗骰历史可见性：PL 历史不暴露结果，KP 历史可见详情。
- 浏览器 UI 操作：KP 点击“开场”后房间进入 `IN_PROGRESS`。

## 验证命令

已通过：

```powershell
cd C:\Users\29102\Documents\沉没之城\apps\server
node node_modules\typescript\bin\tsc --noEmit
```

```powershell
cd C:\Users\29102\Documents\沉没之城\apps\web
node node_modules\typescript\bin\tsc --noEmit
```

临时深测脚本结果文件：

- `.codex-run/deep-room-system-test.result.json`
- `.codex-run/room-ui-operation-check.result.json`

最终浏览器截图：

- `.codex-run/room-ui-operation-check-20260709091140.png`

## 注意事项

- `.codex-run/` 是本地测试产物，不应提交。
- 本地 SQLite dev.db 中留下了 `codex-deep-*`、`codex-ui-*` 前缀的临时测试账号、角色和房间数据，可后续清理。
- 当前工作区还有角色页、消息页、房间列表页等未提交改动；部署前应按实际发布范围统一确认。

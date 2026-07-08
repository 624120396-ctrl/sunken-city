# 房间系统上线准备清单

日期：2026-07-08

## 结论

房间系统已进入“可以准备部署”的状态，但这次不能只当作前端视觉更新处理。

原因是本轮为了修复工具、私聊、子房间和右侧抽屉混乱问题，已经包含少量后端改动：Socket 私聊消息、房间权限判断、AI 路由拦截范围。部署时需要同步后端代码并重启服务。

## 本轮必须一起上线的内容

- KP 房间页视觉与工具区。
- PL 房间页视觉与工具区。
- 房间列表页视觉改造。
- 聊天框内一对一私聊。
- 子房间作为独立入口保留。
- 右侧工具抽屉：场景、线索、NPC、子房间、结算等。
- 房间材质素材、LOGO、角饰、骷髅头装饰、顶部栏与羊皮纸纹理。
- 后端私聊与权限修正。

## 关键改动范围

后端：

- `apps/server/src/config/socket.ts`
- `apps/server/src/modules/rooms/room-auth.ts`
- `apps/server/src/modules/rooms/ai-doubao.routes.ts`
- `apps/server/src/modules/rooms/ai-deepseek.routes.ts`

前端：

- `apps/web/src/pages/rooms/RoomPage.tsx`
- `apps/web/src/pages/rooms/RoomListPage.tsx`
- `apps/web/src/pages/rooms/components/*`
- `apps/web/src/components/room/*`
- `apps/web/src/styles/room-visual-rebuild.css`
- `apps/web/src/styles/rooms.css`
- `apps/web/src/styles/index.css`
- `apps/web/public/images/logo-sunken-gothic-cutout.png`
- `apps/web/public/ui-textures/*`

## 已完成的上线前检查

- 前端类型检查：通过。
- 后端类型检查：通过。
- 前端生产构建：通过。
- 后端生产构建：通过。
- UI 系统约束检查：通过。
- `git diff --check`：未发现空白错误，仅有 Windows 换行提示。
- 浏览器实操抽查：通过。
  - KP 可以在聊天框内选择公开或对指定 PL 私聊。
  - PL 可以收到 KP 对自己的私聊。
  - 旁观者不会看到 KP 与 PL 的私聊。
  - 右侧工具入口可点击切换。
  - 结算弹窗不会再和右侧抽屉叠在一起。

## 不需要做的事

- 不需要数据库迁移。
- 不需要改后台 / admin。
- 不需要开启真实 AI 调用。
- 不需要改官方规则、结团成长、战斗结算规则。

## 部署时不要带上的内容

- `.serena/`
- `tmp/`
- `test-artifacts/`
- `outputs/`
- 本地日志文件。
- Codex 临时截图与审计过程文件。

## 部署建议

推荐路线：

1. 先把当前分支整理成一次明确提交。
2. 合并或推送到服务器使用的部署分支。
3. 服务器拉取代码。
4. 在服务器执行后端构建。
5. 重启后端服务。
6. 构建并发布前端静态资源。
7. 做上线后冒烟检查。

不建议直接运行旧的前端-only部署流程，因为它无法覆盖本次后端 Socket 与权限改动。

## 上线后必须检查

- `/health` 正常。
- KP 房间页能打开。
- PL 房间页能打开。
- KP 发送公开消息正常。
- KP 对某一位 PL 私聊正常。
- 无关观众看不到私聊。
- 右侧工具入口可以正常打开和关闭。
- 子房间入口可以打开，不再和私聊混为一个入口。
- 场景、线索、NPC、结算界面没有遮罩错位。
- LOGO、角饰、羊皮纸、控制台纹理都能正常加载。

## 风险提示

现有部署脚本里后端构建存在容错写法，可能掩盖构建失败。正式部署时应以真实构建结果为准，不能在构建失败时继续重启服务。

如果需要，我建议下一步再执行“提交前整理”：把本轮应上线文件和本地临时文件分开，确认提交范围干净后，再进入服务器部署。

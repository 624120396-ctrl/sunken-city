# 房间实时语音 V1 当前集成基线交接

## 基线与范围

- 集成基线：`96641b2747b69a079e141b138ee517bf2046ebcd`
- 候选分支：`codex/voice-v1-current-integration`
- 不直接 cherry-pick 旧 `d32b943`；当前基线已保留 LiveKit 依赖、语音服务、共享舞台与发布脚本硬化。
- 本次只调整语音 V1、语音测试与本交接；未改 LiveKit/coturn 密钥、基础设施、stage public contract、admin、AI、Prisma schema/migration、发布脚本或 package-lock。

## 人工三方整合决策

- `96641b2` 的 `apps/server/package.json` 和 `apps/web/package.json` 已含 `livekit-server-sdk`、`@livekit/components-react`、`@livekit/components-styles`、`livekit-client`；保留当前版本与 lock，不回退旧分支依赖树。
- KP 保留 `RoomCommandRail` 中的语音面板。
- PL 桌面改在 `RoomPlayerView` 的右侧调查板顶部显示紧凑语音面板，避免 PL 三栏布局将 KP rail 排到可视区之外。
- PL 移动端保持行动抽屉入口，未占用聊天输入或骰点区域。
- 语音面板的状态文案提取至无 JSX 的 `roomVoiceMeta.ts`，使窄测试不直接加载 LiveKit React 面板。
- 共享舞台保真测试确认 `RoomPage -> RoomStageShell -> StageChannelTabs` 与服务端 `stageRoutes` 注册仍在。

## 鉴权与生命周期

- status 与 token 共用房间鉴权：真实成员角色和 capability 仍由 `buildRoomAuthView` 计算；没有回退到 `isCreator` 或页面局部状态。
- 语音仅允许 `PREPARING`、`READY`、`IN_PROGRESS`、`PAUSED`。
- `FINISHING`、`FINISHED`、`CANCELLED` 统一返回 `VOICE_LIFECYCLE_NOT_AVAILABLE`（409），即使成员仍有查看公共内容 capability。
- OBSERVER 继续默认可听；是否可发言只取 `ROOM_VOICE_OBSERVER_CAN_SPEAK`。

## 容量与失败策略

- token 签发前先构造与 JWT 一致的 participant identity，再使用 `RoomServiceClient.listParticipants(roomName)` 检查 LiveKit 当前人数。
- 列表中 exact identity 与当前请求者一致的既有席位不重复计入上限，因此满房成员刷新 token 或断线重连可继续签发；陌生 identity 满房时拒绝 `VOICE_ROOM_FULL`（409）。
- LiveKit 返回缺失或重复 identity、查询失败、服务 URL 无法构造或配置不完整时拒绝签发 `VOICE_CAPACITY_CHECK_FAILED`（503）；不会绕过容量检查发 token。
- 该检查是 token 签发时的查询后近似上限：并发请求之间无法形成跨 LiveKit 与应用数据库的原子锁。发布后应监控该错误码与 LiveKit 房间人数，不应宣称为绝对并发硬锁。

## 验证与发布前置

运行：

```text
apps/server: npm run test:room-voice
apps/web:    npm run test:room-voice
apps/web:    npm run test:stage
apps/server: npm run typecheck
apps/web:    npm run typecheck
apps/web:    npm run build
```

本地执行 `npm install --ignore-scripts` 后，server typecheck 前还需要 `npm run db:generate` 生成 Prisma client；不产生 migration。

本候选不部署。发布线程受控 activate 后，先检查线上静态包含 `voice/status` 与“加入语音”，再进行双浏览器/真人通话验收；核心通话异常时按既定语音配置/服务回退流程处理。

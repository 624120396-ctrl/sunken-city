# 房间系统身份、生命周期与结算迭代交付说明

日期：2026-07-03
分支：`codex/room-system-lifecycle-contract`
工作区：`C:\Users\29102\Documents\沉没之城\.worktrees\room-system-lifecycle-contract`

## 1. 本轮结论

本轮没有做彻底重构，而是完成了一层兼容式升级：保留旧 `Room`、`RoomMember`、Socket 事件和既有房间页主体逻辑，同时新增统一权限契约、生命周期、角色绑定锁定、观察者加入、结算草案和结团写回链路。

这样做的目的有两个：

- 先解决 KP / PL / 观察者身份混用、KP 绑定角色卡、进行中角色卡占用不清晰的问题。
- 为后续彻底重构和前端视觉升级保留稳定边界，后续 UI 可以围绕 `myRole`、`myCapabilities`、`myBinding`、`lifecycle` 重建，而不是继续在页面里散落业务判断。

## 2. 核心交付

### 2.1 统一身份与权限契约

新增后端契约：

- `apps/server/src/modules/rooms/room-auth.ts`
- `apps/server/src/modules/rooms/room-view.ts`

对前端稳定输出：

- `myRole`: `OWNER_KP | ASSISTANT_KP | PLAYER | OBSERVER | NON_MEMBER`
- `myCapabilities`: 当前用户可执行能力矩阵
- `myBinding`: 当前房间成员、角色绑定、加入模式
- `lifecycle`: 房间业务生命周期

旧字段 `isCreator`、`isMember` 仍保留，用于兼容旧前端，但新 UI 不再只用 `isCreator` 推断 KP。

### 2.2 生命周期

新增生命周期：

- `PREPARING`
- `READY`
- `IN_PROGRESS`
- `PAUSED`
- `FINISHING`
- `FINISHED`
- `CANCELLED`

新增接口：

- `POST /api/rooms/:roomId/lifecycle/start`
- `POST /api/rooms/:roomId/lifecycle/pause`
- `POST /api/rooms/:roomId/lifecycle/resume`
- `POST /api/rooms/:roomId/lifecycle/finishing`
- `POST /api/rooms/:roomId/lifecycle/finalize`
- `POST /api/rooms/:roomId/lifecycle/cancel`

开场会锁定本场 PLAYER 的角色卡；结团或取消会释放占用。`finalize` 只写回已确认或已批准且未应用过的结算项。

### 2.3 角色绑定与观察者

规则已经落地：

- KP 创建房间时不再绑定角色卡。
- PLAYER 加入必须绑定自己拥有的角色卡。
- OBSERVER 不绑定角色卡。
- 私聊限制为本房间有效 PLAYER，观察者不能用角色私聊。
- 进行中/暂停中的角色卡会通过 `RoomCharacterLock` 占用，避免同一角色卡参与多个进行中房间。

### 2.4 KP 工具权限收口

房间相关写操作逐步改为调用 `requireRoomCapability(...)`，包括：

- KP 笔记
- 线索
- NPC
- 阶段 / 场景
- 子房间
- 日志 / 事件
- 战斗控制
- 公开发言、公开骰、秘密骰等高风险操作

已结团或取消后的写操作会被 capability 阻止；前端也修正为不再用 legacy fallback 覆盖后端明确返回的 `false`。

### 2.5 房间页和列表页 UI

房间页新增：

- 生命周期状态横幅
- KP 生命周期控制
- PLAYER / OBSERVER 加入入口
- FINISHING 状态下的 KP 结算工作台

房间列表新增：

- 筛选：全部、我主持、我参与、观察中、准备中、进行中、已结团
- 卡片显示当前生命周期、当前用户身份、活跃人数、观察人数
- 已结团 / 已取消房间只对房主或历史成员出现在列表里，不公开展示给无关用户

视觉变更保持小范围：只调整房间卡片标签、筛选按钮和状态面板，没有做整体视觉 redesign。

### 2.6 结算工作台

新增后端接口：

- `GET /api/rooms/:roomId/settlements`
- `PATCH /api/rooms/:roomId/settlements/:characterId`
- `PUT /api/rooms/:roomId/settlements/:characterId`

限制：

- 仅 KP 可读写结算草案。
- 房间必须处于 `FINISHING`。
- 只能为当前 `RoomRun` 的 PLAYER participant 创建或更新结算。
- 保存草案不会直接改角色卡。
- 角色卡写回仍由 `POST /api/rooms/:roomId/lifecycle/finalize` 完成。

结算字段：

- `outcome`
- `hpFinal`
- `mpFinal`
- `sanFinal`
- `expAward`
- `skillGrowth`
- `itemChanges`
- `kpNote`
- `status`

前端结算工作台提供：

- 每名调查员独立结算条目
- 保存草案
- 确认结算
- JSON 数组输入的解析错误提示
- 结团按钮：`确认结团并写回角色卡`

确认文案：

```text
此操作会释放本场角色占用，并将确认的结算结果写回角色卡。已结团房间不会继续普通游戏推进。
```

### 2.7 报告页

报告页最小接入结算数据：

- 角色结局
- 结算状态
- 最终 HP / MP / SAN
- EXP 奖励
- KP 备注

报告接口已补权限校验：

- `GET /rooms/:roomId/report`
- `PATCH /rooms/:roomId/report`
- `GET /rooms/:roomId/report/export`

现在这些接口都会先校验 `canViewPublicContent`。已结团房间的相关成员仍可读；无关登录用户不能仅凭 `roomId` 读取结算和 KP 备注。

## 3. 数据模型

新增模型：

- `RoomRun`
- `RoomRunParticipant`
- `RoomCharacterLock`
- `RoomSettlement`

本轮没有删除旧字段。`Room.creatorId`、`Room.status`、`RoomMember.role`、`RoomMember.characterId`、`RoomMessage.isSecret` 等旧结构继续保留。

这为后续多次开团、软删除、持久化战斗、私聊重构预留了迁移空间。

## 4. 前端重构边界

后续前端升级建议继续遵守以下边界：

- UI 根据 `myCapabilities` 渲染按钮，不直接猜测权限。
- 身份展示可使用 `roomRoleCompactLabels` / `roomRoleFullLabels`。
- 列表和房间页使用 `normalizeRoomListItem` 等契约 helper 处理旧响应。
- 结算工作台只负责保存草案和确认状态，不直接写角色卡。
- 角色成长机制仍应在结团后围绕已确认结算和角色成长页继续完善。

建议后续拆分：

- `RoomShell`
- `RoomStage`
- `RoomParticipantRail`
- `KpWorkbench`
- `PlayerConsole`
- `ObserverConsole`

本轮没有强拆 `RoomPage.tsx`，避免和即将到来的视觉升级互相冲突。

## 5. 已验证范围

按用户要求，本轮没有做深度测试、Playwright、端到端或视觉回归。

已执行的轻量验证包括：

- `cd apps/server; npm run typecheck`
- `cd apps/web; npm run typecheck`
- 多轮静态规格审查
- 多轮静态代码质量审查
- `git diff --check` 类空白检查
- `npx prisma validate --schema prisma/schema.prisma`
- 临时 SQLite 当前 schema API 冒烟：
  - KP 创建房间且不绑定角色卡
  - PL 绑定角色加入
  - 观察者无角色加入
  - 开场、进入结算、保存确认结算、结团
  - 结团写回角色 HP / MP / SAN
  - PL 房间列表可见相关已结团房间
  - 成员报告可见结算数据
  - 非成员读取报告返回 403
  - 角色占用锁释放
- 生产环境专项 API 冒烟：
  - 时间戳：`20260703105243`
  - 测试房间：`T5R936`
  - 测试用户：`CodexSmokeKP105243`、`CodexSmokePL105243`、`CodexSmokeOBS105243`、`CodexSmokeOUT105243`
  - 测试角色：`f7479828-63c1-4a00-8a82-20ac517c3e5d`
  - 验证通过：KP 不绑定角色卡、PL 绑定角色加入、观察者只读、PL 不能访问结算工作台、开场到结团链路、结团写回 HP / MP / SAN、相关 PL 可见已结团房间、成员报告可见结算备注、非成员读取报告返回 403、角色锁释放
  - 部署后复查：`/health` 返回 `ok`，`coc-server` 在线，新表计数 `RoomRun=1`、`RoomCharacterLock=1`、`RoomSettlement=1`

新增可复用轻量检查脚本：

- `cd apps/server; npm run check:room-migration`
  - 只读检查当前 `DATABASE_URL` 指向的数据库是否存在 `RoomRun`、`RoomRunParticipant`、`RoomCharacterLock`、`RoomSettlement` 和迁移记录。
  - 本地 PowerShell 示例：`$env:DATABASE_URL="file:./dev.db"; npm run check:room-migration`
  - 如果表存在但 `_prisma_migrations` 未记录本轮迁移，脚本会提示先备份，再执行 `npx prisma migrate resolve --applied 20260703080000_add_room_lifecycle_and_settlement`。
- `cd apps/server; npm run test:room-system`
  - 房间系统专项写入型冒烟脚本，覆盖 KP / PL / OBS 身份、角色绑定、生命周期、结算、报告权限和角色锁释放。
  - 默认拒绝写入；必须显式设置 `ROOM_SYSTEM_SMOKE_WRITE=1`。
  - 本地 PowerShell 示例：`$env:DATABASE_URL="file:./dev.db"; $env:ROOM_SYSTEM_SMOKE_WRITE="1"; $env:ROOM_SYSTEM_SMOKE_BASE_URL="http://127.0.0.1:3001"; npm run test:room-system`
  - 不建议随手对生产库运行；只有在明确接受生成 `CodexSmoke*` 测试用户、房间和角色数据时才执行。

实现过程中发现并修复过的关键问题：

- 前端 fallback 曾覆盖后端 capability `false`，已改为只在 capability 缺失时 fallback。
- 已结团筛选曾因后端只查 `ACTIVE` 不可用，已改为相关用户可见自己的 `CLOSED` 房间。
- 报告接口曾缺少成员权限校验，已补 `canViewPublicContent`。
- 报告 JSON 字段曾直接 `JSON.parse` 并假设数组，已改安全数组解析。

## 6. 已知限制与后续建议

暂未完成：

- 没有做完整 UI 视觉重构。
- 没有改 Socket 事件格式。
- 没有把战斗内存状态迁移到持久化战斗模型。
- 没有实现进行中换卡申请 / KP 审批完整流程。
- 没有对 HP / MP / SAN 上限做严格规则校验，目前只做非负整数校验。
- `skillGrowth` 和 `itemChanges` 仍是数组草案，后续需要和正式角色成长机制打通。
- 当前 Prisma 迁移历史不能作为全新环境建库的可靠依据：`prisma migrate deploy` / `prisma db push` 在临时库上触发 schema engine error；手动诊断显示历史迁移与当前 schema 存在漂移，例如当前 schema 需要的 `User.displayId`、`FishingItem` 等结构不完全来自迁移历史。上述 API 冒烟使用 `prisma migrate diff --from-empty --to-schema-datamodel` 生成当前 schema 建库 SQL 后执行。上线或全新环境部署前，应单独整理迁移历史或做一次迁移基线化。

下一阶段建议：

1. 先做一次人工冒烟：创建房间、PL 加入、观察者加入、开场、进入结算、保存结算、确认结团、报告查看。
2. 再设计“结团后的角色成长”正式规则，避免把技能成长直接塞进本轮最小工作台。
3. 前端视觉升级时围绕 capability contract 拆页面，不再从 `RoomPage.tsx` 继续堆权限判断。
4. 后端下一步考虑软删除和多 `RoomRun`，避免长团和复盘场景受 `roomId @unique` 限制。

## 7. 相关提交

- `2d844da` docs: add room lifecycle contract plan
- `58873d2` chore(server): add rate limit dependency
- `032cebf` feat(server): add room auth capability contract
- `33bb266` fix(server): harden room auth capability defaults
- `805814f` feat(server): add room lifecycle persistence
- `22047bc` fix(server): restrict room settlement writeback to players
- `b967482` fix(server): harden room lifecycle consistency
- `e60331c` fix(server): guard room lifecycle transitions
- `3947a1e` feat(server): add room join binding modes
- `a566aaa` fix(server): preserve room join compatibility
- `a538270` refactor(server): centralize room route permissions
- `ac0f3fb` fix(server): block closed room writes
- `cb08530` feat(web): add room lifecycle service contract
- `70e1222` fix(web): type room service contracts
- `1c63ab7` feat(web): connect room page capabilities
- `33cd9f4` fix(web): respect room capability false values
- `2be716b` feat(web): add room list role filters
- `d5cbfb1` fix(rooms): include related closed rooms in list
- `a4f20dd` feat(room): add settlement workbench
- `84fe63a` fix(room): guard report settlement data

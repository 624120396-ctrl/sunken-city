# 全站招募板 + 关于与帮助交接

日期：2026-07-10

## 范围

本轮新增两个普通主站入口：

- `/recruitments`：全站招募板。用于发布和发现站内房间、站外、线上、线下以及任意 TRPG/跑团招募。
- `/help`：关于与帮助。用于新手路径、版本与更新记录、当前能力边界和常见问题。

已接入：

- 桌面侧边导航。
- 移动底部导航。
- 命令面板。
- 发光的秘仪档案馆视觉基线：明亮纸面、克制金色、深海冷雾、可读 Surface。

## 房间边界

本轮没有修改：

- 房间生命周期。
- Socket 事件。
- 骰点、战斗、结算。
- 现有房间招募、申请、邀请、准备度。
- 真实 AI、官方规则书自动化、结团后角色成长。
- 房间内既有招募、申请、邀请接口的生命周期语义。

站内房间招募必须绑定房间短 ID，且发布者必须拥有该房间的成员管理权限；外部活动不要求绑定房间。关闭或过期全站招募只影响全站招募板，不改变任何房间成员状态。

## 后端接口契约

新增路由挂载在 `/api`：

- `GET /api/recruitments`
  - 查询参数：`status=OPEN|CLOSED|EXPIRED|ALL`、`sourceType=INTERNAL_ROOM|EXTERNAL_EVENT|ALL`、`q`、`mine=1`
  - 返回 `{ posts }`
- `POST /api/recruitments`
  - 创建招募。
- `GET /api/recruitments/:postId`
  - 获取单条招募。
- `PATCH /api/recruitments/:postId`
  - 作者编辑、关闭、重开招募。
- `POST /api/recruitments/:postId/responses`
  - 报名或联系作者。
- `PATCH /api/recruitments/:postId/responses/:responseId`
  - 作者接纳/婉拒；报名者撤回。关联站内房间的条目在接纳时复用现有房间权限与邀请契约，创建 `RoomInvitation`；外部活动不创建房间邀请。
- `POST /api/recruitments/:postId/reports`
  - 记录骚扰、垃圾信息、不实内容、安全风险或其他举报。
- `GET /api/admin/recruitments/reports`
  - 管理员获取举报队列，支持 `status=OPEN|RESOLVED|DISMISSED|ALL`。
- `PATCH /api/admin/recruitments/reports/:reportId`
  - 管理员标记已处理/忽略；可传 `closePost=true` 关闭公共招募，不影响关联房间。

联系信息公开范围：

- `PUBLIC`：列表和详情直接显示。
- `LOGGED_IN`：登录用户可见。
- `RESPONDERS`：作者或已报名/联系者可见，默认值。

## 数据库迁移

新增迁移：

`apps/server/prisma/migrations/20260710090000_add_global_recruitment_board/migration.sql`

新增表：

- `GlobalRecruitmentPost`
- `GlobalRecruitmentResponse`
- `GlobalRecruitmentReport`

新增可选关系：

- `GlobalRecruitmentPost.roomId` 可选关联 `Room.id`，删除房间时设为 `NULL`。
- 作者、报名者、举报者均关联 `User`，删除用户时级联删除相关记录。

部署前需要运行 Prisma 迁移并生成客户端。

## 前端维护源

版本号单一来源是仓库根目录 `VERSION`，更新记录单一来源是根目录 `CHANGELOG.md`。`apps/web/vite.config.ts` 在构建时读取二者并注入 `/help`；`apps/web/src/data/release-notes.ts` 只负责解析展示，不再维护副本。

## 限制

- 举报审核只包含队列处理和关闭公共招募，不含封禁、管理员通知或自动判罚。
- 站内房间招募的接纳会创建既有房间邀请，但不会自动把报名者直接加入房间，也不会改写房间生命周期。
- 外部活动联系方式由发布者填写，平台只做可见性过滤，不验证第三方账号真实性。
- 招募过期状态通过查询时计算，数据库原始 `status` 仍保留 `OPEN` 或 `CLOSED`。

## 轻量验证

已执行：

- `cd apps/server && npx tsx --test scripts/global-recruitment-policy.test.ts`
- `cd apps/server && npm run typecheck`
- `cd apps/web && npm run typecheck`

备注：

- 直接执行 `node --test --experimental-strip-types` 会因当前仓库无扩展名 TS import 解析失败，既有同类测试脚本也有相同问题；本轮使用项目可用的 `npx tsx --test`。

## 后续主线程决策

已落实的主线程决策：

1. 已新增管理员举报审核页 `/admin/recruitment-reports`，不含封禁或自动处罚。
2. 已接纳的站内房间报名会生成既有 `RoomInvitation`，报名者仍需自行接受并完成角色绑定。
3. 故事书列表页入口由房间系统线程 `019f3687-40d9-7f01-8f40-3c48d7b8c57d` 接入；已同步目标路由 `/recruitments`，避免修改同一页面文件。
4. `/help` 已改为构建时读取根目录 `VERSION` 与 `CHANGELOG.md`。

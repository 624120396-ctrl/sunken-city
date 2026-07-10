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
- 后台 / admin。

全站招募板可选绑定站内房间短 ID，但外部活动不要求绑定房间。关闭或过期全站招募只影响全站招募板，不改变任何房间成员状态。

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
  - 作者接纳/婉拒；报名者撤回。
- `POST /api/recruitments/:postId/reports`
  - 记录骚扰、垃圾信息、不实内容、安全风险或其他举报。

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

版本与更新记录的单一前端维护源：

`apps/web/src/data/release-notes.ts`

`/help` 页面从这里读取当前版本与更新条目。当前版本为 `1.3.0`，与仓库 `VERSION` 对齐。

## 限制

- V1 举报只做记录，不含后台审核队列、封禁、自动下架。
- V1 报名/联系只在站内留下记录和通知，不自动创建房间成员。
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

需要主线程决定：

1. 是否为全站招募举报补后台审核页或管理员通知。
2. 是否让已接纳报名自动进入站内房间邀请流程。
3. 是否把全站招募摘要嵌入故事书列表页。
4. 是否把 `/help` 的版本记录改为构建时读取根目录 `VERSION` / `CHANGELOG.md`。

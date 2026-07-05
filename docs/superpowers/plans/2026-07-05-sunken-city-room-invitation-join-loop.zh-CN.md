# 《沉没之城》房间邀请与申请加入闭环计划

日期：2026-07-05

## 目标

在 Phase 7 招募资料与申请审核的基础上，补齐一个可用但保守的入房闭环：

- KP 可以按已注册用户邮箱发出房间邀请。
- 受邀用户可以接受或拒绝邀请。
- 被批准的申请者可以主动选择角色加入房间。
- 申请通过和邀请接受都不会绕过角色归属、角色锁和房间阶段检查。

## 非目标

- 不做公开招募广场。
- 不改旧的 `/rooms/:roomId/join` 直入接口行为。
- 不触碰 Socket、骰点、战斗、私聊、结算或房间生命周期契约。
- 不做视觉重构，只提供最小可用交互。

## 数据模型

新增 `RoomInvitation`：

- 绑定房间、邀请人、受邀人。
- 保存目标身份：`PLAYER` 或 `OBSERVER`。
- 保存状态：`PENDING`、`ACCEPTED`、`DECLINED`、`CANCELLED`。
- 每个房间对同一用户保留一条邀请记录，可重新发送覆盖为待回应状态。

## 后端接口

- `POST /api/rooms/:roomId/recruitment/invitations`
  - KP 发邀请。
- `POST /api/rooms/:roomId/recruitment/invitations/:invitationId/cancel`
  - KP 取消待处理邀请。
- `POST /api/rooms/:roomId/recruitment/invitations/:invitationId/respond`
  - 受邀用户接受或拒绝邀请。
- `POST /api/rooms/:roomId/recruitment/applications/:applicationId/join`
  - 申请已通过的用户主动加入。

## 权限与边界

- KP 操作继续依赖 `canManageMembers`。
- 受邀人只能处理自己的邀请。
- 申请者只能使用自己的已批准申请。
- 玩家席位只允许在 `PREPARING` 或 `READY` 加入。
- 观察者不允许加入已结束或已取消房间。

## 轻量验证

- Prisma schema validate。
- 后端 TypeScript typecheck。
- 前端 TypeScript typecheck。
- 迁移状态检查。
- 后端健康检查。

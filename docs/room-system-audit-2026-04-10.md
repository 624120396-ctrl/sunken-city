# 沉没之城 · 房间系统全面审计报告

> 审查范围：Room 前后端路由、Socket.io 实时通信、战斗/私聊/倒计时/线索/NPC 关联模块、Prisma Schema

---

## 一、致命与严重 BUG

### 1. 战斗系统完全依赖内存，服务器重启即丢
**影响**：房间内正在进行的战斗，后端一重启全部清零。
**现状**：`socket.ts` 第 169 行 `const combatStates = new Map<string, any>()` 仅存于 Node 进程内存。`Room.combatState`（schema 中的 `String?` 字段）从未被使用。
**建议**：战斗开启/攻击/回合切换/结束时，将 `combatStates` 序列化持久化到 `room.combatState` 或独立 `CombatState` 表；重连时自动恢复。

### 2. 战斗中 HP 变化不落库，打完即回满
**影响**：一场战斗把玩家 HP 从 10 打到 3，结束后刷新页面，HP 变回 10。
**现状**：`combat:attack` 只改 `combatStates` 内存对象，没有任何 `prisma.character.update({ hp: ... })`。
**建议**：攻击命中并扣血后，立即同步写 `Character.hp`；或至少在 `combat:end` 时把最终 HP/MB/MP 批量写回数据库。

### 3. Socket 消息发送缺乏成员身份校验（权限漏洞）
**影响**：已退出房间的用户，只要 socket 没断，仍可继续发消息、投骰。
**现状**：`socket.ts` 的 `message:send` 和 `dice:roll` 仅检查 `room` 是否存在，**不验证该用户是否仍在 `room.members` 中、是否 `approved`、是否 `!leftAt`**。
**建议**：在事件处理最开始执行强制校验：
```ts
const member = await prisma.roomMember.findFirst({
  where: { roomId: room.id, userId: socket.user!.userId, leftAt: null, joinStatus: 'approved' }
});
if (!member) return socket.emit('error', { message: '无权操作' });
```

### 4. 私聊可发送给已退出/未审核成员
**影响**：玩家可以给已经离开房间的人发私聊；KP 可以给 pending 玩家发私聊。
**现状**：`private-message.routes.ts` POST 接口验证 `receiverMember` 时，没有过滤 `leftAt: null` 和 `joinStatus: 'approved'`。
**建议**：receiver 校验增加 `leftAt: null` + `joinStatus: 'approved'`。

### 5. 房间列表人数统计失真
**影响**：房间卡片显示的 memberCount 比实际在房里的人多。
**现状**：`router.get('/')` 使用 `_count: { select: { members: true } }`，这会把**已退出、pending、rejected** 的所有历史记录都统计进去。
**建议**：改为 raw query 或子查询：`SELECT COUNT(*) FROM RoomMember WHERE roomId = ? AND leftAt IS NULL AND joinStatus = 'approved'`。

---

## 二、数据一致性与状态逻辑缺陷

### 6. `isGameStarted` 与 `room.status === 'PLAYING'` 二义
**影响**：不清楚到底该看哪个字段判断游戏是否开始。`start_game` 路由只改了 `status: 'PLAYING'`，`isGameStarted` 永远是 `false`。
**建议**：
- 方案 A：废弃 `isGameStarted`，统一使用 `status`。
- 方案 B：`start_game` 时同时更新 `isGameStarted = true` + `gameStartedAt = now()`。

### 7. 获取单个房间时拉取过多历史成员
**影响**：热门房间（玩家频繁进出）查询性能越来越差。
**现状**：`GET /:roomId` 的 `include: { members: { include: { user: {...} } } }` 没有 `where: { leftAt: null }` 预过滤，虽然返回前用 `.filter(m => !m.leftAt)` 剃掉了。这导致头像框、称号、位阶的批量查询也都要处理这些废弃成员。
**建议**：在 `include.members` 里直接加 `where: { leftAt: null }`。

### 8. 战后报告 `CombatLog` 表是僵尸表
**影响**：Schema 里有 `CombatLog` 模型，但没有任何代码往里面写数据。`SessionReport` 的 `combatRounds` / `diceRollCount` 等字段也找不到填充逻辑。
**建议**：
- 要么在 `combat:attack`、`combat:start/end` 时写入 `CombatLog`；
- 要么如果计划废弃，写迁移脚本清理这些无用字段/表。

### 9. 房间短 ID 碰撞未处理
**影响**：虽然概率低（36^6），但 `generateRoomId()` 直接 create，如果碰撞会抛 Prisma 唯一约束错误并 500。
**现状**：`roomId` 有 `@unique`，但没有 try-catch 重试机制。
**建议**：生成 + create 包在 `while` 循环里，捕获 `P2002` unique constraint 错误后重试。

---

## 三、前端交互与体验问题

### 10. 私聊没有 Socket 实时推送
**影响**：A 给 B 发私聊，B 必须等 5 秒轮询或手动点开私聊面板才能看到。
**现状**：私聊完全走 HTTP API，没有 socket 事件通知。
**建议**：在 `private-message.routes.ts` POST 成功后，通过 Socket.io 向接收者在线 socket emit `'private_message:received'`，前端监听并立即刷新未读数。

### 11. 倒计时纯靠 5 秒轮询，没有实时感
**影响**：KP 创建倒计时，其他玩家要等最多 5 秒才看到。
**现状**：只有轮询，没有 socket 广播。
**建议**：创建/停止倒计时后通过 socket 广播 `countdown:updated` 事件；前端保留这个事件监听器。

### 12. 前端没有监听 `combat:turn_changed`
**影响**：后端 emit 了 `combat:turn_changed`（`socket.ts:1003`），但前端 `useSocket.ts` 根本没注册这个事件，虽然 `combat:updated` 会补偿状态更新。
**建议**：在 `useSocket.ts` 增加 `onCombatTurnChanged` 回调，前端可做更明显的回合高亮或音效提示。

### 13. 非成员会被强制弹窗并只能退回房间列表
**影响**：游客想围观房间都不行，一进就被「申请加入房间」Modal 糊脸，关闭即 `navigate('/rooms')`。
**现状**：`fetchRoom()` 中 `if (!data.room.isMember) { fetchMyCharacters(); }`，而 `fetchMyCharacters` 直接 `setShowCharacterModal(true)`，Modal 的 `onClose = () => navigate('/rooms')`。
**建议**：非成员应允许浏览房间信息（只读模式），把弹窗改为「申请加入」按钮而非强制弹窗。

### 14. 轮询请求过频且范围过大
**影响**：每 5 秒同时 pull `countdowns`、`private unread`、`npcs`、`clues`，产生持续请求浪涌。
**现状**：`RoomPage.tsx` 的 `useEffect`（397 行）把这四个接口包在一个 interval 里。
**建议**：
- NPCs 和 Clues 在加入房间时加载一次即可（或只有 KP 操作后才需要刷新）；
- 倒计时改成 socket 推送后，可大幅减少轮询；
- 私聊通过 socket 推送后，可以去掉 `fetchPrivateUnreadCount` 轮询。

### 15. 本地线索缓存与系统线索板命名混淆
**影响**：`clues`（localStorage）是玩家自己标记的消息线索；`roomClues`（后端）是 KP 创建的线索板。两者混在同一页面但逻辑完全隔离，命名易混淆。
**建议**：把 localStorage 的 `clues` 改名为 `markedMessages` 或 `playerNotes`。

### 16. `handleSendMessage` 没有防御式双重校验
**影响**：虽然 UI 层面 disabled 了未审核用户，但如果通过快捷命令 `/骰 ` 触发，一样可以走 `socketSendMessage`。
**现状**：`/骰 ` 命令直接调用 `handleRollDice`，不检查 `isApproved`。
**建议**：在所有发送消息的入口统一前置校验 `room?.isApproved || room?.isCreator`。

---

## 四、权限与边界问题

### 17. KP 无法转移，Creator 掉线即卡死
**影响**：KP creator 离开或长期掉线后，房间里没人能审核新成员、开启游戏、修改氛围。
**现状**：没有任何「转让 KP」或「指定副 KP」的机制。
**建议**：增加 `POST /rooms/:roomId/transfer-kp` 接口，只允许 creator 转移 creatorId 和 KP role。

### 18. `RoomNpc.delete` 路由做了硬删除，而非软删除
**影响**：与 `isActive` 字段的设计意图矛盾。
**现状**：`DELETE /rooms/:roomId/npcs/:npcId` 直接 `prisma.roomNpc.delete`，但 schema 给了 `isActive` 字段，且 `GET npcs` 过滤了 `isActive: true`。
**建议**：删除改为 `update({ isActive: false })`，或者干脆去掉 `isActive` 改成真删除。

---

## 五、已确认但已修复的问题（本次会话）

1. **退出后再次加入失效** → 已修复：加入路由现在会恢复历史 `approved` 记录。
2. **isApproved 未排除 leftAt** → 已修复：查询时增加了 `!m.leftAt` 条件。
3. **pending 重复检查未过滤 leftAt** → 已修复。

---

## 六、修复优先级建议

| 优先级 | 事项 |
|--------|------|
| P0 | 战斗持久化（内存 → 数据库） |
| P0 | Socket 消息/骰子增加成员身份校验 |
| P1 | 战斗中 HP 同步回 Character 表 |
| P1 | 私聊实时推送 + 接收者状态校验 |
| P1 | 房间列表人数统计修复 |
| P2 | 统一 `isGameStarted` / `status` 语义 |
| P2 | 轮询改 socket 推送（倒计时、NPC、线索） |
| P2 | 非成员只读模式（取消强制弹窗） |
| P3 | 增加 KP 转移功能 |
| P3 | 清理僵尸 `CombatLog` 表/字段 |

---

是否需要我现在按优先级开始修复？我可以先处理 P0 的战斗持久化和 Socket 校验。
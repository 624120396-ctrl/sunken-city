# 数据库架构审查报告

## 执行时间
2026-04-04 14:50

---

## 1. 索引优化分析

### 当前索引状态

| 表名 | 已有索引 | 缺失索引 | 优先级 |
|------|----------|----------|--------|
| User | email (unique) | createdAt, isAdmin | 低 |
| Character | userId | occupation, createdAt | 中 |
| Room | roomId (unique), creatorId | status, atmosphere, createdAt | 中 |
| RoomMember | roomId+userId (unique) | characterId, role, joinedAt | 高 |
| DiceRoll | - | roomId+createdAt, userId, successLevel | 高 |
| PrivateMessage | roomId+receiverId, createdAt | senderId+receiverId | 高 |
| Countdown | roomId | isActive | 中 |
| CombatLog | roomId | round+timestamp | 中 |
| SessionReport | roomId | createdAt | 低 |

### 建议添加的索引

```prisma
// RoomMember - 优化成员查询
@@index([roomId])
@@index([userId])
@@index([characterId])

// DiceRoll - 优化投骰历史查询
@@index([roomId, createdAt])
@@index([userId, createdAt])

// PrivateMessage - 优化私聊列表
@@index([senderId, receiverId])
@@index([roomId, senderId, createdAt])

// Character - 优化角色列表
@@index([userId, createdAt])
```

---

## 2. 字段类型审查

### 建议修改的字段

| 表名 | 字段 | 当前类型 | 建议类型 | 原因 |
|------|------|----------|----------|------|
| Character | age | Int | Int | 合理 |
| Character | gender | String? | String? | 合理，但建议用枚举 |
| Room | atmosphere | String | AtmosphereType | 建议用枚举 |
| RoomMember | role | String | RoomRole | 建议用枚举 |
| DiceRoll | rollType | String | RollType | 建议用枚举 |
| DiceRoll | successLevel | String? | SuccessLevel? | 建议用枚举 |

### 建议添加的枚举类型

```prisma
enum AtmosphereType {
  NORMAL
  DARK
  HORROR
  MYSTERY
  WARM
}

enum RoomRole {
  KP
  PLAYER
  OBSERVER
}

enum RollType {
  D100
  D20
  D12
  D10
  D8
  D6
  D4
  D3
}

enum SuccessLevel {
  CRITICAL_SUCCESS  // 大成功
  EXTREME_SUCCESS   // 极难成功
  HARD_SUCCESS      // 困难成功
  SUCCESS           // 成功
  FAILURE           // 失败
  FUMBLE            // 大失败
}
```

---

## 3. 关系完整性审查

### 发现的问题

#### 3.1 DiceRoll 的外键可空性
```prisma
// 当前
roomId  String?
userId  String?

// 问题：投骰记录应该总是关联到用户，可能允许不关联房间（私聊投骰）
// 建议：userId 设为必填，roomId 保持可选
```

#### 3.2 CombatLog 缺少外键关联
```prisma
// 当前
model CombatLog {
  roomId String
  userId String?
  // ...
  // 缺少：@@index([roomId])
  // 缺少外键关联到 Room 表
}

// 建议：添加关系
room Room @relation(fields: [roomId], references: [id])
```

#### 3.3 SessionReport 缺少外键关联
```prisma
// 当前
roomId String

// 建议：添加关系
room Room @relation(fields: [roomId], references: [id])
```

---

## 4. 数据一致性约束

### 建议添加的约束

```prisma
// Character - 属性值范围约束
// HP/MP/SAN 不应为负数
// 属性值应在合理范围（0-100）

// 建议添加验证
// - hp >= 0
// - mp >= 0  
// - san >= 0
// - 0 <= str <= 100
// ... 其他属性

// Room - 状态约束
// status 应为 ACTIVE, CLOSED, ARCHIVED
```

---

## 5. 可扩展性考虑

### 5.1 多规则系统预留

当前所有字段都针对 COC7 规则。为多规则支持建议：

```prisma
// 新增：规则类型字段
model Room {
  ruleSystem String @default("COC7") // COC7, DND5E, CUSTOM
}

model Character {
  ruleSystem String @default("COC7")
  // 将 COC 特定字段改为 JSON 存储其他规则属性
  extraAttributes String @default("{}") // 其他规则特有属性
}
```

### 5.2 消息持久化预留

```prisma
// 当前只有私聊消息持久化
// 建议添加公共消息表

model ChatMessage {
  id          String   @id @default(uuid())
  roomId      String
  userId      String
  characterId String?  // 绑定角色时
  content     String
  type        String   @default("TEXT") // TEXT, DICE, SYSTEM, NARRATION
  metadata    String?  // JSON: {rollData, etc}
  createdAt   DateTime @default(now())

  room Room @relation(fields: [roomId], references: [id])
  user User @relation(fields: [userId], references: [id])
  
  @@index([roomId, createdAt])
  @@index([userId, createdAt])
}
```

### 5.3 附件/资源存储

```prisma
model Asset {
  id          String   @id @default(uuid())
  userId      String
  type        String   // AVATAR, ROOM_BG, CHARACTER_SHEET, OTHER
  mimeType    String
  size        Int      // bytes
  url         String
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
  
  @@index([userId, type])
}
```

---

## 6. 性能优化建议

### 6.1 频繁更新字段分离

`RoomStats` 表每次投骰都更新，考虑使用 Redis 缓存：

```prisma
// 保留 RoomStats 但降低更新频率
// 每5次投骰或每30秒批量更新一次
```

### 6.2 JSON 字段规范化

当前使用 JSON 存储的数据：
- `Character.skills` - 技能对象
- `Character.weapons` - 武器数组
- `Character.quickSkills` - 快捷技能数组
- `RoomMember.statusTags` - 状态标记

**短期**：保持 JSON，查询时小心
**长期**：考虑拆分为关联表，如果需要复杂查询

### 6.3 软删除支持

```prisma
// 建议添加 deletedAt 字段支持软删除
model Character {
  // ...
  deletedAt DateTime?
  
  @@index([deletedAt])
}
```

---

## 7. 建议的优化 Schema

```prisma
// 完整优化后的 schema 见 ./schemaOptimized.prisma
```

---

## 8. 迁移策略

### 阶段1：添加索引（零停机）
```sql
-- 创建索引（SQLite 支持在线索引创建）
CREATE INDEX IF NOT EXISTS idx_room_member_room ON RoomMember(roomId);
CREATE INDEX IF NOT EXISTS idx_dice_roll_room_time ON DiceRoll(roomId, createdAt);
```

### 阶段2：添加字段（向后兼容）
- 所有新增字段必须有默认值
- 使用 @default 装饰器

### 阶段3：枚举类型转换
- 需要数据迁移脚本
- 建议在低峰期执行

---

## 9. 总结

| 优先级 | 任务 | 预估时间 |
|--------|------|----------|
| 高 | 添加缺失索引 | 30分钟 |
| 高 | 修复 CombatLog/SessionReport 外键 | 30分钟 |
| 中 | 添加枚举类型 | 1小时 |
| 中 | 添加 ChatMessage 表 | 2小时 |
| 低 | 软删除支持 | 1小时 |
| 低 | Asset 资源表 | 2小时 |

**立即可执行**：索引优化、外键修复（零风险）
**需要测试**：枚举类型转换（需要数据迁移）

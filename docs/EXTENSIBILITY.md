# 扩展性预留 - 技术方案文档

## 概述

为 COC 跑团平台预留可扩展性架构，确保新增模块、功能扩展、多规则支持等场景下代码可维护、数据可迁移、功能可插拔。

---

## 需求1：插件/模组系统架构

### 问题
- 目前所有功能硬编码，新增规则（如DND）需要大量修改
- 房间设置、角色卡字段无法自定义
- 第三方扩展无法接入

### 解决方案

**数据库扩展**
```prisma
// 插件注册表
model Plugin {
  id          String   @id @default(uuid())
  name        String   @unique
  version     String
  config      String   @default("{}")  // JSON配置
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}

// 房间插件配置
model RoomPlugin {
  id        String   @id @default(uuid())
  roomId    String
  pluginId  String
  config    String   @default("{}")
  
  @@unique([roomId, pluginId])
}

// 自定义字段定义（支持角色卡/房间扩展）
model CustomField {
  id          String   @id @default(uuid())
  entityType  String   // 'character', 'room', 'user'
  fieldKey    String
  fieldType   String   // 'text', 'number', 'select', 'boolean'
  label       String
  defaultValue String?
  options     String?  // JSON for select type
  isRequired  Boolean  @default(false)
  order       Int      @default(0)
  
  @@unique([entityType, fieldKey])
}
```

**前端扩展点**
- 角色卡编辑页：动态字段渲染组件
- 房间页：插件面板插槽（slot）
- 投骰面板：规则引擎钩子

**后端扩展点**
- 中间件链：插件可注册前置/后置处理
- Socket事件：插件可监听/拦截事件
- 投骰计算：规则引擎可替换

---

## 需求2：多规则系统支持

### 问题
- 当前只支持COC7规则
- 投骰逻辑硬编码在多处
- 成功等级计算无法自定义

### 解决方案

**规则引擎抽象**
```typescript
// 规则接口定义
interface GameRule {
  id: string;
  name: string;
  version: string;
  
  // 投骰计算
  rollDice(count: number, sides: number): number[];
  
  // 成功等级判定
  calculateSuccess(target: number, roll: number): SuccessLevel;
  
  // 派生属性计算
  calculateDerived(attrs: Attributes): DerivedAttributes;
  
  // 技能列表
  getSkills(): Skill[];
  
  // 武器/护甲数据
  getWeapons(): Weapon[];
  getArmor(): Armor[];
}

// 规则注册器
class RuleRegistry {
  private rules = new Map<string, GameRule>();
  
  register(rule: GameRule): void;
  get(ruleId: string): GameRule;
  list(): GameRule[];
}
```

**数据库变更**
```prisma
// 房间支持选择规则
model Room {
  // ... existing fields
  ruleId      String   @default("coc7")
  ruleConfig  String   @default("{}")
}

// 投骰记录保存规则版本
model DiceRoll {
  // ... existing fields
  ruleId      String   @default("coc7")
}
```

**实现步骤**
1. 创建 `rules/coc7.ts` - 将现有逻辑迁移
2. 创建 `rules/dnd5e.ts` - DND5E规则实现
3. 修改所有硬编码的投骰/判定逻辑
4. 房间创建时选择规则类型

---

## 需求3：文件/资源管理扩展

### 问题
- 当前不支持图片/文件上传
- 角色头像、房间背景无法自定义
- 未来可能需要语音/视频记录

### 解决方案

**存储抽象层**
```typescript
interface StorageProvider {
  upload(file: Buffer, path: string): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

// 实现：本地文件系统
class LocalStorage implements StorageProvider {}

// 实现：阿里云OSS
class AliyunOSSStorage implements StorageProvider {}

// 实现：AWS S3
class S3Storage implements StorageProvider {}
```

**数据库变更**
```prisma
model Asset {
  id          String   @id @default(uuid())
  type        String   // 'image', 'audio', 'document'
  entityType  String   // 'character', 'room', 'user'
  entityId    String
  filename    String
  size        Int
  mimeType    String
  url         String
  storageType String   @default("local")  // local, oss, s3
  createdAt   DateTime @default(now())
  
  @@index([entityType, entityId])
}
```

**使用场景**
- 角色头像上传
- 房间背景图
- 跑团录音/录像
- 模组PDF附件

---

## 需求4：Webhook与外部集成

### 问题
- 无法与Discord/QQ机器人集成
- 无法推送跑团记录到外部系统
- 无法触发自动化工作流

### 解决方案

**Webhook系统**
```prisma
model Webhook {
  id        String   @id @default(uuid())
  userId    String
  name      String
  url       String
  secret    String   // 签名密钥
  events    String   // JSON array: ['dice.roll', 'combat.start', ...]
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

**事件系统**
```typescript
// 事件总线
class EventBus {
  emit(event: string, payload: any): void;
  on(event: string, handler: (payload: any) => void): void;
}

// 支持的事件类型
type GameEvent =
  | 'room.created'
  | 'room.joined'
  | 'room.left'
  | 'dice.rolled'
  | 'combat.started'
  | 'combat.ended'
  | 'message.sent'
  | 'character.created';
```

**集成示例**
- Discord机器人：通过Webhook接收骰子结果
- 飞书通知：跑团开始时推送
- 自动化：战斗结束自动生成报告

---

## 需求5：消息持久化与搜索优化

### 问题
- 目前消息只保存在内存/WebSocket
- 刷新页面后聊天记录丢失
- 无法搜索历史消息
- 无法导出完整跑团日志

### 解决方案

**消息表设计**
```prisma
model Message {
  id          String   @id @default(uuid())
  roomId      String
  userId      String
  characterId String?
  type        String   @default("text")  // text, dice, system, image
  content     String   // 消息内容
  metadata    String?  // JSON: 投骰结果、图片URL等
  replyTo     String?  // 回复的消息ID
  isDeleted   Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  @@index([roomId, createdAt])
  @@index([roomId, type])
}
```

**搜索功能**
- 全文搜索：消息内容、角色名
- 过滤器：时间范围、消息类型、用户
- 导出：Markdown/JSON/Excel

**分页与加载**
- 无限滚动加载历史消息
- 首次进入房间加载最近100条
- 支持跳转到指定时间

---

## 需求6：角色卡模板系统

### 问题
- 每个角色卡需要手动创建
- 无法快速创建预设职业角色
- 无法分享角色卡配置

### 解决方案

**模板系统**
```prisma
model CharacterTemplate {
  id          String   @id @default(uuid())
  userId      String?  // null = 系统模板
  name        String
  description String?
  ruleId      String   @default("coc7")
  
  // 模板数据
  baseAttributes String // JSON: { str: 50, dex: 50, ... }
  skills      String   // JSON: 预设技能值
  weapons     String   // JSON: 预设武器
  armor       String?  // JSON: 预设护甲
  
  isPublic    Boolean  @default(false)
  useCount    Int      @default(0)
  createdAt   DateTime @default(now())
}
```

**使用场景**
- 系统模板：私家侦探、医生、警察等预设职业
- 用户模板：KP创建的NPC快速复用
- 模板市场：玩家分享的优秀角色卡

---

## 实施优先级

| 优先级 | 需求 | 预估工时 | 影响范围 |
|--------|------|----------|----------|
| P0 | 消息持久化 | 8h | 房间系统、数据库 |
| P1 | 文件上传 | 6h | 角色卡、房间、存储 |
| P2 | 多规则支持 | 16h | 投骰系统、角色卡 |
| P2 | 角色卡模板 | 6h | 角色卡系统 |
| P3 | Webhook | 8h | 事件系统、外部集成 |
| P3 | 插件系统 | 24h | 全系统架构 |

---

## 技术债务预留

### 需要重构的现有代码

1. **投骰逻辑集中化**
   - 当前：`dice.routes.ts`, `socket.ts`, `combat.routes.ts` 都有投骰代码
   - 目标：统一到 `DiceService`，支持规则注入

2. **Socket事件规范化**
   - 当前：事件散落在各处，无统一文档
   - 目标：定义 `SocketEvents` 接口，类型安全

3. **配置外部化**
   - 当前：很多常量硬编码（如等级经验阈值）
   - 目标：移到数据库配置表，支持热更新

4. **错误处理统一**
   - 当前：部分地方用try/catch，部分用next(error)
   - 目标：统一错误边界，支持错误码国际化

---

## 扩展性检查清单

新增功能时需要确认：

- [ ] 数据库表是否考虑了多租户/多规则场景
- [ ] API接口是否遵循REST规范，支持分页/过滤
- [ ] Socket事件是否文档化，是否向后兼容
- [ ] 前端组件是否可复用，是否有合适的props接口
- [ ] 是否需要在管理后台添加配置入口
- [ ] 是否考虑了移动端适配
- [ ] 是否添加了适当的类型定义


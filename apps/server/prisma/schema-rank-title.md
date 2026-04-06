// 位阶配置表（管理员可配置）
model RankConfig {
  id          String   @id @default(uuid())
  level       Int      @unique  // 位阶等级 1-10
  name        String            // 位阶名称
  expRequired Int               // 升级所需经验
  description String            // 位阶描述
  privileges  String   @default("[]")  // JSON: 特权列表（预留）
  icon        String            // 图标emoji
  color       String            // 主题色
  isActive    Boolean  @default(true)   // 是否启用
  sortOrder   Int      @default(0)      // 排序
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([level])
  @@index([isActive])
}

// 印记配置表（管理员可配置）
model TitleConfig {
  id          String   @id @default(uuid())
  key         String   @unique  // 唯一标识（如：first_step）
  name        String            // 印记名称
  description String            // 描述
  category    String            // 分类：exploration/combat/social/madness/special/hidden
  rarity      String            // 稀有度：common/rare/epic/legendary/mythical
  condition   String            // 获取条件描述
  conditionCode String?         // 条件代码（用于自动检测）
  expReward   Int               // 奖励灵魂碎片
  icon        String            // 图标emoji
  color       String            // 主题色
  hint        String?           // 隐藏印记的提示
  isActive    Boolean  @default(true)   // 是否启用
  isHidden    Boolean  @default(false)  // 是否为隐藏印记
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
  @@index([rarity])
  @@index([isActive])
}

// 用户表修改
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  nickname        String
  password        String
  exp             Int      @default(0)
  displayedTitleKey String?  // 当前展示的印记key（null则展示位阶名称）
  isAdmin         Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  characters      Character[]
  roomMembers     RoomMember[]
  diceRolls       DiceRoll[]
  unlockedTitles  UserTitle[]  // 已解锁的印记

  @@index([exp])
}

// 用户已解锁的印记
model UserTitle {
  id          String   @id @default(uuid())
  userId      String
  titleKey    String   // 关联 TitleConfig.key
  unlockedAt  DateTime @default(now())
  unlockedBy  String   @default("system")  // system/manual/admin（解锁方式）
  grantedBy   String?  // 管理员ID（如果是手动授予）
  note        String?  // 备注

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, titleKey])
  @@index([userId])
  @@index([titleKey])
}

// 用户位阶变更历史（审计用）
model UserRankHistory {
  id          String   @id @default(uuid())
  userId      String
  oldLevel    Int
  newLevel    Int
  oldExp      Int
  newExp      Int
  reason      String   // 变更原因：play/admin_adjust/achievement
  changedBy   String?  // 管理员ID（如果是手动调整）
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}

// 印记解锁日志
model TitleUnlockLog {
  id          String   @id @default(uuid())
  userId      String
  titleKey    String
  expReward   Int
  unlockedBy  String   // system/admin
  grantedBy   String?  // 管理员ID
  note        String?
  createdAt   DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}
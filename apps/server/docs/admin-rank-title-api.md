/**
 * 管理员 - 位阶管理API
 * Base: /api/admin/ranks
 */

// 1. 获取位阶配置列表
GET /api/admin/ranks
Query: { page?: number, limit?: number, isActive?: boolean }
Response: {
  ranks: RankConfig[];
  total: number;
}

// 2. 创建位阶
POST /api/admin/ranks
Body: {
  level: number;        // 必须唯一
  name: string;
  expRequired: number;
  description: string;
  privileges?: string[]; // 可选，预留
  icon: string;
  color: string;
}
Response: { success: true; rank: RankConfig }

// 3. 更新位阶
PUT /api/admin/ranks/:id
Body: {
  name?: string;
  expRequired?: number;
  description?: string;
  privileges?: string[];
  icon?: string;
  color?: string;
  isActive?: boolean;
  sortOrder?: number;
}
Response: { success: true; rank: RankConfig }

// 4. 删除位阶（软删除/禁用）
DELETE /api/admin/ranks/:id
Response: { success: true }

// 5. 调整位阶顺序
PUT /api/admin/ranks/reorder
Body: { orders: { id: string; sortOrder: number }[] }
Response: { success: true }

/**
 * 管理员 - 印记管理API
 * Base: /api/admin/titles
 */

// 1. 获取印记配置列表
GET /api/admin/titles
Query: { 
  page?: number; 
  limit?: number; 
  category?: string; 
  rarity?: string;
  isActive?: boolean;
  search?: string;  // 搜索名称/描述
}
Response: {
  titles: TitleConfig[];
  total: number;
  stats: {
    total: number;
    byCategory: Record<string, number>;
    byRarity: Record<string, number>;
  }
}

// 2. 创建印记
POST /api/admin/titles
Body: {
  key: string;          // 唯一标识，如 "first_step"
  name: string;
  description: string;
  category: 'exploration' | 'combat' | 'social' | 'madness' | 'special' | 'hidden';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';
  condition: string;    // 获取条件描述
  conditionCode?: string; // 用于自动检测的代码标识
  expReward: number;
  icon: string;
  color: string;
  hint?: string;        // 隐藏印记的提示
  isHidden?: boolean;
}
Response: { success: true; title: TitleConfig }

// 3. 更新印记
PUT /api/admin/titles/:id
Body: {
  name?: string;
  description?: string;
  category?: string;
  rarity?: string;
  condition?: string;
  conditionCode?: string;
  expReward?: number;
  icon?: string;
  color?: string;
  hint?: string;
  isActive?: boolean;
  isHidden?: boolean;
}
Response: { success: true; title: TitleConfig }

// 4. 删除印记
DELETE /api/admin/titles/:id
Response: { success: true }

/**
 * 管理员 - 用户印记管理API
 * Base: /api/admin/users/:userId/titles
 */

// 1. 获取用户已解锁的印记
GET /api/admin/users/:userId/titles
Response: {
  user: { id; nickname; exp; currentRank: RankConfig };
  unlockedTitles: (UserTitle & { titleConfig: TitleConfig })[];
  displayedTitle: TitleConfig | null;
}

// 2. 授予印记
POST /api/admin/users/:userId/titles
Body: {
  titleKey: string;
  note?: string;  // 备注，如：补偿奖励、活动奖励
}
Response: { 
  success: true; 
  userTitle: UserTitle;
  expReward: number;
}

// 3. 撤销印记
DELETE /api/admin/users/:userId/titles/:titleKey
Body: { reason?: string }
Response: { success: true }

// 4. 修改用户展示的印记
PUT /api/admin/users/:userId/displayed-title
Body: { titleKey: string | null }  // null 表示展示位阶名称
Response: { success: true }

/**
 * 管理员 - 用户位阶/经验管理API
 */

// 1. 修改用户经验值
PUT /api/admin/users/:userId/exp
Body: {
  exp: number;      // 新经验值（不是增量，是设置值）
  reason: string;   // 修改原因
}
Response: { 
  success: true; 
  oldExp: number;
  newExp: number;
  oldRank: RankConfig;
  newRank: RankConfig;
  rankChanged: boolean;
}

// 2. 增加/减少用户经验值
POST /api/admin/users/:userId/exp/adjust
Body: {
  amount: number;   // 正数增加，负数减少
  reason: string;
}
Response: {
  success: true;
  oldExp: number;
  newExp: number;
  adjustment: number;
  rankChanged: boolean;
  newRank?: RankConfig;
}

// 3. 获取用户位阶变更历史
GET /api/admin/users/:userId/rank-history
Query: { page?: number; limit?: number }
Response: {
  history: UserRankHistory[];
  total: number;
}
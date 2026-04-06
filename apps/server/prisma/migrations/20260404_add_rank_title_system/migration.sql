-- Migration: Add Rank and Title System
-- Created: 2026-04-04

-- 1. Create RankConfig table
CREATE TABLE "RankConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "expRequired" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "privileges" TEXT NOT NULL DEFAULT '[]',
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Create unique index on level
CREATE UNIQUE INDEX "RankConfig_level_key" ON "RankConfig"("level");
CREATE INDEX "RankConfig_isActive_idx" ON "RankConfig"("isActive");

-- 2. Create TitleConfig table
CREATE TABLE "TitleConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "conditionCode" TEXT,
    "expReward" INTEGER NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "hint" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Create indexes
CREATE UNIQUE INDEX "TitleConfig_key_key" ON "TitleConfig"("key");
CREATE INDEX "TitleConfig_category_idx" ON "TitleConfig"("category");
CREATE INDEX "TitleConfig_rarity_idx" ON "TitleConfig"("rarity");
CREATE INDEX "TitleConfig_isActive_idx" ON "TitleConfig"("isActive");

-- 3. Create UserTitle table
CREATE TABLE "UserTitle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedBy" TEXT NOT NULL DEFAULT 'system',
    "grantedBy" TEXT,
    "note" TEXT,
    CONSTRAINT "UserTitle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "UserTitle_userId_titleKey_key" ON "UserTitle"("userId", "titleKey");
CREATE INDEX "UserTitle_userId_idx" ON "UserTitle"("userId");
CREATE INDEX "UserTitle_titleKey_idx" ON "UserTitle"("titleKey");

-- 4. Create UserRankHistory table
CREATE TABLE "UserRankHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "oldLevel" INTEGER NOT NULL,
    "newLevel" INTEGER NOT NULL,
    "oldExp" INTEGER NOT NULL,
    "newExp" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "changedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "UserRankHistory_userId_idx" ON "UserRankHistory"("userId");
CREATE INDEX "UserRankHistory_createdAt_idx" ON "UserRankHistory"("createdAt");

-- 5. Create TitleUnlockLog table
CREATE TABLE "TitleUnlockLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "titleKey" TEXT NOT NULL,
    "expReward" INTEGER NOT NULL,
    "unlockedBy" TEXT NOT NULL,
    "grantedBy" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "TitleUnlockLog_userId_idx" ON "TitleUnlockLog"("userId");
CREATE INDEX "TitleUnlockLog_createdAt_idx" ON "TitleUnlockLog"("createdAt");

-- 6. Add displayedTitleKey column to User
ALTER TABLE "User" ADD COLUMN "displayedTitleKey" TEXT;

-- 7. Add exp index to User
CREATE INDEX "User_exp_idx" ON "User"("exp");

-- 8. Migrate existing data: Convert old title to UserTitle
INSERT INTO "UserTitle" ("id", "userId", "titleKey", "unlockedAt", "unlockedBy", "note")
SELECT 
    lower(hex(randomblob(16))),
    "id",
    'legacy_title',
    datetime('now'),
    'system',
    '迁移自旧版称号系统'
FROM "User" 
WHERE "title" IS NOT NULL AND "title" != '见习调查员';

-- 9. Set displayedTitleKey for users who had a title
UPDATE "User" 
SET "displayedTitleKey" = 'legacy_title'
WHERE "title" IS NOT NULL AND "title" != '见习调查员';

-- 10. Insert default RankConfig data
INSERT INTO "RankConfig" ("id", "level", "name", "expRequired", "description", "privileges", "icon", "color", "isActive", "sortOrder", "updatedAt")
VALUES
    (lower(hex(randomblob(16))), 1, '海岸漫步者', 0, '你站在悬崖边缘，脚下的海水拍打着礁石，远处有什么在呼唤。', '[]', '🕯️', '#6b6558', true, 1, datetime('now')),
    (lower(hex(randomblob(16))), 2, '雾气识途人', 100, '浓雾中，你学会了辨认那些被遗忘的路标。', '[]', '🌫️', '#8b7355', true, 2, datetime('now')),
    (lower(hex(randomblob(16))), 3, '低语聆听者', 300, '风中的低语不再只是噪音，它们诉说着古老的故事。', '[]', '👁️', '#a69b85', true, 3, datetime('now')),
    (lower(hex(randomblob(16))), 4, '禁卷翻阅者', 600, '那些被封存的典籍向你敞开，知识是有重量的。', '[]', '📜', '#c9a227', true, 4, datetime('now')),
    (lower(hex(randomblob(16))), 5, '边界徘徊者', 1000, '你游走在理智与疯狂的边缘，两者都向你敞开大门。', '[]', '🕸️', '#d4c5a8', true, 5, datetime('now')),
    (lower(hex(randomblob(16))), 6, '深渊潜行者', 1500, '深海之下，你学会了在压力下呼吸。', '[]', '🐙', '#8b2635', true, 6, datetime('now')),
    (lower(hex(randomblob(16))), 7, '异界穿行客', 2200, '维度的壁垒对你而言不再绝对，你知道裂缝在哪里。', '[]', '🌊', '#a63848', true, 7, datetime('now')),
    (lower(hex(randomblob(16))), 8, '真理窥视者', 3000, '真相灼伤你的眼睛，但你已无法回头。', '[]', '🔮', '#6b4c7a', true, 8, datetime('now')),
    (lower(hex(randomblob(16))), 9, '群星归位使', 4000, '当星辰排列成正确的图案，你是那个举起火炬的人。', '[]', '✨', '#9b7aad', true, 9, datetime('now')),
    (lower(hex(randomblob(16))), 10, '深渊凝视者', 5500, '你凝视深渊如此之久，终于，深渊也凝视了你。', '[]', '👑', '#e8d4a0', true, 10, datetime('now'));

-- 11. Insert default TitleConfig data
INSERT INTO "TitleConfig" ("id", "key", "name", "description", "category", "rarity", "condition", "conditionCode", "expReward", "icon", "color", "hint", "isActive", "isHidden", "sortOrder", "updatedAt")
VALUES
    -- 探索类
    (lower(hex(randomblob(16))), 'first_step', '初次迈步', '完成你的第一次跑团', 'exploration', 'common', '完成1场跑团', 'first_game', 10, '👣', '#a69b85', null, true, false, 1, datetime('now')),
    (lower(hex(randomblob(16))), 'veteran_explorer', '资深探索者', '参与了10场不同的冒险', 'exploration', 'rare', '完成10场跑团', 'games_10', 30, '🧭', '#c9a227', null, true, false, 2, datetime('now')),
    (lower(hex(randomblob(16))), 'legend_seeker', '传说追寻者', '完成了50场跑团，见证了无数故事', 'exploration', 'epic', '完成50场跑团', 'games_50', 100, '📚', '#8b2635', null, true, false, 3, datetime('now')),
    (lower(hex(randomblob(16))), 'dimension_walker', '次元行者', '穿越了无数个世界线', 'exploration', 'legendary', '完成100场跑团', 'games_100', 200, '🌌', '#6b4c7a', null, true, false, 4, datetime('now')),
    (lower(hex(randomblob(16))), 'clue_hunter', '线索猎手', '善于发现隐藏的真相', 'exploration', 'rare', '累计标记50条线索', 'clue_50', 25, '🔍', '#c9a227', null, true, false, 5, datetime('now')),
    
    -- 战斗类
    (lower(hex(randomblob(16))), 'lucky_shot', '幸运一击', '投出一次大成功', 'combat', 'common', '投出01-05', 'critical_success', 10, '🎯', '#a69b85', null, true, false, 6, datetime('now')),
    (lower(hex(randomblob(16))), 'crisis_avoider', '危机规避者', '在关键时刻投出成功，化险为夷', 'combat', 'rare', '在HP≤3时成功通过检定', 'manual', 20, '🎲', '#c9a227', null, true, false, 7, datetime('now')),
    (lower(hex(randomblob(16))), 'monster_slayer', '怪物猎手', '在战斗中击败过神话生物', 'combat', 'epic', '参与击败神话生物', 'manual', 50, '⚔️', '#8b2635', null, true, false, 8, datetime('now')),
    (lower(hex(randomblob(16))), 'last_stand', '最后坚守', '濒死状态下完成关键行动', 'combat', 'epic', 'HP=1时完成关键检定', 'manual', 40, '🛡️', '#8b2635', null, true, false, 9, datetime('now')),
    (lower(hex(randomblob(16))), 'unstoppable', '势不可挡', '连续投出5次成功', 'combat', 'legendary', '连续5次检定成功', 'manual', 80, '🔥', '#6b4c7a', null, true, false, 10, datetime('now')),
    
    -- 社交类
    (lower(hex(randomblob(16))), 'storyteller', '说书人', '善于讲述引人入胜的故事', 'social', 'rare', '单场游戏发送100条消息', 'manual', 20, '📖', '#c9a227', null, true, false, 11, datetime('now')),
    (lower(hex(randomblob(16))), 'party_leader', '队伍领袖', '作为KP成功主持10场游戏', 'social', 'epic', '作为KP完成10场跑团', 'kp_10', 60, '👑', '#8b2635', null, true, false, 12, datetime('now')),
    (lower(hex(randomblob(16))), 'social_butterfly', '社交蝴蝶', '与50位不同的玩家一起游戏', 'social', 'rare', '与50位不同玩家同场', 'manual', 30, '🦋', '#c9a227', null, true, false, 13, datetime('now')),
    (lower(hex(randomblob(16))), 'mentor', '引导者', '帮助5位新手完成首次跑团', 'social', 'epic', '带领5位新手完成游戏', 'manual', 50, '🕯️', '#8b2635', null, true, false, 14, datetime('now')),
    (lower(hex(randomblob(16))), 'legend_kp', '传说守秘人', '创造了令人难忘的故事', 'social', 'legendary', '作为KP完成50场跑团', 'kp_50', 150, '📜', '#6b4c7a', null, true, false, 15, datetime('now')),
    
    -- 疯狂类
    (lower(hex(randomblob(16))), 'first_madness', '初尝疯狂', '经历了第一次理智丧失', 'madness', 'common', '单场失去5点以上SAN', 'san_loss_5', 5, '🌀', '#6b4c7a', null, true, false, 16, datetime('now')),
    (lower(hex(randomblob(16))), 'mad_whisperer', '疯狂低语者', 'SAN值低于30仍坚持调查', 'madness', 'rare', 'SAN<30时完成整场游戏', 'manual', 30, '👁️', '#6b4c7a', null, true, false, 17, datetime('now')),
    (lower(hex(randomblob(16))), 'insanity_edge', '疯狂边缘', 'SAN值降至10以下并存活', 'madness', 'epic', 'SAN≤10时存活通关', 'manual', 60, '🎭', '#6b4c7a', null, true, false, 18, datetime('now')),
    (lower(hex(randomblob(16))), 'beyond_sanity', '超越理智', '完全理解了宇宙的真相', 'madness', 'legendary', '累计失去99点SAN', 'san_loss_99', 150, '🌑', '#6b4c7a', null, true, false, 19, datetime('now')),
    (lower(hex(randomblob(16))), 'cultist', '秘教信徒', '你开始相信那些古老的传说', 'madness', 'rare', '累计失去30点SAN', 'san_loss_30', 25, '⛧', '#6b4c7a', null, true, false, 20, datetime('now')),
    
    -- 特殊类
    (lower(hex(randomblob(16))), 'founder', '先驱者', '沉没之城的早期居民', 'special', 'legendary', '在v1.0版本前注册', 'manual', 100, '🏛️', '#e8d4a0', null, true, false, 21, datetime('now')),
    (lower(hex(randomblob(16))), 'bug_hunter', '漏洞猎人', '帮助发现了平台的严重问题', 'special', 'epic', '报告并确认重大Bug', 'manual', 50, '🐛', '#8b2635', null, true, false, 22, datetime('now')),
    (lower(hex(randomblob(16))), 'content_creator', '内容创作者', '为社区贡献了优质内容', 'special', 'rare', '发布被推荐的战报/模组', 'manual', 40, '✍️', '#c9a227', null, true, false, 23, datetime('now')),
    (lower(hex(randomblob(16))), 'roleplay_master', '角色扮演大师', '完美的角色扮演表现', 'special', 'epic', '获得其他玩家一致好评', 'manual', 50, '🎭', '#8b2635', null, true, false, 24, datetime('now')),
    (lower(hex(randomblob(16))), 'immortal', '不朽者', '从未在任何一场游戏中死亡或疯狂', 'special', 'legendary', '连续20场存活', 'survive_20', 200, '💀', '#6b4c7a', null, true, false, 25, datetime('now')),
    
    -- 隐藏类
    (lower(hex(randomblob(16))), 'deep_one', '深潜者', '来自深海的呼唤...', 'hidden', 'mythical', '???', 'manual', 500, '🐙', '#e8d4a0', '在特定时间登录...', true, true, 26, datetime('now')),
    (lower(hex(randomblob(16))), 'time_traveler', '时间旅行者', '你似乎知道一些不该知道的事', 'hidden', 'mythical', '???', 'manual', 500, '⏳', '#e8d4a0', '尝试某种特定的操作序列...', true, true, 27, datetime('now')),
    (lower(hex(randomblob(16))), 'chosen_one', '被选中者', '命运选择了你', 'hidden', 'mythical', '???', 'manual', 999, '⭐', '#e8d4a0', '完成所有其他印记的收集...', true, true, 28, datetime('now'));

-- 12. Drop old columns (after data migration)
-- Note: These will fail if there are foreign key constraints, handle accordingly
ALTER TABLE "User" DROP COLUMN "level";
ALTER TABLE "User" DROP COLUMN "title";

-- 13. Drop RoomStats table if exists (optional cleanup)
-- DROP TABLE IF EXISTS "RoomStats";

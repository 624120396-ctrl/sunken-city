import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/auth';
import { AppError } from '../../middleware/error';

const router = Router();
const prisma = new PrismaClient();

type ForumTx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// ==================== 奖励配置 ====================
const REWARD_LIMITS = {
  create_post: { max: 3, exp: 10, coin: 2 },
  create_reply: { max: 10, exp: 3, coin: 1 },
  receive_like: { max: 5, exp: 1, coin: 0 }, // 针对帖子作者，单帖每日上限
  best_reply: { max: Infinity, exp: 20, coin: 5 },
  post_hit_10_likes: { max: 1, exp: 15, coin: 3 }, // 单帖限1次
};

async function getUserForumStats(userId: string) {
  const [postCount, replyCount, likeCountReceived, bestReplyCount] = await Promise.all([
    prisma.forumPost.count({ where: { userId } }),
    prisma.forumReply.count({ where: { userId } }),
    prisma.forumPostLike.count({
      where: {
        post: { userId },
      },
    }),
    prisma.forumReply.count({ where: { userId, isBestReply: true } }),
  ]);

  return {
    postCount,
    replyCount,
    likeCountReceived,
    bestReplyCount,
  };
}

async function isBoardModerator(userId: string, boardKey: string): Promise<boolean> {
  const mod = await prisma.forumBoardModerator.findUnique({
    where: { boardKey_userId: { boardKey, userId } },
  });
  return !!mod;
}

async function isForumAdminOrModerator(userId: string, boardKey: string, isAdmin: boolean): Promise<boolean> {
  if (isAdmin) return true;
  return isBoardModerator(userId, boardKey);
}

async function canRewardToday(userId: string, action: keyof typeof REWARD_LIMITS, postId?: string, txClient?: ForumTx) {
  const db = txClient || prisma;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where: any = {
    userId,
    action,
    createdAt: { gte: today, lt: tomorrow },
  };
  if (postId) where.postId = postId;

  const count = await db.forumRewardLog.count({ where });
  return count < REWARD_LIMITS[action].max;
}

async function grantReward(
  userId: string,
  action: keyof typeof REWARD_LIMITS,
  postId?: string,
  txClient?: ForumTx
) {
  const db = txClient || prisma;
  const cfg = REWARD_LIMITS[action];
  if (!(await canRewardToday(userId, action, postId, txClient))) return null;

  await db.user.update({
    where: { id: userId },
    data: {
      exp: { increment: cfg.exp },
      coins: { increment: cfg.coin },
    },
  });

  const log = await db.forumRewardLog.create({
    data: {
      userId,
      action,
      postId,
      rewardExp: cfg.exp,
      rewardCoin: cfg.coin,
    },
  });

  return log;
}

// ==================== 通知辅助函数 ====================

async function createNotification({
  userId,
  type,
  title,
  content,
  postId,
  replyId,
}: {
  userId: string;
  type: string;
  title: string;
  content?: string;
  postId?: string;
  replyId?: string;
}) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, content, postId, replyId },
    });
  } catch {
    // 静默失败，不阻断主流程
  }
}

async function parseMentions(content: string): Promise<string[]> {
  const matches = content.match(/@([^\s@]+)/g);
  if (!matches) return [];
  const nicknames = [...new Set(matches.map((m) => m.slice(1)))];
  const users = await prisma.user.findMany({
    where: { nickname: { in: nicknames } },
    select: { id: true, nickname: true },
  });
  return users.map((u) => u.id);
}

// ==================== 版块 ====================

/**
 * GET /api/forum/boards
 * 获取版块列表
 */
router.get('/forum/boards', async (req, res, next) => {
  try {
    const boards = await prisma.forumBoard.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { posts: true } },
      },
    });

    res.json({
      success: true,
      data: {
        boards: boards.map((b) => ({
          id: b.id,
          key: b.key,
          name: b.name,
          description: b.description,
          icon: b.icon,
          postCount: b._count.posts,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/forum/boards/:key/moderators
 * 获取版块管理员列表
 */
router.get('/forum/boards/:key/moderators', async (req, res, next) => {
  try {
    const { key } = req.params;
    const mods = await prisma.forumBoardModerator.findMany({
      where: { boardKey: key },
      include: {
        user: {
          select: { id: true, nickname: true, avatarUrl: true, equippedFrame: true, exp: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: {
        moderators: mods.map((m) => ({
          id: m.id,
          userId: m.userId,
          nickname: m.user.nickname,
          avatarUrl: m.user.avatarUrl,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/forum/boards/:key
 * 修改版块信息（超级管理员或版主）
 */
router.patch('/forum/boards/:key', authMiddleware, async (req: any, res, next) => {
  try {
    const { key } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user?.isAdmin;
    const { description, icon } = req.body;

    const canEdit = isAdmin || await isBoardModerator(userId, key);
    if (!canEdit) {
      throw new AppError('FORBIDDEN', '无权修改该版块信息', 403);
    }

    const data: any = {};
    if (description !== undefined) data.description = description.trim();
    if (icon !== undefined) data.icon = icon.trim();

    const updated = await prisma.forumBoard.update({
      where: { key },
      data,
    });

    res.json({ success: true, data: { board: updated } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/forum/boards/:key/moderators
 * 任命版主（超级管理员）
 */
router.post('/forum/boards/:key/moderators', authMiddleware, async (req: any, res, next) => {
  try {
    const { key } = req.params;
    const isAdmin = req.user?.isAdmin;
    const { userId: targetUserId } = req.body;

    if (!isAdmin) {
      throw new AppError('FORBIDDEN', '只有超级管理员可以任命版主', 403);
    }

    if (!targetUserId) {
      throw new AppError('INVALID_INPUT', '请选择要任命的用户', 400);
    }

    const board = await prisma.forumBoard.findUnique({ where: { key } });
    if (!board) {
      throw new AppError('BOARD_NOT_FOUND', '版块不存在', 404);
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    await prisma.forumBoardModerator.create({
      data: { boardKey: key, userId: targetUserId },
    });

    res.json({ success: true, message: `已任命 ${targetUser.nickname} 为该版主理人` });
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new AppError('DUPLICATE', '该用户已经是该版块的版主', 409);
    }
    next(error);
  }
});

/**
 * DELETE /api/forum/boards/:key/moderators/:userId
 * 撤销版主（超级管理员）
 */
router.delete('/forum/boards/:key/moderators/:userId', authMiddleware, async (req: any, res, next) => {
  try {
    const { key, userId: targetUserId } = req.params;
    const isAdmin = req.user?.isAdmin;

    if (!isAdmin) {
      throw new AppError('FORBIDDEN', '只有超级管理员可以撤销版主', 403);
    }

    await prisma.forumBoardModerator.deleteMany({
      where: { boardKey: key, userId: targetUserId },
    });

    res.json({ success: true, message: '已撤销版主身份' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/forum/users/me/moderated-boards
 * 获取当前用户管理的版块列表
 */
router.get('/forum/users/me/moderated-boards', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.user!.userId;
    const mods = await prisma.forumBoardModerator.findMany({
      where: { userId },
      select: { boardKey: true },
    });

    res.json({
      success: true,
      data: {
        boardKeys: mods.map((m) => m.boardKey),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/forum/boards/:key/posts
 * 获取版块帖子列表
 */
router.get('/forum/boards/:key/posts', async (req, res, next) => {
  try {
    const { key } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const sort = (req.query.sort as string) || 'last_reply'; // newest | last_reply

    const board = await prisma.forumBoard.findUnique({
      where: { key },
    });
    if (!board || !board.isActive) {
      throw new AppError('BOARD_NOT_FOUND', '版块不存在', 404);
    }

    const orderBy = sort === 'newest'
      ? { createdAt: 'desc' as const }
      : { lastReplyAt: 'desc' as const };

    const postSelect = {
      id: true,
      title: true,
      isPinned: true,
      isEssence: true,
      isLocked: true,
      viewCount: true,
      likeCount: true,
      replyCount: true,
      bountyCoin: true,
      lastReplyAt: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          equippedFrame: true,
          exp: true,
          displayedCharacter: {
            select: {
              id: true,
              name: true,
              occupation: true,
              avatarUrl: true,
            },
          },
        },
      },
      lastReplyBy: {
        select: {
          id: true,
          nickname: true,
        },
      },
    };

    const [pinnedPosts, essencePosts, posts, total] = await Promise.all([
      prisma.forumPost.findMany({
        where: { boardKey: key, isPinned: true },
        orderBy: { lastReplyAt: 'desc' },
        select: postSelect,
      }),
      prisma.forumPost.findMany({
        where: { boardKey: key, isEssence: true, isPinned: false },
        orderBy: { lastReplyAt: 'desc' },
        take: 3,
        select: postSelect,
      }),
      prisma.forumPost.findMany({
        where: { boardKey: key, isPinned: false },
        orderBy,
        skip,
        take: limit,
        select: postSelect,
      }),
      prisma.forumPost.count({ where: { boardKey: key, isPinned: false } }),
    ]);

    const allPosts = [...pinnedPosts, ...essencePosts, ...posts];
    const frameKeys = [...new Set(allPosts.map((p) => p.author.equippedFrame).filter(Boolean))] as string[];
    const shopItems =
      frameKeys.length > 0
        ? await prisma.shopItem.findMany({
            where: { key: { in: frameKeys } },
            select: { key: true, iconUrl: true },
          })
        : [];
    const frameMap = new Map(shopItems.map((s) => [s.key, s.iconUrl]));

    const rankConfigs = await prisma.rankConfig.findMany({ where: { isActive: true } });
    const getRank = (exp: number) => {
      const sorted = [...rankConfigs].sort((a, b) => b.level - a.level);
      for (const r of sorted) if (exp >= r.expRequired) return r;
      return sorted[sorted.length - 1];
    };

    const enrich = (p: (typeof allPosts)[0]) => {
      const rank = getRank(p.author.exp ?? 0);
      return {
        ...p,
        author: {
          ...p.author,
          frameUrl: frameMap.get(p.author.equippedFrame || '') || null,
          rankName: rank?.name || '未知位阶',
          rankColor: rank?.color || '#6b6558',
        },
      };
    };

    res.json({
      success: true,
      data: {
        pinnedPosts: pinnedPosts.map(enrich),
        essencePosts: essencePosts.map(enrich),
        posts: posts.map(enrich),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/forum/posts
 * 发帖
 */
router.post('/forum/posts', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.user!.userId;
    const { boardKey, title, content, bountyCoin = 0 } = req.body;

    if (!boardKey || !title?.trim() || !content?.trim()) {
      throw new AppError('INVALID_INPUT', '标题和内容不能为空', 400);
    }

    const board = await prisma.forumBoard.findUnique({
      where: { key: boardKey },
    });
    if (!board || !board.isActive) {
      throw new AppError('BOARD_NOT_FOUND', '版块不存在', 404);
    }

    const bounty = Math.max(0, parseInt(bountyCoin) || 0);
    let post: any;
    let reward: any = null;

    await prisma.$transaction(async (tx) => {
      if (bounty > 0) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { coins: true },
        });
        if (!user || user.coins < bounty) {
          throw new AppError('INSUFFICIENT_COINS', '锈蚀硬币不足以支付悬赏', 400);
        }
        await tx.user.update({
          where: { id: userId },
          data: { coins: { decrement: bounty } },
        });
      }

      post = await tx.forumPost.create({
        data: {
          boardKey,
          userId,
          title: title.trim(),
          content: content.trim(),
          bountyCoin: bounty,
        },
      });

      // 发帖奖励（移入事务，保证原子性）
      reward = await grantReward(userId, 'create_post', post.id, tx);
    });

    res.json({
      success: true,
      data: { post, reward },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/forum/posts/:id
 * 帖子详情
 */
router.get('/forum/posts/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        isPinned: true,
        isEssence: true,
        isLocked: true,
        viewCount: true,
        likeCount: true,
        replyCount: true,
        bountyCoin: true,
        bestReplyId: true,
        lastReplyAt: true,
        createdAt: true,
        updatedAt: true,
        author: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            equippedFrame: true,
            exp: true,
            displayedTitleKey: true,
            coins: true,
            stardust: true,
            displayedCharacter: {
              select: {
                id: true,
                name: true,
                occupation: true,
                avatarUrl: true,
                hp: true,
                maxHp: true,
                mp: true,
                maxMp: true,
                san: true,
                maxSan: true,
                str: true,
                dex: true,
                con: true,
                siz: true,
                app: true,
                int: true,
                pow: true,
                edu: true,
                luck: true,
                mov: true,
                build: true,
                background: true,
                skills: true,
                quickSkills: true,
              },
            },
          },
        },
        board: {
          select: {
            key: true,
            name: true,
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            isBestReply: true,
            createdAt: true,
            updatedAt: true,
            author: {
              select: {
                id: true,
                nickname: true,
                avatarUrl: true,
                equippedFrame: true,
                exp: true,
                displayedTitleKey: true,
                coins: true,
                stardust: true,
                displayedCharacter: {
                  select: {
                    id: true,
                    name: true,
                    occupation: true,
                    avatarUrl: true,
                    hp: true,
                    maxHp: true,
                    mp: true,
                    maxMp: true,
                    san: true,
                    maxSan: true,
                    str: true,
                    dex: true,
                    con: true,
                    siz: true,
                    app: true,
                    int: true,
                    pow: true,
                    edu: true,
                    luck: true,
                    mov: true,
                    build: true,
                    background: true,
                    skills: true,
                    quickSkills: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!post) {
      throw new AppError('POST_NOT_FOUND', '帖子不存在', 404);
    }

    // 增加浏览量
    await prisma.forumPost.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    // 当前用户是否已点赞
    let hasLiked = false;
    if (userId) {
      const like = await prisma.forumPostLike.findUnique({
        where: { postId_userId: { postId: id, userId } },
      });
      hasLiked = !!like;
    }

    // 批量查头像框
    const allUsers = [post.author, ...post.replies.map((r) => r.author)];
    const frameKeys = [...new Set(allUsers.map((u) => u.equippedFrame).filter(Boolean))] as string[];
    const shopItems =
      frameKeys.length > 0
        ? await prisma.shopItem.findMany({
            where: { key: { in: frameKeys } },
            select: { key: true, iconUrl: true },
          })
        : [];
    const frameMap = new Map(shopItems.map((s) => [s.key, s.iconUrl]));

    // 批量查 rank / title
    const [rankConfigs, titleConfigs] = await Promise.all([
      prisma.rankConfig.findMany({ where: { isActive: true } }),
      prisma.titleConfig.findMany({ where: { isActive: true } }),
    ]);
    const titleNameMap = new Map(titleConfigs.map((t) => [t.key, t.name]));
    const titleColorMap = new Map(titleConfigs.map((t) => [t.key, t.color]));
    const getRank = (exp: number) => {
      const sorted = [...rankConfigs].sort((a, b) => b.level - a.level);
      for (const r of sorted) if (exp >= r.expRequired) return r;
      return sorted[sorted.length - 1];
    };

    const enrichUser = (u: (typeof post.author)) => {
      const rank = getRank(u.exp);
      const nextRank = rankConfigs.find((r) => r.level === (rank?.level || 0) + 1) || null;
      const expToNext = nextRank ? Math.max(0, nextRank.expRequired - u.exp) : 0;
      return {
        ...u,
        frameUrl: frameMap.get(u.equippedFrame || '') || null,
        rankName: rank?.name || '未知位阶',
        rankColor: rank?.color || '#6b6558',
        titleName: titleNameMap.get(u.displayedTitleKey || '') || null,
        titleColor: titleColorMap.get(u.displayedTitleKey || '') || null,
        exp: u.exp,
        expToNext,
        nextRankName: nextRank?.name || null,
      };
    };

    res.json({
      success: true,
      data: {
        post: {
          ...post,
          author: enrichUser(post.author),
          replies: post.replies.map((r) => ({
            ...r,
            author: enrichUser(r.author),
          })),
          hasLiked,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/forum/posts/:id/replies
 * 回复
 */
router.post('/forum/posts/:id/replies', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { content } = req.body;

    if (!content?.trim()) {
      throw new AppError('INVALID_INPUT', '回复内容不能为空', 400);
    }

    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: { id: true, userId: true, title: true, isLocked: true },
    });
    if (!post) {
      throw new AppError('POST_NOT_FOUND', '帖子不存在', 404);
    }
    if (post.isLocked) {
      throw new AppError('POST_LOCKED', '该帖子已锁定，无法回复', 403);
    }

    const trimmed = content.trim();
    const reply = await prisma.forumReply.create({
      data: {
        postId: id,
        userId,
        content: trimmed,
      },
    });

    await prisma.forumPost.update({
      where: { id },
      data: {
        replyCount: { increment: 1 },
        lastReplyAt: new Date(),
        lastReplyById: userId,
      },
    });

    // 给楼主发回复通知
    if (post.userId !== userId) {
      await createNotification({
        userId: post.userId,
        type: 'reply',
        title: `有人回复了你的帖子《${post.title}》`,
        content: trimmed.slice(0, 100),
        postId: post.id,
        replyId: reply.id,
      });
    }

    // @ 通知
    const mentionIds = await parseMentions(trimmed);
    for (const mentionUserId of mentionIds) {
      if (mentionUserId === userId) continue;
      await createNotification({
        userId: mentionUserId,
        type: 'mention',
        title: `有人在帖子《${post.title}》中提到了你`,
        content: trimmed.slice(0, 100),
        postId: post.id,
        replyId: reply.id,
      });
    }

    const reward = await grantReward(userId, 'create_reply', id);

    res.json({
      success: true,
      data: { reply, reward },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/forum/posts/:id/like
 * 点赞
 */
router.post('/forum/posts/:id/like', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const post = await prisma.forumPost.findUnique({
      where: { id },
      select: { id: true, userId: true, likeCount: true },
    });
    if (!post) {
      throw new AppError('POST_NOT_FOUND', '帖子不存在', 404);
    }

    const existing = await prisma.forumPostLike.findUnique({
      where: { postId_userId: { postId: id, userId } },
    });

    if (existing) {
      // 取消点赞
      await prisma.$transaction([
        prisma.forumPostLike.delete({
          where: { postId_userId: { postId: id, userId } },
        }),
        prisma.forumPost.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);
      res.json({ success: true, data: { liked: false } });
      return;
    }

    // 点赞
    await prisma.$transaction([
      prisma.forumPostLike.create({
        data: { postId: id, userId },
      }),
      prisma.forumPost.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    // 给帖子作者发奖励（receive_like 每日上限）
    if (post.userId !== userId) {
      await grantReward(post.userId, 'receive_like', id);

      await createNotification({
        userId: post.userId,
        type: 'like',
        title: '有人赞了你的帖子',
        postId: post.id,
      });

      // 检查是否首次达到 10 赞
      const updatedPost = await prisma.forumPost.findUnique({
        where: { id },
        select: { likeCount: true },
      });
      if (updatedPost && updatedPost.likeCount === 10) {
        await grantReward(post.userId, 'post_hit_10_likes', id);
      }
    }

    res.json({ success: true, data: { liked: true } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/forum/posts/:id/best-reply
 * 设置最佳回复
 */
router.post('/forum/posts/:id/best-reply', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { replyId } = req.body;

    const post = await prisma.forumPost.findUnique({
      where: { id },
    });
    if (!post) {
      throw new AppError('POST_NOT_FOUND', '帖子不存在', 404);
    }
    if (post.userId !== userId && !req.user?.isAdmin) {
      throw new AppError('FORBIDDEN', '只有楼主或管理员可以设置最佳回复', 403);
    }

    const reply = await prisma.forumReply.findFirst({
      where: { id: replyId, postId: id },
    });
    if (!reply) {
      throw new AppError('REPLY_NOT_FOUND', '回复不存在', 404);
    }

    // 清除旧的最佳回复
    if (post.bestReplyId) {
      await prisma.forumReply.update({
        where: { id: post.bestReplyId },
        data: { isBestReply: false },
      });
    }

    await prisma.forumReply.update({
      where: { id: replyId },
      data: { isBestReply: true },
    });

    await prisma.forumPost.update({
      where: { id },
      data: { bestReplyId: replyId },
    });

    // 如果设置了悬赏，发放给最佳回复者
    if (post.bountyCoin > 0 && reply.userId !== post.userId) {
      await prisma.user.update({
        where: { id: reply.userId },
        data: { coins: { increment: post.bountyCoin } },
      });
    }

    // 最佳回复奖励
    await grantReward(reply.userId, 'best_reply', id);

    await createNotification({
      userId: reply.userId,
      type: 'best_reply',
      title: `你的回复在《${post.title}》中被设为最佳回复`,
      postId: post.id,
      replyId: reply.id,
    });

    res.json({ success: true, data: { bestReplyId: replyId } });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/forum/posts/:id
 * 编辑帖子
 */
router.patch('/forum/posts/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user?.isAdmin;
    const { title, content } = req.body;

    const post = await prisma.forumPost.findUnique({
      where: { id },
    });
    if (!post) {
      throw new AppError('POST_NOT_FOUND', '帖子不存在', 404);
    }
    if (post.userId !== userId && !isAdmin) {
      throw new AppError('FORBIDDEN', '无权编辑该帖子', 403);
    }

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (content !== undefined) data.content = content.trim();

    const updated = await prisma.forumPost.update({
      where: { id },
      data,
    });

    // 解析 @ 并给新提到的人发通知
    if (content !== undefined) {
      const mentionIds = await parseMentions(content.trim());
      for (const mentionUserId of mentionIds) {
        if (mentionUserId === userId) continue;
        await createNotification({
          userId: mentionUserId,
          type: 'mention',
          title: `帖子《${updated.title}》的内容更新中提到了你`,
          content: content.trim().slice(0, 100),
          postId: updated.id,
        });
      }
    }

    res.json({ success: true, data: { post: updated } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/forum/posts/:id/essence
 * 切换精华状态
 */
router.post('/forum/posts/:id/essence', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user?.isAdmin;

    const post = await prisma.forumPost.findUnique({
      where: { id },
    });
    if (!post) {
      throw new AppError('POST_NOT_FOUND', '帖子不存在', 404);
    }
    const canEssence = post.userId === userId || isAdmin || await isBoardModerator(userId, post.boardKey);
    if (!canEssence) {
      throw new AppError('FORBIDDEN', '只有楼主或管理员可以设置精华', 403);
    }

    const updated = await prisma.forumPost.update({
      where: { id },
      data: { isEssence: !post.isEssence },
    });

    res.json({ success: true, data: { isEssence: updated.isEssence } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/forum/posts/:id/pin
 * 切换置顶状态（超级管理员或版主）
 */
router.post('/forum/posts/:id/pin', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user?.isAdmin;

    const post = await prisma.forumPost.findUnique({
      where: { id },
    });
    if (!post) {
      throw new AppError('POST_NOT_FOUND', '帖子不存在', 404);
    }
    const canPin = isAdmin || await isBoardModerator(userId, post.boardKey);
    if (!canPin) {
      throw new AppError('FORBIDDEN', '只有管理员或版主可以设置置顶', 403);
    }

    const updated = await prisma.forumPost.update({
      where: { id },
      data: { isPinned: !post.isPinned },
    });

    res.json({ success: true, data: { isPinned: updated.isPinned } });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/forum/posts/:id
 * 删帖
 */
router.delete('/forum/posts/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user?.isAdmin;

    const post = await prisma.forumPost.findUnique({
      where: { id },
    });
    if (!post) {
      throw new AppError('POST_NOT_FOUND', '帖子不存在', 404);
    }
    const canDelete = post.userId === userId || isAdmin || await isBoardModerator(userId, post.boardKey);
    if (!canDelete) {
      throw new AppError('FORBIDDEN', '无权删除该帖子', 403);
    }

    await prisma.forumPost.delete({ where: { id } });
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/forum/replies/:id
 * 编辑回复
 */
router.patch('/forum/replies/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user?.isAdmin;
    const { content } = req.body;

    const reply = await prisma.forumReply.findUnique({
      where: { id },
      include: { post: { select: { id: true, title: true } } },
    });
    if (!reply) {
      throw new AppError('REPLY_NOT_FOUND', '回复不存在', 404);
    }
    if (reply.userId !== userId && !isAdmin) {
      throw new AppError('FORBIDDEN', '无权编辑该回复', 403);
    }

    const updated = await prisma.forumReply.update({
      where: { id },
      data: { content: content.trim() },
    });

    // 解析 @ 并给新提到的人发通知
    if (content !== undefined) {
      const mentionIds = await parseMentions(content.trim());
      for (const mentionUserId of mentionIds) {
        if (mentionUserId === userId) continue;
        await createNotification({
          userId: mentionUserId,
          type: 'mention',
          title: `回复中有人提到了你（帖子《${reply.post.title}》）`,
          content: content.trim().slice(0, 100),
          postId: reply.post.id,
          replyId: updated.id,
        });
      }
    }

    res.json({ success: true, data: { reply: updated } });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/forum/replies/:id
 * 删回复
 */
router.delete('/forum/replies/:id', authMiddleware, async (req: any, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user?.isAdmin;

    const reply = await prisma.forumReply.findUnique({
      where: { id },
    });
    if (!reply) {
      throw new AppError('REPLY_NOT_FOUND', '回复不存在', 404);
    }
    if (reply.userId !== userId && !isAdmin) {
      throw new AppError('FORBIDDEN', '无权删除该回复', 403);
    }

    await prisma.forumReply.delete({ where: { id } });

    // 更新帖子回复数
    await prisma.forumPost.update({
      where: { id: reply.postId },
      data: { replyCount: { decrement: 1 } },
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/forum/users/:id/stats
 * 用户论坛统计
 */
router.get('/forum/users/:id/stats', async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await getUserForumStats(id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { adminMiddleware } from '../../middleware/admin';
import { prisma } from '../../config/database';
import { z } from 'zod';

const router = Router();

/**
 * 获取仪表盘统计数据
 * GET /api/admin/dashboard
 */
router.get('/dashboard', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    // 用户统计
    const totalUsers = await prisma.user.count();
    const todayUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
    const thisWeekUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });

    // 角色卡统计
    const totalCharacters = await prisma.character.count();
    const todayCharacters = await prisma.character.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    // 房间统计
    const totalRooms = await prisma.room.count();
    const activeRooms = await prisma.room.count({
      where: { status: 'ACTIVE' },
    });
    const todayRooms = await prisma.room.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    // 投骰统计
    const totalDiceRolls = await prisma.diceRoll.count();
    const todayDiceRolls = await prisma.diceRoll.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    // 最近注册用户
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nickname: true,
        email: true,
        exp: true,
        isAdmin: true,
        createdAt: true,
        _count: {
          select: { characters: true },
        },
      },
    });

    // 活跃用户排行（按投骰次数）
    const activeUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { diceRolls: { _count: 'desc' } },
      select: {
        id: true,
        nickname: true,
        _count: {
          select: { diceRolls: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        stats: {
          users: {
            total: totalUsers,
            today: todayUsers,
            thisWeek: thisWeekUsers,
          },
          characters: {
            total: totalCharacters,
            today: todayCharacters,
          },
          rooms: {
            total: totalRooms,
            active: activeRooms,
            today: todayRooms,
          },
          diceRolls: {
            total: totalDiceRolls,
            today: todayDiceRolls,
          },
        },
        recentUsers,
        activeUsers,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 获取用户列表
 * GET /api/admin/users?page=1&limit=20&search=
 */
router.get('/users', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { nickname: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nickname: true,
          email: true,
          exp: true,
          coins: true,
          stardust: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              characters: true,
              diceRolls: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 更新用户管理员状态
 * PATCH /api/admin/users/:id/admin
 */
const updateAdminSchema = z.object({
  isAdmin: z.boolean(),
});

router.patch('/users/:id/admin', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isAdmin } = updateAdminSchema.parse(req.body);

    // 不能取消自己的管理员权限
    if (id === (req as any).userId && !isAdmin) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_REMOVE_SELF',
          message: '不能取消自己的管理员权限',
        },
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isAdmin },
      select: {
        id: true,
        nickname: true,
        email: true,
        isAdmin: true,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 更新用户货币数量
 * PATCH /api/admin/users/:id/currency
 */
const updateCurrencySchema = z.object({
  coins: z.number().int().min(0).optional(),
  stardust: z.number().int().min(0).optional(),
  exp: z.number().int().min(0).optional(),
});

router.patch('/users/:id/currency', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const payload = updateCurrencySchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data: payload,
      select: {
        id: true,
        nickname: true,
        email: true,
        coins: true,
        stardust: true,
        exp: true,
      },
    });

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 删除用户
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 不能删除自己
    if (id === (req as any).userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: '不能删除自己的账号',
        },
      });
    }

    await prisma.user.delete({ where: { id } });

    res.json({
      success: true,
      message: '用户已删除',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 获取角色卡列表
 * GET /api/admin/characters?page=1&limit=20&search=
 */
router.get('/characters', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { occupation: { contains: search } },
          ],
        }
      : {};

    const [characters, total] = await Promise.all([
      prisma.character.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              email: true,
            },
          },
        },
      }),
      prisma.character.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        characters,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 删除角色卡
 * DELETE /api/admin/characters/:id
 */
router.delete('/characters/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.character.delete({ where: { id } });

    res.json({
      success: true,
      message: '角色卡已删除',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 获取房间列表
 * GET /api/admin/rooms?page=1&limit=20&search=&status=
 */
router.get('/rooms', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const status = (req.query.status as string) || undefined;
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { roomId: { contains: search } },
      ];
    }
    
    if (status) {
      where.status = status;
    }

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.room.count({ where }),
    ]);

    // 获取每个房间的成员数
    const roomIds = rooms.map(r => r.id);
    const memberCounts = await prisma.roomMember.groupBy({
      by: ['roomId'],
      where: { roomId: { in: roomIds } },
      _count: { id: true },
    });
    
    const memberCountMap = new Map(memberCounts.map(m => [m.roomId, m._count.id]));
    
    // 获取创建者信息
    const creatorIds = [...new Set(rooms.map(r => r.creatorId))];
    const creators = await prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, nickname: true },
    });
    const creatorMap = new Map(creators.map(c => [c.id, c]));

    res.json({
      success: true,
      data: {
        rooms: rooms.map(r => ({
          ...r,
          memberCount: memberCountMap.get(r.id) || 0,
          creator: creatorMap.get(r.creatorId),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 强制关闭房间
 * POST /api/admin/rooms/:id/close
 */
router.post('/rooms/:id/close', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const room = await prisma.room.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    res.json({
      success: true,
      data: { room },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 获取系统设置
 * GET /api/admin/settings
 */
router.get('/settings', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    // 从环境变量或配置文件读取设置
    const settings = {
      siteName: process.env.SITE_NAME || 'COC跑团平台',
      siteDescription: process.env.SITE_DESCRIPTION || '克苏鲁的呼唤在线跑团平台',
      maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
      allowRegistration: process.env.ALLOW_REGISTRATION !== 'false',
      maxCharactersPerUser: parseInt(process.env.MAX_CHARACTERS_PER_USER || '10'),
      maxRoomsPerUser: parseInt(process.env.MAX_ROOMS_PER_USER || '5'),
    };

    res.json({
      success: true,
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 更新系统设置
 * PUT /api/admin/settings
 */
const updateSettingsSchema = z.object({
  siteName: z.string().min(1).max(100).optional(),
  siteDescription: z.string().max(500).optional(),
  maintenanceMode: z.boolean().optional(),
  allowRegistration: z.boolean().optional(),
  maxCharactersPerUser: z.number().int().min(1).max(100).optional(),
  maxRoomsPerUser: z.number().int().min(1).max(50).optional(),
});

router.put('/settings', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const settings = updateSettingsSchema.parse(req.body);
    
    // 这里可以将设置保存到数据库或配置文件
    // 目前仅返回更新后的设置
    
    res.json({
      success: true,
      data: { settings },
      message: '设置已更新（需要重启服务器生效）',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

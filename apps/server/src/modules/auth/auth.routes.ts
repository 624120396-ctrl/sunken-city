import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error';
import { authMiddleware } from '../../middleware/auth';

const router = Router();

async function getFrameUrl(frameKey: string | null): Promise<string | null> {
  if (!frameKey) return null;
  const item = await prisma.shopItem.findUnique({
    where: { key: frameKey },
    select: { iconUrl: true },
  });
  return item?.iconUrl || null;
}

// 注册验证schema
const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  nickname: z.string().min(2, '昵称至少2个字符').max(20, '昵称最多20个字符'),
  password: z.string().min(6, '密码至少6个字符'),
});

// 登录验证schema
const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
});

// 注册
router.post('/register', async (req, res, next) => {
  try {
    const { email, nickname, password } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('EMAIL_EXISTS', '该邮箱已被注册', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        nickname,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        exp: true,
        displayedTitleKey: true,
        isAdmin: true,
        coins: true,
        stardust: true,
        equippedFrame: true,
      },
    });

    const token = jwt.sign(
      {
        userId: user.id,
        nickname: user.nickname,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: { user: { ...user, frameUrl: null }, token },
    });
  } catch (error) {
    next(error);
  }
});

// 登录
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', '邮箱或密码错误', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('INVALID_CREDENTIALS', '邮箱或密码错误', 401);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        nickname: user.nickname,
        isAdmin: user.isAdmin,
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '7d' }
    );

    const frameUrl = await getFrameUrl(user.equippedFrame);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          exp: user.exp,
          displayedTitleKey: user.displayedTitleKey,
          isAdmin: user.isAdmin,
          coins: user.coins,
          stardust: user.stardust,
          equippedFrame: user.equippedFrame,
          frameUrl,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// 获取当前用户信息
router.get('/me', async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AppError('UNAUTHORIZED', '未登录', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
      userId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        exp: true,
        displayedTitleKey: true,
        isAdmin: true,
        coins: true,
        stardust: true,
        equippedFrame: true,
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    const frameUrl = await getFrameUrl(user.equippedFrame);

    res.json({
      success: true,
      data: { user: { ...user, frameUrl } },
    });
  } catch (error) {
    next(error);
  }
});

// 更新当前用户信息
router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { nickname, avatarUrl } = req.body;

    const updateData: any = {};
    if (nickname !== undefined) {
      if (nickname.length < 2 || nickname.length > 20) {
        throw new AppError('INVALID_INPUT', '昵称长度应在2-20个字符之间', 400);
      }
      updateData.nickname = nickname;
    }
    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl || null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        exp: true,
        displayedTitleKey: true,
        isAdmin: true,
        coins: true,
        stardust: true,
        equippedFrame: true,
      },
    });

    const frameUrl = await getFrameUrl(user.equippedFrame);

    res.json({
      success: true,
      message: '用户信息已更新',
      data: { user: { ...user, frameUrl } },
    });
  } catch (error) {
    next(error);
  }
});

// 修改密码
router.post('/me/password', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('INVALID_INPUT', '请提供当前密码和新密码', 400);
    }
    if (newPassword.length < 6) {
      throw new AppError('INVALID_INPUT', '新密码至少6个字符', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('INVALID_CREDENTIALS', '当前密码不正确', 401);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    res.json({
      success: true,
      message: '密码修改成功，请使用新密码重新登录',
    });
  } catch (error) {
    next(error);
  }
});

// 设置展示角色（社交资料卡使用，与房间绑定解耦）
router.put('/me/displayed-character', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { characterId } = req.body;

    if (characterId === null || characterId === undefined || characterId === '') {
      // 取消展示
      await prisma.user.update({
        where: { id: userId },
        data: { displayedCharacterId: null },
      });
      return res.json({ success: true, message: '已取消展示角色' });
    }

    // 验证角色存在且属于当前用户
    const character = await prisma.character.findFirst({
      where: { id: characterId, userId },
    });
    if (!character) {
      return res.status(403).json({ success: false, message: '角色不存在或不属于你' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { displayedCharacterId: characterId },
    });

    res.json({ success: true, message: '展示角色设置成功' });
  } catch (error) {
    next(error);
  }
});

// 每日签到
router.post('/daily-checkin', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastCheckinAt: true, coins: true, stardust: true },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    const now = new Date();
    const last = user.lastCheckinAt;
    if (last) {
      const lastDate = new Date(last);
      if (
        lastDate.getFullYear() === now.getFullYear() &&
        lastDate.getMonth() === now.getMonth() &&
        lastDate.getDate() === now.getDate()
      ) {
        return res.status(400).json({
          success: false,
          message: '今日已签到',
        });
      }
    }

    const dailyCoins = 10;
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        coins: { increment: dailyCoins },
        lastCheckinAt: now,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        exp: true,
        displayedTitleKey: true,
        isAdmin: true,
        coins: true,
        stardust: true,
        equippedFrame: true,
      },
    });

    const frameUrl = await getFrameUrl(updated.equippedFrame);

    res.json({
      success: true,
      message: '签到成功',
      data: {
        user: { ...updated, frameUrl },
        reward: { coins: dailyCoins },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

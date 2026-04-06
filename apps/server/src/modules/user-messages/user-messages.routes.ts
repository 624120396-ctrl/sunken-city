import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import {
  createUserMessage,
  getConversationList,
  getMessagesBetween,
  markMessageAsRead,
  getUnreadCount,
} from './user-messages.service';

const router = Router();

/**
 * GET /api/user-messages/conversations
 * 获取当前用户的会话列表
 */
router.get('/user-messages/conversations', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.user!.userId;
    const conversations = await getConversationList(userId);
    res.json({ success: true, data: { conversations } });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user-messages/users/:partnerId
 * 获取与指定用户的私信记录
 */
router.get('/user-messages/users/:partnerId', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.user!.userId;
    const { partnerId } = req.params;
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
    const messages = await getMessagesBetween(userId, partnerId, limit);
    res.json({ success: true, data: { messages } });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/user-messages/users/:partnerId
 * 发送私信
 */
router.post('/user-messages/users/:partnerId', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.user!.userId;
    const { partnerId } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      throw new AppError('INVALID_INPUT', '消息内容不能为空', 400);
    }

    if (content.trim().length > 2000) {
      throw new AppError('INVALID_INPUT', '消息内容不能超过2000字', 400);
    }

    const message = await createUserMessage({
      senderId: userId,
      receiverId: partnerId,
      content: content.trim(),
    });

    // Socket 推送
    const io = req.app.get('io') as import('socket.io').Server | undefined;
    if (io) {
      const { notifyMessageUser } = await import('../../utils/socket-notify');
      notifyMessageUser(io, partnerId, message);
    }

    res.status(201).json({ success: true, data: { message } });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/user-messages/:id/read
 * 标记单条私信已读
 */
router.patch('/user-messages/:id/read', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    await markMessageAsRead(id, userId);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user-messages/unread-count
 * 获取未读私信数量
 */
router.get('/user-messages/unread-count', authMiddleware, async (req: any, res, next) => {
  try {
    const userId = req.user!.userId;
    const unreadCount = await getUnreadCount(userId);
    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    next(error);
  }
});

export default router;

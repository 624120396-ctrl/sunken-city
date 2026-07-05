import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { errorHandler } from './middleware/error';
import { setupSocketHandlers } from './config/socket';
import { logger } from './utils/logger';
import { getOnlineUsers } from './config/socket';

// 路由导入
import authRoutes from './modules/auth/auth.routes';
import characterRoutes from './modules/characters/character.routes';
import roomRoutes from './modules/rooms/room.routes';
import phaseRoutes from './modules/rooms/phase.routes';
import eventLogRoutes from './modules/rooms/event-log.routes';
import clueRoutes from './modules/rooms/clue.routes';
import npcRoutes from './modules/rooms/npc.routes';
import combatV2Routes from './modules/rooms/combat-v2.routes';
import gmNoteRoutes from './modules/rooms/gm-note.routes';
import scenePresetRoutes from './modules/rooms/scene-preset.routes';
import logRoutes from './modules/rooms/log.routes';
import subRoomRoutes from './modules/rooms/sub-room.routes';
import roomLifecycleRoutes from './modules/rooms/room-lifecycle.routes';
import investigationBoardRoutes from './modules/rooms/investigation-board.routes';
import roomCoordinationRoutes from './modules/rooms/room-coordination.routes';
import aiDoubaoRoutes from './modules/rooms/ai-doubao.routes';
import aiDeepseekRoutes from './modules/rooms/ai-deepseek.routes';
import diceRoutes from './modules/dice/dice.routes';
import combatRoutes from './modules/combat/combat.routes';
import reportRoutes from './modules/reports/report.routes';
import adminRoutes from './modules/admin/admin.routes';
import countdownRoutes from './modules/countdown/countdown.routes';
import privateMessageRoutes from './modules/private-message/private-message.routes';
import rankTitleRoutes from './modules/rank-title/rank-title.routes';
import adminRankTitleRoutes from './modules/rank-title/admin-rank-title.routes';
import announcementRoutes from './modules/announcements/announcements.routes';
import adminAnnouncementRoutes from './modules/announcements/admin-announcements.routes';
import uploadRoutes from './modules/uploads/uploads.routes';
import shopRoutes from './modules/shop/shop.routes';
import adminShopRoutes from './modules/shop/admin-shop.routes';
import adminDreamingRoutes from './modules/dreaming/admin-dreaming.routes';
import aiRoutes from './modules/ai/ai.routes';
import forumRoutes from './modules/forum/forum.routes';
import friendRoutes from './modules/friends/friend.routes';
import fishingRoutes from './modules/fishing/fishing.routes';
import dreamingRoutes from './modules/dreaming/dreaming.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import adminNotificationRoutes from './modules/notifications/admin-notifications.routes';
import userMessageRoutes from './modules/user-messages/user-messages.routes';

// 加载环境变量
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 中间件
app.use(helmet({
  contentSecurityPolicy: false, // 开发环境关闭CSP
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));

// 挂载 io 实例供路由层使用
app.set('io', io);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 在线用户
app.get('/api/online-users', (_req, res, next) => {
  getOnlineUsers().then((online) => {
    res.json({ success: true, data: online });
  }).catch(next);
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/rooms', phaseRoutes);
app.use('/api/rooms', eventLogRoutes);
app.use('/api/rooms', clueRoutes);
app.use('/api/rooms', npcRoutes);
app.use('/api/rooms', combatV2Routes);
app.use('/api/rooms', gmNoteRoutes);
app.use('/api/rooms', scenePresetRoutes);
app.use('/api/rooms', logRoutes);
app.use('/api/rooms', subRoomRoutes);
app.use('/api/rooms', roomLifecycleRoutes);
app.use('/api/rooms', investigationBoardRoutes);
app.use('/api/rooms', roomCoordinationRoutes);
app.use('/api/rooms', aiDoubaoRoutes);
app.use('/api/rooms', aiDeepseekRoutes);
app.use('/api/dice', diceRoutes);
app.use('/api', combatRoutes);
app.use('/api', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', countdownRoutes);
app.use('/api', privateMessageRoutes);
app.use('/api', rankTitleRoutes);
app.use('/api', announcementRoutes);
app.use('/api', uploadRoutes);
app.use('/api', shopRoutes);
app.use('/api', friendRoutes);
app.use('/api', fishingRoutes);
app.use('/api', dreamingRoutes);
app.use('/api/admin', adminRankTitleRoutes);
app.use('/api/admin', adminAnnouncementRoutes);
app.use('/api/admin', adminShopRoutes);
app.use('/api/admin', adminDreamingRoutes);
app.use('/api', aiRoutes);
app.use('/api', forumRoutes);
app.use('/api', notificationRoutes);
app.use('/api', userMessageRoutes);
app.use('/api/admin', adminNotificationRoutes);

// SPA 回退 — 支持前端路由
app.get('*', (req, res) => {
  // 排除 API 路径和静态文件请求
  if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/')) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: '请求的资源不存在' },
    });
  }
  res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// 404处理（API路径未匹配时）
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在',
    },
  });
});

// 错误处理
app.use(errorHandler);

// 设置WebSocket
setupSocketHandlers(io);

// 启动服务器
const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`🎲 COC跑团平台服务器运行在端口 ${PORT}`);
  logger.info(`📚 API文档: http://localhost:${PORT}/health`);
});

export { io };

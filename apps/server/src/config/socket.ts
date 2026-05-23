import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './database';
import { logger } from '../utils/logger';
import { calculateSuccessLevel } from '../utils/character-calc';
import { getTemporaryInsanity, rollD10 } from '../data/insanity-tables';

interface SocketUser {
  userId: string;
  nickname: string;
  isAdmin: boolean;
}

interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

interface OnlineUser {
  userId: string;
  nickname: string;
  avatarUrl?: string;
}

// 全局在线用户列表（基础信息，完整数据走数据库查询）
const onlineUsers = new Map<string, OnlineUser>();

// ===== V2.1: 跑团 Log 同步钩子 =====
async function syncEventToLog(roomId: string, eventType: string, payload: any, meta?: { userId?: string; nickname?: string; characterId?: string; characterName?: string }) {
  try {
    const log = await prisma.roomLog.findFirst({ where: { roomId } }) || await prisma.roomLog.create({ data: { roomId } });
    const count = await prisma.roomLogEvent.count({ where: { logId: log.id } });
    await prisma.roomLogEvent.create({
      data: {
        logId: log.id,
        roomId,
        eventType,
        payload: JSON.stringify(payload),
        userId: meta?.userId || '',
        userNickname: meta?.nickname || '系统',
        characterId: meta?.characterId || null,
        characterName: meta?.characterName || null,
        sortOrder: count + 1,
      },
    });
  } catch (err) {
    logger.error('Log 同步失败:', err);
  }
}

// 暴露给外部使用（实时查询数据库组装完整资料）
export async function getOnlineUsers() {
  if (onlineUsers.size === 0) {
    return { count: 0, users: [] };
  }

  const userIds = [...new Set(Array.from(onlineUsers.values()).map(u => u.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      equippedFrame: true,
      displayedCharacterId: true,
      exp: true,
      coins: true,
      stardust: true,
      displayedTitleKey: true,
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
  });

  const frameKeys = [...new Set(users.map(u => u.equippedFrame).filter(Boolean))] as string[];
  const shopItems = frameKeys.length > 0
    ? await prisma.shopItem.findMany({ where: { key: { in: frameKeys } }, select: { key: true, iconUrl: true } })
    : [];
  const frameMap = new Map(shopItems.map(s => [s.key, s.iconUrl]));

  const titleKeys = [...new Set(users.map(u => u.displayedTitleKey).filter(Boolean))] as string[];
  const titles = titleKeys.length > 0
    ? await prisma.titleConfig.findMany({ where: { key: { in: titleKeys } }, select: { key: true, name: true, color: true } })
    : [];
  const titleMap = new Map(titles.map(t => [t.key, t]));

  const ranks = await prisma.rankConfig.findMany({
    where: { expRequired: { lte: Math.max(...users.map(u => u.exp), 0) } },
    orderBy: { expRequired: 'desc' },
  });
  const rankMap = new Map(
    users.map(u => {
      const rank = ranks.find(r => r.expRequired <= u.exp);
      return [u.id, rank];
    })
  );

  const enrichUser = (u: (typeof users)[0]) => {
    const rank = rankMap.get(u.id);
    const title = u.displayedTitleKey ? titleMap.get(u.displayedTitleKey) : null;
    const nextRank = rank ? ranks.find(r => r.expRequired > rank.expRequired) : null;
    return {
      userId: u.id,
      nickname: u.nickname,
      avatarUrl: u.avatarUrl || undefined,
      frameUrl: frameMap.get(u.equippedFrame || '') || null,
      rankName: rank?.name || '未知位阶',
      rankColor: rank?.color || '#6b6558',
      titleName: title?.name || null,
      titleColor: title?.color || null,
      exp: u.exp,
      expToNext: nextRank ? nextRank.expRequired - u.exp : 0,
      nextRankName: nextRank?.name || null,
      coins: u.coins,
      stardust: u.stardust,
      displayedCharacter: u.displayedCharacter,
    };
  };

  return {
    count: userIds.length,
    users: users.map(enrichUser),
  };
}

// 内存中的战斗状态
const combatStates = new Map<string, any>();

export function setupSocketHandlers(io: SocketIOServer) {
  // 中间件：验证JWT
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token || typeof token !== 'string') {
        return next(new Error('未提供认证令牌'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as {
        userId: string;
        nickname: string;
        isAdmin: boolean;
      };

      socket.user = decoded;
      next();
    } catch (error) {
      logger.error('Socket认证失败:', error);
      next(new Error('认证无效'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    logger.info(`用户连接: ${socket.user?.nickname} (${socket.id})`);

    // 加入全局在线列表
    if (socket.user) {
      onlineUsers.set(socket.id, {
        userId: socket.user.userId,
        nickname: socket.user.nickname,
      });

      // 加入个人房间，用于接收实时通知和私信
      socket.join(`user:${socket.user.userId}`);

      // 广播在线人数更新
      const online = await getOnlineUsers();
      io.emit('online:update', online);
    }

    // 客户端可以主动请求当前在线列表
    socket.on('online:get', async () => {
      socket.emit('online:update', await getOnlineUsers());
    });

    // 加入房间
    socket.on('room:join', async (data: { roomId: string; password?: string }) => {
      try {
        const { roomId, password } = data;
        const userId = socket.user!.userId;

        // 查找房间
        const room = await prisma.room.findUnique({
          where: { roomId },
          include: {
            members: {
              include: {
                user: {
                  include: {
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
                character: true,
              },
            },
          },
        });

        if (!room) {
          socket.emit('error', { message: '房间不存在' });
          return;
        }

        if (room.status === 'CLOSED') {
          socket.emit('error', { message: '房间已关闭' });
          return;
        }

        // 获取当前用户的角色详情
        const myMember = room.members.find(m => m.userId === userId);
        const myCharacter = myMember?.character;

        // 查询最近聊天记录
        const recentMessages = await prisma.roomMessage.findMany({
          where: { roomId: room.id },
          orderBy: { createdAt: 'asc' },
          take: 200,
        });

        // 批量获取头像框图片URL
        const frameKeys = [...new Set(room.members.map(m => m.user.equippedFrame).filter(Boolean))] as string[];
        const shopItems = frameKeys.length > 0
          ? await prisma.shopItem.findMany({ where: { key: { in: frameKeys } }, select: { key: true, iconUrl: true } })
          : [];
        const frameMap = new Map(shopItems.map(s => [s.key, s.iconUrl]));

        const titleKeys = [...new Set(room.members.map(m => m.user.displayedTitleKey).filter(Boolean))] as string[];
        const titles = titleKeys.length > 0
          ? await prisma.titleConfig.findMany({ where: { key: { in: titleKeys } }, select: { key: true, name: true, color: true } })
          : [];
        const titleMap = new Map(titles.map(t => [t.key, t]));

        const memberExps = room.members.map(m => m.user.exp);
        const ranks = await prisma.rankConfig.findMany({
          where: { expRequired: { lte: Math.max(...memberExps, 0) } },
          orderBy: { expRequired: 'desc' },
        });

        // 加入Socket房间
        socket.join(roomId);

        const buildMemberPayload = (m: (typeof room.members)[0]) => {
          const rank = ranks.find(r => r.expRequired <= m.user.exp);
          const nextRank = rank ? ranks.find(r => r.expRequired > rank.expRequired) : null;
          const title = m.user.displayedTitleKey ? titleMap.get(m.user.displayedTitleKey) : null;
          const dc = m.user.displayedCharacter;
          return {
            userId: m.userId,
            nickname: m.user.nickname,
            avatarUrl: m.user.avatarUrl,
            frameUrl: frameMap.get(m.user.equippedFrame || '') || null,
            role: m.role,
            characterId: m.characterId,
            characterName: m.character?.name,
            rankName: rank?.name || '未知位阶',
            rankColor: rank?.color || '#6b6558',
            titleName: title?.name || null,
            titleColor: title?.color || null,
            exp: m.user.exp,
            expToNext: nextRank ? nextRank.expRequired - m.user.exp : 0,
            nextRankName: nextRank?.name || null,
            coins: m.user.coins,
            stardust: m.user.stardust,
            displayedCharacter: dc ? {
              id: dc.id,
              name: dc.name,
              occupation: dc.occupation,
              avatarUrl: dc.avatarUrl,
              hp: dc.hp,
              maxHp: dc.maxHp,
              mp: dc.mp,
              maxMp: dc.maxMp,
              san: dc.san,
              maxSan: dc.maxSan,
              str: dc.str,
              dex: dc.dex,
              con: dc.con,
              siz: dc.siz,
              app: dc.app,
              int: dc.int,
              pow: dc.pow,
              edu: dc.edu,
              luck: dc.luck,
              mov: dc.mov,
              build: dc.build,
              background: dc.background,
              skills: dc.skills,
              quickSkills: dc.quickSkills,
            } : null,
          };
        };

        // 发送当前房间状态
        socket.emit('room:joined', {
          room: {
            id: room.id,
            roomId: room.roomId,
            name: room.name,
            description: room.description,
          },
          members: room.members.map(buildMemberPayload),
          myCharacter: myCharacter ? {
            id: myCharacter.id,
            name: myCharacter.name,
            occupation: myCharacter.occupation,
            hp: myCharacter.hp,
            mp: myCharacter.mp,
            san: myCharacter.san,
            maxHp: myCharacter.maxHp,
            maxMp: myCharacter.maxMp,
            maxSan: myCharacter.maxSan,
            str: myCharacter.str,
            dex: myCharacter.dex,
            con: myCharacter.con,
            siz: myCharacter.siz,
            app: myCharacter.app,
            int: myCharacter.int,
            pow: myCharacter.pow,
            edu: myCharacter.edu,
            luck: myCharacter.luck,
            mov: myCharacter.mov,
            build: myCharacter.build,
            skills: myCharacter.skills,
            weapons: myCharacter.weapons,
            armor: myCharacter.armor,
          } : null,
          messages: recentMessages.map((m) => ({
            id: m.id,
            userId: m.userId,
            nickname: m.nickname,
            content: m.isSecret ? '🔒 KP进行了一次暗骰' : m.content,
            characterId: m.characterId,
            isSecret: m.isSecret,
            type: m.type,
            meta: m.meta ? JSON.parse(m.meta) : undefined,
            timestamp: m.createdAt.toISOString(),
          })),
        });

        // 通知房间内其他用户
        socket.to(roomId).emit('room:member_joined', {
          userId,
          nickname: socket.user!.nickname,
          timestamp: new Date().toISOString(),
        });

        logger.info(`用户 ${socket.user?.nickname} 加入房间 ${roomId}`);
      } catch (error) {
        logger.error('加入房间失败:', error);
        socket.emit('error', { message: '加入房间失败' });
      }
    });

    // 离开房间
    socket.on('room:leave', async (data: { roomId: string }) => {
      const { roomId } = data;
      socket.leave(roomId);
      
      socket.to(roomId).emit('room:member_left', {
        userId: socket.user!.userId,
        nickname: socket.user!.nickname,
        timestamp: new Date().toISOString(),
      });

      logger.info(`用户 ${socket.user?.nickname} 离开房间 ${roomId}`);
    });

    // 发送消息
    socket.on('message:send', async (data: { roomId: string; content: string; characterId?: string; isSecret?: boolean }) => {
      try {
        const { roomId, content, characterId, isSecret } = data;
        
        const room = await prisma.room.findUnique({ where: { roomId } });
        if (!room) return;

        const messageId = Date.now().toString();
        const messageData = {
          id: messageId,
          sender: {
            userId: socket.user!.userId,
            nickname: socket.user!.nickname,
          },
          content: isSecret ? '🔒 暗骰消息' : content,
          characterId,
          isSecret,
          timestamp: new Date().toISOString(),
        };

        // 保存到数据库
        await prisma.roomMessage.create({
          data: {
            roomId: room.id,
            userId: socket.user!.userId,
            nickname: socket.user!.nickname,
            content: isSecret ? content : content, // 存原始内容，暗骰也存真实内容
            characterId: characterId || null,
            isSecret: !!isSecret,
            type: 'text',
          },
        });

        if (isSecret) {
          // 暗骰：只发送给发送者和KP
          socket.emit('message:received', {
            ...messageData,
            content: `🔒 [暗骰] ${content}`,
          });
          // 找到KP并发送真实内容，其他成员收到简化消息
          const kpMembers = await prisma.roomMember.findMany({
            where: { roomId: room.id, role: 'KP' },
          });
          const kpUserIds = new Set(kpMembers.map(m => m.userId));
          const roomMembers = io.sockets.adapter.rooms.get(roomId);
          if (roomMembers) {
            roomMembers.forEach((socketId) => {
              const memberSocket = io.sockets.sockets.get(socketId);
              if (memberSocket && memberSocket !== socket) {
                if (kpUserIds.has((memberSocket as any).user!.userId)) {
                  memberSocket.emit('message:received', {
                    ...messageData,
                    content: `🔒 [暗骰] ${content}`,
                  });
                } else {
                  memberSocket.emit('message:received', {
                    ...messageData,
                    content: '🔒 KP进行了一次暗骰',
                  });
                }
              }
            });
          }
        } else {
          // 普通消息：广播给所有人
          io.to(roomId).emit('message:received', messageData);
        }

        // ===== V2.1: 同步到 Log =====
        await syncEventToLog(room.id, 'CHAT_TEXT', {
          message: content,
          isSecret: !!isSecret,
        }, {
          userId: socket.user!.userId,
          nickname: socket.user!.nickname,
          characterId: characterId || undefined,
        });
      } catch (error) {
        logger.error('发送消息失败:', error);
        socket.emit('error', { message: '发送消息失败' });
      }
    });

    // 投骰
    socket.on('dice:roll', async (data: {
      roomId: string;
      rollType: string;
      targetName?: string;
      targetValue?: number;
      characterId?: string;
      isSecret?: boolean;
    }) => {
      try {
        const { roomId, rollType, targetName, targetValue, characterId, isSecret } = data;
        const userId = socket.user!.userId;

        // 通用骰子解析 NdM
        let count = 1;
        let sides = 100;
        const diceMatch = rollType.match(/^(\d+)d(\d+)$/i);
        if (diceMatch) {
          count = Math.min(parseInt(diceMatch[1], 10), 100);
          sides = Math.min(parseInt(diceMatch[2], 10), 10000);
        } else if (rollType === '1D20') {
          count = 1; sides = 20;
        } else if (rollType === '1D6') {
          count = 1; sides = 6;
        } else if (rollType === '2D6') {
          count = 2; sides = 6;
        } else if (rollType === '3D6') {
          count = 3; sides = 6;
        }

        let rollResult = 0;
        const rolls: number[] = [];
        for (let i = 0; i < count; i++) {
          const r = Math.floor(Math.random() * sides) + 1;
          rolls.push(r);
          rollResult += r;
        }

        // 计算成功等级
        const successLevel = targetValue 
          ? calculateSuccessLevel(rollResult, targetValue)
          : '-';

        // 保存到数据库
        const room = await prisma.room.findUnique({ where: { roomId } });
        if (room) {
          await prisma.diceRoll.create({
            data: {
              roomId: room.id,
              userId,
              rollType,
              targetName,
              targetValue,
              rollResult,
              rolls: JSON.stringify(rolls),
              successLevel,
            },
          });

          // 同时保存到聊天记录
          const diceContent = targetName
            ? `🎲 ${targetName} 检定: ${rollResult}/${targetValue} ${successLevel}`
            : `🎲 ${rollType}: ${rollResult}`;

          await prisma.roomMessage.create({
            data: {
              roomId: room.id,
              userId,
              nickname: socket.user!.nickname,
              content: diceContent,
              isSecret: !!isSecret,
              type: 'dice',
              meta: JSON.stringify({ rollType, targetName, targetValue, rollResult, successLevel }),
            },
          });

        // ===== V2.1: 线索自动揭示钩子 =====
        if (targetName && targetValue && successLevel && successLevel !== '-' && room) {
          const isFailure = ['FUMBLE', 'FAILURE'].includes(successLevel);
          if (!isFailure) {
            const autoClues = await prisma.roomClue.findMany({
              where: {
                roomId: room.id,
                isHidden: true,
                autoReveal: true,
                discoverySkill: targetName,
                discoveryThreshold: { lte: targetValue },
              },
            });

            for (const clue of autoClues) {
              await prisma.roomClue.update({
                where: { id: clue.id },
                data: {
                  isHidden: false,
                  discoveredByUserId: userId,
                  discoveredAt: new Date(),
                },
              });

              await prisma.roomEventLog.create({
                data: {
                  roomId: room.id,
                  eventType: 'CLUE_DISCOVERED',
                  payload: JSON.stringify({
                    clueId: clue.id,
                    clueTitle: clue.title,
                    discoveredBy: socket.user!.nickname,
                    skill: targetName,
                    rollResult,
                    successLevel,
                    auto: true,
                  }),
                  userId,
                },
              });
            }

            if (autoClues.length > 0) {
              // 广播线索揭示事件
              io.to(roomId).emit('clue:discovered', {
                clues: autoClues.map(c => ({ id: c.id, title: c.title })),
                discoveredBy: socket.user!.nickname,
                skill: targetName,
              });
            }
          }
        }

        const rollData = {
          id: Date.now().toString(),
          sender: {
            userId,
            nickname: socket.user!.nickname,
          },
          rollType,
          targetName,
          targetValue,
          rollResult,
          rolls,
          successLevel,
          timestamp: new Date().toISOString(),
          // V2.1: 附加自动揭示的线索
          revealedClues: undefined as any,
        };

          if (isSecret) {
            // 暗骰：发送者和 KP 看到真实结果
            socket.emit('dice:result', rollData);
            const kpMembers = await prisma.roomMember.findMany({
              where: { roomId: room.id, role: 'KP' },
            });
            const kpUserIds = new Set(kpMembers.map(m => m.userId));
            const roomMembers = io.sockets.adapter.rooms.get(roomId);
            if (roomMembers) {
              roomMembers.forEach((socketId) => {
                const memberSocket = io.sockets.sockets.get(socketId);
                if (memberSocket && memberSocket !== socket) {
                  if (kpUserIds.has((memberSocket as any).user!.userId)) {
                    memberSocket.emit('dice:result', rollData);
                  } else {
                    memberSocket.emit('dice:result', {
                      ...rollData,
                      rollResult: 0,
                      rolls: [],
                      successLevel: '-',
                      targetName: undefined,
                      targetValue: undefined,
                      content: '🔒 KP进行了一次暗骰',
                    });
                  }
                }
              });
            }
          } else {
            io.to(roomId).emit('dice:result', rollData);
          }

          // ===== V2.1: 同步到 Log =====
          await syncEventToLog(room.id, 'DICE_ROLL', {
            rollType,
            targetName,
            targetValue,
            rollResult,
            rolls,
            successLevel,
          }, {
            userId,
            nickname: socket.user!.nickname,
          });
        }

        logger.info(`用户 ${socket.user?.nickname} 在房间 ${roomId} 投骰: ${rollResult}`);
      } catch (error) {
        logger.error('投骰失败:', error);
        socket.emit('error', { message: '投骰失败' });
      }
    });

    // 理智扣除（KP 专用）
    socket.on('sanity:deduct', async (data: {
      roomId: string;
      deductions: { userId: string; amount: number; description?: string }[];
    }) => {
      try {
        const { roomId, deductions } = data;
        const userId = socket.user!.userId;

        const room = await prisma.room.findUnique({
          where: { roomId },
          include: {
            members: {
              include: {
                user: { select: { id: true, nickname: true } },
                character: true,
              },
            },
          },
        });

        if (!room) {
          socket.emit('error', { message: '房间不存在' });
          return;
        }

        const member = room.members.find(m => m.userId === userId);
        if (!member || member.role !== 'KP') {
          socket.emit('error', { message: '只有KP可以操作理智' });
          return;
        }

        const results: any[] = [];

        for (const d of deductions) {
          const targetMember = room.members.find(m => m.userId === d.userId && !m.leftAt);
          if (!targetMember || !targetMember.character) continue;

          const char = targetMember.character;
          const oldSan = char.san;
          const loss = Math.max(0, Math.min(d.amount, oldSan));
          const newSan = oldSan - loss;

          // 更新数据库
          await prisma.character.update({
            where: { id: char.id },
            data: { san: newSan },
          });

          let insanity: any = null;
          if (loss >= 5) {
            // 智力检定：掷 D100 ≤ INT 则陷入临时疯狂
            const intCheck = Math.floor(Math.random() * 100) + 1;
            if (intCheck <= (char.int || 50)) {
              const duration = rollD10();
              const symptom = getTemporaryInsanity(rollD10());
              insanity = {
                intCheck,
                intValue: char.int || 50,
                duration,
                symptomName: symptom.name,
                symptomDesc: symptom.description,
              };
            } else {
              insanity = {
                intCheck,
                intValue: char.int || 50,
                resisted: true,
              };
            }
          }

          results.push({
            userId: d.userId,
            nickname: targetMember.user.nickname,
            characterName: char.name,
            oldSan,
            loss,
            newSan,
            description: d.description,
            insanity,
          });
        }

        // 写入系统消息
        for (const r of results) {
          const maxSan = room.members.find(m => m.userId === r.userId)?.character?.maxSan || 50;
          let content = `☠️ ${r.nickname}(${r.characterName}) 损失了 ${r.loss} 点理智 [${r.newSan}/${maxSan}]`;
          if (r.description) content += ` — ${r.description}`;

          await prisma.roomMessage.create({
            data: {
              roomId: room.id,
              userId: r.userId,
              nickname: '理智侵蚀',
              content,
              type: 'system',
              meta: JSON.stringify({
                type: 'sanity_loss',
                userId: r.userId,
                loss: r.loss,
                oldSan: r.oldSan,
                newSan: r.newSan,
                description: r.description,
                insanity: r.insanity,
              }),
            },
          });
        }

        io.to(roomId).emit('sanity:deducted', { results });
        logger.info(`KP ${socket.user?.nickname} 在房间 ${roomId} 扣除理智`, results.map(r => `${r.nickname} -${r.loss}`).join(', '));
      } catch (error) {
        logger.error('理智扣除失败:', error);
        socket.emit('error', { message: '理智扣除失败' });
      }
    });

    // 战斗开始
    socket.on('combat:start', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const userId = socket.user!.userId;

        const room = await prisma.room.findUnique({
          where: { roomId },
          include: {
            members: {
              include: {
                user: { select: { id: true, nickname: true } },
                character: { select: { id: true, name: true, dex: true, hp: true, mp: true, san: true } },
              },
            },
          },
        });

        if (!room) {
          socket.emit('error', { message: '房间不存在' });
          return;
        }

        const member = room.members.find(m => m.userId === userId);
        if (!member || member.role !== 'KP') {
          socket.emit('error', { message: '只有KP可以开始战斗' });
          return;
        }

        const combatants = room.members
          .filter(m => m.leftAt === null)
          .map((m: any) => ({
            userId: m.userId,
            characterId: m.character?.id,
            nickname: m.user.nickname,
            characterName: m.character?.name,
            dex: m.character?.dex || 50,
            hp: m.character?.hp || 10,
            maxHp: m.character?.hp || 10,
            mp: m.character?.mp || 10,
            san: m.character?.san || 50,
            isKP: m.role === 'KP',
          }))
          .sort((a: any, b: any) => b.dex - a.dex);

        const state = {
          status: 'IN_PROGRESS',
          currentRound: 1,
          currentTurnIndex: 0,
          turnOrder: combatants,
          log: [{
            id: Date.now().toString(),
            round: 1,
            actor: '系统',
            action: '战斗开始',
            result: `第1回合，行动顺序: ${combatants.map(c => c.nickname).join(' > ')}`,
            timestamp: new Date().toISOString(),
          }],
        };

        combatStates.set(roomId, state);
        io.to(roomId).emit('combat:started', state);
        logger.info(`房间 ${roomId} 战斗开始`);
      } catch (error) {
        logger.error('开始战斗失败:', error);
        socket.emit('error', { message: '开始战斗失败' });
      }
    });

    // 执行攻击
    socket.on('combat:attack', async (data: {
      roomId: string;
      targetUserId: string;
      skillName?: string;
      skillValue?: number;
      weaponDamage?: string;
      armorValue?: number;
    }) => {
      try {
        const { roomId, targetUserId, skillName = '格斗', skillValue = 50, weaponDamage = '1D6', armorValue = 0 } = data;
        const userId = socket.user!.userId;

        const state = combatStates.get(roomId);
        if (!state || state.status !== 'IN_PROGRESS') {
          socket.emit('error', { message: '当前没有进行中的战斗' });
          return;
        }

        const currentCombatant = state.turnOrder[state.currentTurnIndex];
        if (currentCombatant.userId !== userId) {
          socket.emit('error', { message: '不是你的回合' });
          return;
        }

        // 命中检定
        const hitRoll = Math.floor(Math.random() * 100) + 1;
        let hitSuccess = false;
        let hitLevel = '失败';

        if (hitRoll <= skillValue) {
          hitSuccess = true;
          if (hitRoll <= skillValue / 5) hitLevel = '极难成功';
          else if (hitRoll <= skillValue / 2) hitLevel = '困难成功';
          else hitLevel = '成功';
        } else if (hitRoll >= 96 && skillValue < 50) {
          hitLevel = '大失败';
        }

        let damage = 0;
        let finalDamage = 0;
        let damageRoll = '';

        if (hitSuccess) {
          const diceMatch = weaponDamage.match(/(\d+)D(\d+)(?:\+([\d]+))?/i);
          if (diceMatch) {
            const count = parseInt(diceMatch[1]);
            const sides = parseInt(diceMatch[2]);
            const bonus = parseInt(diceMatch[3] || '0');
            let sum = bonus;
            const rolls: number[] = [];
            for (let i = 0; i < count; i++) {
              const r = Math.floor(Math.random() * sides) + 1;
              rolls.push(r);
              sum += r;
            }
            damage = sum;
            damageRoll = rolls.join('+');
            if (bonus > 0) damageRoll += `+${bonus}`;
          } else {
            damage = parseInt(weaponDamage) || 0;
          }

          finalDamage = Math.max(0, damage - armorValue);

          const targetIndex = state.turnOrder.findIndex((c: any) => c.userId === targetUserId);
          if (targetIndex >= 0) {
            state.turnOrder[targetIndex].hp = Math.max(0, state.turnOrder[targetIndex].hp - finalDamage);
          }
        }

        const result = {
          hitRoll,
          hitLevel,
          hitSuccess,
          damage,
          finalDamage,
          damageRoll,
          actor: currentCombatant.nickname,
          target: state.turnOrder.find((c: any) => c.userId === targetUserId)?.nickname,
          targetHp: state.turnOrder.find((c: any) => c.userId === targetUserId)?.hp,
        };

        state.log.push({
          id: Date.now().toString(),
          round: state.currentRound,
          actor: currentCombatant.nickname,
          action: `使用 ${skillName} 攻击`,
          target: result.target,
          result: `${hitRoll}/${skillValue} ${hitLevel}${hitSuccess ? `, 伤害: ${damageRoll}=${damage}${armorValue > 0 ? `(护甲-${armorValue})` : ''}=${finalDamage}` : ''}`,
          timestamp: new Date().toISOString(),
        });

        io.to(roomId).emit('combat:attack_result', result);
        io.to(roomId).emit('combat:updated', state);
      } catch (error) {
        logger.error('攻击失败:', error);
        socket.emit('error', { message: '攻击失败' });
      }
    });

    // 结束回合
    socket.on('combat:next_turn', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const userId = socket.user!.userId;

        const state = combatStates.get(roomId);
        if (!state || state.status !== 'IN_PROGRESS') {
          socket.emit('error', { message: '当前没有进行中的战斗' });
          return;
        }

        const currentCombatant = state.turnOrder[state.currentTurnIndex];
        if (currentCombatant.userId !== userId) {
          socket.emit('error', { message: '不是你的回合' });
          return;
        }

        state.currentTurnIndex++;
        if (state.currentTurnIndex >= state.turnOrder.length) {
          state.currentTurnIndex = 0;
          state.currentRound++;
          
          state.log.push({
            id: Date.now().toString(),
            round: state.currentRound,
            actor: '系统',
            action: '新回合开始',
            result: `第${state.currentRound}回合`,
            timestamp: new Date().toISOString(),
          });
        }

        const nextCombatant = state.turnOrder[state.currentTurnIndex];

        io.to(roomId).emit('combat:turn_changed', {
          nextTurn: nextCombatant.nickname,
          round: state.currentRound,
        });
        io.to(roomId).emit('combat:updated', state);
      } catch (error) {
        logger.error('切换回合失败:', error);
        socket.emit('error', { message: '切换回合失败' });
      }
    });

    // 结束战斗
    socket.on('combat:end', async (data: { roomId: string }) => {
      try {
        const { roomId } = data;
        const userId = socket.user!.userId;

        const room = await prisma.room.findUnique({
          where: { roomId },
          include: { members: true },
        });

        if (!room) {
          socket.emit('error', { message: '房间不存在' });
          return;
        }

        const member = room.members.find(m => m.userId === userId);
        if (!member || member.role !== 'KP') {
          socket.emit('error', { message: '只有KP可以结束战斗' });
          return;
        }

        const state = combatStates.get(roomId);
        if (state) {
          state.status = 'ENDED';
          state.log.push({
            id: Date.now().toString(),
            round: state.currentRound,
            actor: '系统',
            action: '战斗结束',
            result: '战斗已结束',
            timestamp: new Date().toISOString(),
          });
        }

        io.to(roomId).emit('combat:ended', state);
        logger.info(`房间 ${roomId} 战斗结束`);
      } catch (error) {
        logger.error('结束战斗失败:', error);
        socket.emit('error', { message: '结束战斗失败' });
      }
    });

    // 切换武器
    socket.on('combat:switch_weapon', async (data: { roomId: string; weaponIndex: number }) => {
      try {
        const { roomId, weaponIndex } = data;
        const userId = socket.user!.userId;

        const state = combatStates.get(roomId);
        if (!state || state.status !== 'IN_PROGRESS') {
          socket.emit('error', { message: '当前没有进行中的战斗' });
          return;
        }

        const currentCombatant = state.turnOrder[state.currentTurnIndex];
        if (currentCombatant.userId !== userId) {
          socket.emit('error', { message: '不是你的回合' });
          return;
        }

        const weapons = currentCombatant.weapons || [];
        if (weaponIndex < 0 || weaponIndex >= weapons.length) {
          socket.emit('error', { message: '无效的武器索引' });
          return;
        }

        const newWeapon = weapons[weaponIndex];
        currentCombatant.equippedWeapon = newWeapon;

        state.log.push({
          id: Date.now().toString(),
          round: state.currentRound,
          actor: currentCombatant.nickname,
          action: '切换武器',
          result: `装备 ${newWeapon.name}`,
          timestamp: new Date().toISOString(),
        });

        io.to(roomId).emit('combat:weapon_switched', {
          userId,
          equippedWeapon: newWeapon,
        });
        io.to(roomId).emit('combat:updated', state);

        logger.info(`用户 ${socket.user?.nickname} 切换武器为 ${newWeapon.name}`);
      } catch (error) {
        logger.error('切换武器失败:', error);
        socket.emit('error', { message: '切换武器失败' });
      }
    });

    // 断开连接
    socket.on('disconnect', async () => {
      logger.info(`用户断开连接: ${socket.user?.nickname} (${socket.id})`);

      if (socket.user && onlineUsers.has(socket.id)) {
        onlineUsers.delete(socket.id);
        io.emit('online:update', await getOnlineUsers());
      }
    });
  });
}
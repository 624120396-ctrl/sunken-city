import { Router } from 'express';
import { prisma } from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { AppError } from '../../middleware/error';
import { buildRoomAuthView } from './room-view';
import {
  assertRoomVoiceCapacity,
  buildLiveKitRoomName,
  buildRoomVoiceParticipant,
  buildRoomVoiceRuntimeConfig,
  createRoomVoiceToken,
  isRoomVoiceLifecycleAllowed,
  RoomVoiceCapacityError,
  roomVoiceConfigStatus,
} from './room-voice.service';

const router = Router();

function getUserId(req: AuthRequest) {
  return req.userId || req.user?.userId;
}

function observerCanSpeak() {
  return process.env.ROOM_VOICE_OBSERVER_CAN_SPEAK === 'true';
}

async function getRoomVoiceAuth(roomId: string, userId?: string) {
  const room = await prisma.room.findUnique({
    where: { roomId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
            },
          },
        },
      },
      roomRun: {
        select: {
          lifecycle: true,
        },
      },
    },
  });

  if (!room) {
    throw new AppError('ROOM_NOT_FOUND', '房间不存在', 404);
  }

  const member = room.members.find((roomMember) => roomMember.userId === userId && !roomMember.leftAt) || null;
  const auth = buildRoomAuthView({
    room,
    userId,
    member,
    lifecycle: room.roomRun?.lifecycle,
  });

  if (!auth.myCapabilities.canViewPublicContent) {
    throw new AppError('FORBIDDEN', '你没有加入此房间语音频道的权限', 403);
  }

  if (!isRoomVoiceLifecycleAllowed(auth.lifecycle)) {
    throw new AppError('VOICE_LIFECYCLE_NOT_AVAILABLE', '当前房间状态不可加入语音频道', 409, {
      lifecycle: auth.lifecycle,
    });
  }

  return {
    room,
    member,
    auth,
    nickname: member?.user.nickname ?? (auth.myRole === 'OWNER_KP' ? '守密人' : auth.myRole),
  };
}

router.get('/:roomId/voice/status', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req);
    const { auth } = await getRoomVoiceAuth(req.params.roomId, userId);
    const config = buildRoomVoiceRuntimeConfig();

    res.json({
      success: true,
      data: {
        status: roomVoiceConfigStatus(config),
        serverUrl: config.serverUrl,
        missing: config.missing,
        observerCanSpeak: observerCanSpeak(),
        maxParticipants: config.maxParticipants,
        permissions: {
          canJoinVoice: auth.myCapabilities.canViewPublicContent,
          canManageVoice: auth.myCapabilities.canUseKPTools,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:roomId/voice/token', authMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const userId = getUserId(req);
    if (!userId) throw new AppError('UNAUTHORIZED', '请先登录', 401);

    const { member, auth, nickname } = await getRoomVoiceAuth(req.params.roomId, userId);
    const participant = buildRoomVoiceParticipant({
      roomId: req.params.roomId,
      userId,
      nickname,
      role: auth.myRole,
      roomMemberId: member?.id ?? null,
    });
    const config = buildRoomVoiceRuntimeConfig();
    if (!config.enabled) {
      throw new AppError('VOICE_NOT_CONFIGURED', '房间语音服务尚未完成部署配置', 503, {
        missing: config.missing,
      });
    }

    try {
      await assertRoomVoiceCapacity({
        config,
        roomName: buildLiveKitRoomName(req.params.roomId),
        participantIdentity: participant.identity,
      });
    } catch (error) {
      if (error instanceof RoomVoiceCapacityError) {
        throw new AppError(error.code, error.message, error.statusCode, {
          maxParticipants: config.maxParticipants,
        });
      }
      throw error;
    }

    const result = await createRoomVoiceToken({
      roomId: req.params.roomId,
      userId,
      nickname,
      role: auth.myRole,
      roomMemberId: member?.id ?? null,
      capabilities: auth.myCapabilities,
      observerCanSpeak: observerCanSpeak(),
      participant,
    });

    res.json({
      success: true,
      data: {
        serverUrl: result.serverUrl,
        token: result.token,
        roomName: result.roomName,
        identity: result.identity,
        expiresInSeconds: result.expiresInSeconds,
        permissions: {
          canPublishAudio: result.grant.canPublish,
          canSubscribeAudio: result.grant.canSubscribe,
          canManageVoice: result.grant.roomAdmin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

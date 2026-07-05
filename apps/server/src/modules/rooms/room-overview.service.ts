import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { requireRoomCapability } from './room-auth';

function parseArray(raw: string | null | undefined): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function countBy<T extends string>(items: Array<{ status: T }>, fallback: Record<string, number> = {}) {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, { ...fallback });
}

export async function getRoomOperationsOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    const { roomId } = req.params;
    const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');
    const canUseKpTools = auth.capabilities.canUseKPTools;

    const [
      focus,
      clueStats,
      npcStats,
      sceneStats,
      pinnedLogs,
      recentPublicLogs,
      kpPrivateNotesCount,
      nextSession,
      attendance,
      activeMembers,
      pinnedAnnouncement,
      communicationState,
      queue,
      recruitmentProfile,
      pendingApplicationsCount,
      pendingInvitationsCount,
    ] = await Promise.all([
      prisma.roomCurrentFocus.findUnique({ where: { roomId: auth.room.id } }),
      prisma.investigationClue.groupBy({
        by: ['visibility'],
        where: { roomId: auth.room.id },
        _count: { _all: true },
      }),
      prisma.investigationNpc.groupBy({
        by: ['visibility'],
        where: { roomId: auth.room.id },
        _count: { _all: true },
      }),
      prisma.investigationScene.aggregate({
        where: { roomId: auth.room.id },
        _count: { _all: true },
      }),
      prisma.investigationLogEntry.count({
        where: { roomId: auth.room.id, visibility: 'PUBLIC', isPinned: true },
      }),
      prisma.investigationLogEntry.findMany({
        where: { roomId: auth.room.id, visibility: 'PUBLIC' },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { id: true, eventType: true, title: true, createdAt: true },
      }),
      canUseKpTools
        ? prisma.kpPrivateNote.count({ where: { roomId: auth.room.id, userId } })
        : Promise.resolve(0),
      prisma.roomNextSession.findUnique({ where: { roomId: auth.room.id } }),
      prisma.roomAttendanceConfirmation.findMany({
        where: { roomId: auth.room.id },
        select: { userId: true, status: true },
      }),
      prisma.roomMember.findMany({
        where: { roomId: auth.room.id, leftAt: null },
        select: { userId: true, role: true },
      }),
      prisma.roomAnnouncement.findFirst({
        where: { roomId: auth.room.id, isPinned: true },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, content: true, updatedAt: true },
      }),
      prisma.roomCommunicationState.findUnique({ where: { roomId: auth.room.id } }),
      prisma.roomActionQueueItem.findMany({
        where: { roomId: auth.room.id, status: { in: ['WAITING', 'ACTIVE'] } },
        orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        take: 5,
        select: { id: true, kind: true, status: true, label: true, targetUserId: true, requesterUserId: true },
      }),
      prisma.roomRecruitmentProfile.findUnique({ where: { roomId: auth.room.id } }),
      canUseKpTools
        ? prisma.roomJoinApplication.count({ where: { roomId: auth.room.id, status: 'PENDING' } })
        : Promise.resolve(0),
      canUseKpTools
        ? prisma.roomInvitation.count({ where: { roomId: auth.room.id, status: 'PENDING' } })
        : Promise.resolve(0),
    ]);

    const activeAttendance = activeMembers.map(member => {
      const entry = attendance.find(item => item.userId === member.userId);
      return { status: entry?.status ?? 'PENDING' };
    });
    const clueCounts = clueStats.reduce<Record<string, number>>((acc, item) => {
      acc[item.visibility] = item._count._all;
      return acc;
    }, {});
    const npcCounts = npcStats.reduce<Record<string, number>>((acc, item) => {
      acc[item.visibility] = item._count._all;
      return acc;
    }, {});
    const waitingQueue = queue.filter(item => item.status === 'WAITING');
    const activeQueue = queue.filter(item => item.status === 'ACTIVE');

    res.json({
      role: auth.role,
      lifecycle: auth.lifecycle,
      canUseKpTools,
      focus: focus
        ? {
            lastRecap: focus.lastRecap,
            currentObjective: focus.currentObjective,
            unresolvedQuestionCount: parseArray(focus.unresolvedQuestions).length,
            pinnedMessage: focus.pinnedMessage,
            updatedAt: focus.updatedAt.toISOString(),
          }
        : null,
      investigation: {
        publicClueCount: clueCounts.PUBLIC ?? 0,
        kpOnlyClueCount: canUseKpTools ? clueCounts.KP_ONLY ?? 0 : undefined,
        publicNpcCount: npcCounts.PUBLIC ?? 0,
        kpOnlyNpcCount: canUseKpTools ? npcCounts.KP_ONLY ?? 0 : undefined,
        sceneCount: sceneStats._count._all,
        pinnedLogCount: pinnedLogs,
        recentPublicLogs: recentPublicLogs.map(entry => ({
          ...entry,
          createdAt: entry.createdAt.toISOString(),
        })),
        kpPrivateNoteCount: canUseKpTools ? kpPrivateNotesCount : undefined,
      },
      coordination: {
        nextSession: nextSession
          ? {
              scheduledAt: nextSession.scheduledAt?.toISOString() ?? null,
              timezone: nextSession.timezone,
              title: nextSession.title,
              status: nextSession.status,
              note: nextSession.note,
              updatedAt: nextSession.updatedAt.toISOString(),
            }
          : null,
        attendanceSummary: countBy(activeAttendance, {
          PENDING: 0,
          AVAILABLE: 0,
          LEAVE: 0,
          TENTATIVE: 0,
        }),
        activeMemberCount: activeMembers.length,
        pinnedAnnouncement: pinnedAnnouncement
          ? {
              ...pinnedAnnouncement,
              updatedAt: pinnedAnnouncement.updatedAt.toISOString(),
            }
          : null,
      },
      communication: {
        currentTopic: communicationState?.currentTopic ?? '',
        spotlightUserId: communicationState?.spotlightUserId ?? null,
        keeperPrompt: canUseKpTools ? communicationState?.keeperPrompt ?? '' : undefined,
        waitingQueueCount: waitingQueue.length,
        activeQueueCount: activeQueue.length,
        queuePreview: queue,
      },
      recruitment: {
        status: recruitmentProfile?.status ?? 'CLOSED',
        headline: recruitmentProfile?.headline ?? '',
        pendingApplicationCount: canUseKpTools ? pendingApplicationsCount : undefined,
        pendingInvitationCount: canUseKpTools ? pendingInvitationsCount : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
}

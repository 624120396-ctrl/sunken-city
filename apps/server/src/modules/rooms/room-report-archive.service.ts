import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';

export interface RoomReportArchiveRoom {
  id: string;
  roomId: string;
  name: string;
  creatorId: string;
  createdAt: Date;
  roomRun: null | {
    lifecycle: string;
    finishedAt: Date | null;
  };
  members: Array<{
    userId: string;
    role: string;
    leftAt: Date | null;
  }>;
  reports: Array<{
    id: string;
    title: string;
    summary: string | null;
    createdAt: Date;
  }>;
  investigation: {
    publicClueCount: number;
    publicNpcCount: number;
    sceneCount: number;
    publicLogCount: number;
  };
}

export interface RoomReportArchiveItem {
  roomId: string;
  roomName: string;
  myRole: 'OWNER_KP' | 'ASSISTANT_KP' | 'PLAYER' | 'OBSERVER';
  lifecycle: string;
  createdAt: string;
  finishedAt: string | null;
  report: null | {
    id: string;
    title: string;
    summary: string;
    createdAt: string;
    link: string;
  };
  investigation: {
    publicClueCount: number;
    publicNpcCount: number;
    sceneCount: number;
    publicLogCount: number;
  };
}

function deriveArchiveRole(room: RoomReportArchiveRoom, userId: string): RoomReportArchiveItem['myRole'] {
  if (room.creatorId === userId) return 'OWNER_KP';
  const member = room.members.find(entry => entry.userId === userId);
  if (member?.role === 'KP') return 'ASSISTANT_KP';
  if (member?.role === 'OBSERVER') return 'OBSERVER';
  return 'PLAYER';
}

export function buildRoomReportArchiveView(
  rooms: RoomReportArchiveRoom[],
  userId: string
): RoomReportArchiveItem[] {
  return rooms.map(room => {
    const report = room.reports[0] ?? null;
    return {
      roomId: room.roomId,
      roomName: room.name,
      myRole: deriveArchiveRole(room, userId),
      lifecycle: room.roomRun?.lifecycle ?? (report ? 'FINISHED' : 'PREPARING'),
      createdAt: room.createdAt.toISOString(),
      finishedAt: room.roomRun?.finishedAt?.toISOString() ?? null,
      report: report ? {
        id: report.id,
        title: report.title,
        summary: report.summary ?? '',
        createdAt: report.createdAt.toISOString(),
        link: `/rooms/${room.roomId}/report`,
      } : null,
      investigation: room.investigation,
    };
  });
}

function countRowsByRoomId(rows: Array<{ roomId: string; _count: { _all: number } }>) {
  return new Map(rows.map(row => [row.roomId, row._count._all]));
}

export async function getMyRoomReportArchive(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId || (req as any).userId;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: '请先登录' });
      return;
    }

    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { members: { some: { userId } } },
          { roomRun: { participants: { some: { userId } } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: {
        id: true,
        roomId: true,
        name: true,
        creatorId: true,
        createdAt: true,
        roomRun: {
          select: {
            lifecycle: true,
            finishedAt: true,
          },
        },
        members: {
          select: {
            userId: true,
            role: true,
            leftAt: true,
          },
        },
      },
    });

    const roomIds = rooms.map(room => room.roomId);
    const reports = roomIds.length > 0
      ? await prisma.sessionReport.findMany({
          where: { roomId: { in: roomIds } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            roomId: true,
            title: true,
            summary: true,
            createdAt: true,
          },
        })
      : [];
    const reportsByRoomId = new Map<string, typeof reports>();
    for (const report of reports) {
      const list = reportsByRoomId.get(report.roomId) ?? [];
      list.push(report);
      reportsByRoomId.set(report.roomId, list);
    }
    const dbRoomIds = rooms.map(room => room.id);
    const [clueCounts, npcCounts, sceneCounts, logCounts] = dbRoomIds.length > 0
      ? await Promise.all([
          prisma.investigationClue.groupBy({
            by: ['roomId'],
            where: { roomId: { in: dbRoomIds }, visibility: 'PUBLIC' },
            _count: { _all: true },
          }),
          prisma.investigationNpc.groupBy({
            by: ['roomId'],
            where: { roomId: { in: dbRoomIds }, visibility: 'PUBLIC' },
            _count: { _all: true },
          }),
          prisma.investigationScene.groupBy({
            by: ['roomId'],
            where: { roomId: { in: dbRoomIds } },
            _count: { _all: true },
          }),
          prisma.investigationLogEntry.groupBy({
            by: ['roomId'],
            where: { roomId: { in: dbRoomIds }, visibility: 'PUBLIC' },
            _count: { _all: true },
          }),
        ])
      : [[], [], [], []];
    const clueCountByRoomId = countRowsByRoomId(clueCounts);
    const npcCountByRoomId = countRowsByRoomId(npcCounts);
    const sceneCountByRoomId = countRowsByRoomId(sceneCounts);
    const logCountByRoomId = countRowsByRoomId(logCounts);

    res.json({
      archives: buildRoomReportArchiveView(
        rooms.map(room => ({
          ...room,
          reports: reportsByRoomId.get(room.roomId) ?? [],
          investigation: {
            publicClueCount: clueCountByRoomId.get(room.id) ?? 0,
            publicNpcCount: npcCountByRoomId.get(room.id) ?? 0,
            sceneCount: sceneCountByRoomId.get(room.id) ?? 0,
            publicLogCount: logCountByRoomId.get(room.id) ?? 0,
          },
        })),
        userId
      ),
    });
  } catch (error) {
    next(error);
  }
}

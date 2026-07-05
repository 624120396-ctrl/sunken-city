import { prisma } from '../../config/database';
import { requireRoomCapability } from './room-auth';

function parseJsonArray(raw: string | null | undefined): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function publicChecklist(raw: string) {
  return parseJsonArray(raw).filter(item => item && item.public !== false);
}

function publicMaterialLinks(raw: string) {
  return parseJsonArray(raw).filter(item => item && item.public !== false);
}

export async function buildPlayerVisibleRoomAiContext(roomId: string, userId: string | undefined) {
  const auth = await requireRoomCapability(roomId, userId, 'canViewPublicContent');
  const roomDbId = auth.room.id;

  const [
    clues,
    npcs,
    scenes,
    timeline,
    sessionPrep,
    currentFocus,
    ownBinding,
  ] = await Promise.all([
    prisma.investigationClue.findMany({
      where: { roomId: roomDbId, visibility: 'PUBLIC' },
      orderBy: [{ revealedAt: 'desc' }, { createdAt: 'desc' }],
      take: 40,
      select: { id: true, title: true, content: true, source: true, status: true, revealedAt: true, createdAt: true },
    }),
    prisma.investigationNpc.findMany({
      where: { roomId: roomDbId, visibility: 'PUBLIC' },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: { id: true, name: true, publicProfile: true, status: true, avatarUrl: true, revealedAt: true },
    }),
    prisma.investigationScene.findMany({
      where: { roomId: roomDbId },
      orderBy: [{ isCurrent: 'desc' }, { sortOrder: 'asc' }, { updatedAt: 'desc' }],
      take: 30,
      select: { id: true, title: true, publicSummary: true, atmosphere: true, imageUrl: true, isCurrent: true, sortOrder: true },
    }),
    prisma.investigationLogEntry.findMany({
      where: { roomId: roomDbId, visibility: 'PUBLIC' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, eventType: true, title: true, content: true, isPinned: true, createdAt: true },
    }),
    prisma.roomSessionPrep.findUnique({
      where: { roomId: roomDbId },
      select: { scheduledAt: true, checklist: true, publicNotes: true, materialLinks: true, updatedAt: true },
    }),
    prisma.roomCurrentFocus.findUnique({
      where: { roomId: roomDbId },
      select: { lastRecap: true, currentObjective: true, unresolvedQuestions: true, pinnedMessage: true, updatedAt: true },
    }),
    userId
      ? prisma.roomMember.findFirst({
          where: { roomId: roomDbId, userId, leftAt: null },
          include: {
            character: {
              select: {
                id: true,
                name: true,
                occupation: true,
                hp: true,
                mp: true,
                san: true,
                avatarUrl: true,
                portraitUrl: true,
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    scope: 'PLAYER_VISIBLE',
    sourceVersion: 'room-ai-context-v1',
    generatedAt: new Date().toISOString(),
    room: {
      id: auth.room.roomId,
      name: auth.room.name,
      description: auth.room.description,
      atmosphere: auth.room.atmosphere,
      sceneDesc: auth.room.sceneDesc,
      lifecycle: auth.lifecycle,
      myRole: auth.role,
    },
    currentFocus: currentFocus
      ? {
          lastRecap: currentFocus.lastRecap,
          currentObjective: currentFocus.currentObjective,
          unresolvedQuestions: parseJsonArray(currentFocus.unresolvedQuestions),
          pinnedMessage: currentFocus.pinnedMessage,
          updatedAt: currentFocus.updatedAt.toISOString(),
        }
      : null,
    sessionPrep: sessionPrep
      ? {
          scheduledAt: sessionPrep.scheduledAt?.toISOString() ?? null,
          checklist: publicChecklist(sessionPrep.checklist),
          publicNotes: sessionPrep.publicNotes,
          materialLinks: publicMaterialLinks(sessionPrep.materialLinks),
          updatedAt: sessionPrep.updatedAt.toISOString(),
        }
      : null,
    ownCharacter: ownBinding?.character
      ? {
          id: ownBinding.character.id,
          name: ownBinding.character.name,
          occupation: ownBinding.character.occupation,
          hp: ownBinding.character.hp,
          mp: ownBinding.character.mp,
          san: ownBinding.character.san,
          avatarUrl: ownBinding.character.avatarUrl,
          portraitUrl: ownBinding.character.portraitUrl,
        }
      : null,
    publicClues: clues.map(clue => ({
      ...clue,
      revealedAt: clue.revealedAt?.toISOString() ?? null,
      createdAt: clue.createdAt.toISOString(),
    })),
    publicNpcs: npcs.map(npc => ({
      ...npc,
      revealedAt: npc.revealedAt?.toISOString() ?? null,
    })),
    publicScenes: scenes,
    publicTimeline: timeline.map(entry => ({
      ...entry,
      createdAt: entry.createdAt.toISOString(),
    })),
    excludedSources: [
      'kpPrivateNotes',
      'privateMessages',
      'hiddenClues',
      'kpOnlyNpcs',
      'keeperSceneNotes',
      'adminData',
      'otherPlayersPrivateBindings',
    ],
  };
}

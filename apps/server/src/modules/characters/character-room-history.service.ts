export interface CharacterRoomHistoryParticipant {
  id: string;
  role: string;
  participationStatus: string;
  joinedRunAt: Date;
  leftRunAt: Date | null;
  roomRun: {
    lifecycle: string;
    startedAt: Date | null;
    finishedAt: Date | null;
    room: {
      roomId: string;
      name: string;
    };
    settlements: Array<{
      status: string;
      outcome: string;
      hpFinal: number | null;
      mpFinal: number | null;
      sanFinal: number | null;
    }>;
  };
}

export interface CharacterRoomHistoryReport {
  id: string;
  title: string;
  summary: string | null;
  createdAt: Date;
}

export interface CharacterRoomHistoryItem {
  participantId: string;
  roomId: string;
  roomName: string;
  role: string;
  lifecycle: string;
  participationStatus: string;
  joinedRunAt: string;
  leftRunAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  report: null | {
    id: string;
    title: string;
    summary: string;
    createdAt: string;
    link: string;
  };
  settlement: null | {
    status: string;
    outcome: string;
    hpFinal: number | null;
    mpFinal: number | null;
    sanFinal: number | null;
  };
}

export function buildCharacterRoomHistoryView(
  participants: CharacterRoomHistoryParticipant[],
  reportsByRoomId: Map<string, CharacterRoomHistoryReport>
): CharacterRoomHistoryItem[] {
  return participants.map(participant => {
    const room = participant.roomRun.room;
    const report = reportsByRoomId.get(room.roomId) ?? null;
    const settlement = participant.roomRun.settlements[0] ?? null;

    return {
      participantId: participant.id,
      roomId: room.roomId,
      roomName: room.name,
      role: participant.role,
      lifecycle: participant.roomRun.lifecycle,
      participationStatus: participant.participationStatus,
      joinedRunAt: participant.joinedRunAt.toISOString(),
      leftRunAt: participant.leftRunAt?.toISOString() ?? null,
      startedAt: participant.roomRun.startedAt?.toISOString() ?? null,
      finishedAt: participant.roomRun.finishedAt?.toISOString() ?? null,
      report: report ? {
        id: report.id,
        title: report.title,
        summary: report.summary ?? '',
        createdAt: report.createdAt.toISOString(),
        link: `/rooms/${room.roomId}/report`,
      } : null,
      settlement: settlement ? {
        status: settlement.status,
        outcome: settlement.outcome,
        hpFinal: settlement.hpFinal,
        mpFinal: settlement.mpFinal,
        sanFinal: settlement.sanFinal,
      } : null,
    };
  });
}

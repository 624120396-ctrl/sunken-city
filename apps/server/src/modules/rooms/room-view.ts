import {
  capabilitiesFor,
  deriveLifecycle,
  deriveRoomRole,
  RoomCapabilities,
  RoomRoleView,
} from './room-auth';

type RoomAuthMember = {
  id: string;
  role: string;
  characterId: string | null;
  leftAt: Date | null;
};

type RoomAuthViewInput = {
  room: {
    creatorId: string;
    status?: string | null;
  };
  userId?: string;
  member?: RoomAuthMember | null;
  lifecycle?: string | null;
};

type RoomJoinMode = 'KP' | 'PLAYER' | 'OBSERVER' | 'NONE';

export function buildRoomAuthView(input: RoomAuthViewInput): {
  myRole: RoomRoleView;
  myCapabilities: RoomCapabilities;
  myBinding: {
    roomMemberId: string | null;
    characterId: string | null;
    joinMode: RoomJoinMode;
  };
  lifecycle: string;
} {
  const lifecycle = deriveLifecycle(input.room.status, input.lifecycle);
  const myRole = deriveRoomRole({
    creatorId: input.room.creatorId,
    userId: input.userId,
    member: input.member,
  });
  const myCapabilities = capabilitiesFor(myRole, lifecycle);

  const joinMode: RoomJoinMode =
    myRole === 'OWNER_KP' || myRole === 'ASSISTANT_KP'
      ? 'KP'
      : myRole === 'PLAYER'
        ? 'PLAYER'
        : myRole === 'OBSERVER'
          ? 'OBSERVER'
          : 'NONE';

  return {
    myRole,
    myCapabilities,
    myBinding: {
      roomMemberId: input.member?.id || null,
      characterId: input.member?.characterId || null,
      joinMode,
    },
    lifecycle,
  };
}

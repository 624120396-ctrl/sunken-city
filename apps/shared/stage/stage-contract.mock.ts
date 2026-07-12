import {
  STAGE_CONTRACT_VERSION,
  StageCommandEnvelope,
  StageStatusProjection,
  StageSnapshot,
} from './stage-contract';

export const mockStageSnapshots: Record<'mainRoom' | 'subRoom' | 'privateThread', StageSnapshot> = {
  mainRoom: {
    contractVersion: STAGE_CONTRACT_VERSION,
    channel: { id: 'stage-main-room-1', kind: 'MAIN_ROOM', roomId: 'room-public-id' },
    revision: 3,
    projection: {
      contractVersion: STAGE_CONTRACT_VERSION,
      channel: { id: 'stage-main-room-1', kind: 'MAIN_ROOM', roomId: 'room-public-id' },
      revision: 3,
      serverTime: '2026-07-12T01:00:00.000Z',
      viewer: { userId: 'kp-1', kind: 'KP', roomRole: 'OWNER_KP' },
      capabilities: {
        canUseStage: true,
        canControlOwnStageActor: true,
        canManageStage: true,
        canManageStageAssets: true,
        canExportStageReplay: true,
      },
      scene: { title: '黑水港码头', backgroundAssetId: 'asset-bg-1', themePackId: 'theme-default' },
      actors: [
        {
          actorId: 'actor-pl-1',
          actorKind: 'PLAYER_CHARACTER',
          ownerUserId: 'pl-1',
          characterId: 'char-1',
          name: '林雾',
          zone: 'left',
          entered: true,
          expression: 'calm',
          visibility: 'PUBLIC',
        },
        {
          actorId: 'actor-npc-1',
          actorKind: 'NPC',
          name: '码头巡夜人',
          zone: 'right',
          entered: true,
          expression: 'doubt',
          visibility: 'PUBLIC',
        },
      ],
      assetRefs: [
        {
          assetId: 'asset-bg-1',
          kind: 'BACKGROUND',
          version: 1,
          proxyUrl: '/api/rooms/room-public-id/stage/assets/asset-bg-1/proxy',
          width: 1920,
          height: 1080,
        },
      ],
    },
  },
  subRoom: {
    contractVersion: STAGE_CONTRACT_VERSION,
    channel: {
      id: 'stage-sub-1',
      kind: 'SUB_ROOM',
      roomId: 'room-public-id',
      subRoomId: 'sub-room-1',
      parentChannelId: 'stage-main-room-1',
    },
    revision: 1,
    projection: {
      contractVersion: STAGE_CONTRACT_VERSION,
      channel: {
        id: 'stage-sub-1',
        kind: 'SUB_ROOM',
        roomId: 'room-public-id',
        subRoomId: 'sub-room-1',
        parentChannelId: 'stage-main-room-1',
      },
      revision: 1,
      serverTime: '2026-07-12T01:01:00.000Z',
      viewer: { userId: 'pl-1', kind: 'PLAYER', roomRole: 'PLAYER' },
      capabilities: {
        canUseStage: true,
        canControlOwnStageActor: true,
        canManageStage: false,
        canManageStageAssets: false,
        canExportStageReplay: false,
      },
      scene: { title: '仓库背门', backgroundAssetId: 'asset-bg-2', themePackId: 'theme-default' },
      actors: [
        {
          actorId: 'actor-pl-1',
          actorKind: 'PLAYER_CHARACTER',
          ownerUserId: 'pl-1',
          characterId: 'char-1',
          name: '林雾',
          zone: 'center',
          entered: true,
          visibility: 'PUBLIC',
        },
      ],
      assetRefs: [
        {
          assetId: 'asset-bg-2',
          kind: 'BACKGROUND',
          version: 1,
          proxyUrl: '/api/rooms/room-public-id/stage/assets/asset-bg-2/proxy',
          width: 1920,
          height: 1080,
        },
      ],
    },
  },
  privateThread: {
    contractVersion: STAGE_CONTRACT_VERSION,
    channel: {
      id: 'stage-private-1',
      kind: 'PRIVATE_THREAD',
      roomId: 'room-public-id',
      privateThreadId: 'thread-pl1-kp',
    },
    revision: 1,
    projection: {
      contractVersion: STAGE_CONTRACT_VERSION,
      channel: {
        id: 'stage-private-1',
        kind: 'PRIVATE_THREAD',
        roomId: 'room-public-id',
        privateThreadId: 'thread-pl1-kp',
      },
      revision: 1,
      serverTime: '2026-07-12T01:02:00.000Z',
      viewer: { userId: 'pl-1', kind: 'PLAYER', roomRole: 'PLAYER' },
      capabilities: {
        canUseStage: true,
        canControlOwnStageActor: true,
        canManageStage: false,
        canManageStageAssets: false,
        canExportStageReplay: false,
      },
      scene: { title: '私密耳语', themePackId: 'theme-default' },
      actors: [
        {
          actorId: 'actor-pl-1-private',
          actorKind: 'PLAYER_CHARACTER',
          ownerUserId: 'pl-1',
          characterId: 'char-1',
          name: '林雾',
          zone: 'left',
          entered: true,
          action: 'whisper',
          visibility: 'PRIVATE_TARGETS',
        },
      ],
      assetRefs: [],
    },
  },
};

/** D1-B status fixture: the channel list is already server-side access filtered. */
export const mockStageStatus: StageStatusProjection = {
  contractVersion: STAGE_CONTRACT_VERSION,
  stageEnabled: true,
  enabled: true,
  roomStageEnabled: true,
  globalEnabled: true,
  viewer: { userId: 'kp-1', kind: 'KP', roomRole: 'OWNER_KP' },
  capabilities: {
    canUseStage: true,
    canControlOwnStageActor: true,
    canManageStage: true,
    canManageStageAssets: true,
    canExportStageReplay: true,
  },
  channels: [
    {
      channel: mockStageSnapshots.mainRoom.channel,
      status: 'ACTIVE',
      revision: mockStageSnapshots.mainRoom.revision,
      scope: { type: 'ROOM' },
      display: { label: '主舞台', description: '房间全体可见的公开舞台' },
    },
    {
      channel: mockStageSnapshots.subRoom.channel,
      status: 'ACTIVE',
      revision: mockStageSnapshots.subRoom.revision,
      scope: { type: 'SUB_ROOM', subRoomId: 'sub-room-1' },
      display: { label: '仓库背门', description: '已加入成员可见的子房间舞台' },
    },
    {
      channel: mockStageSnapshots.privateThread.channel,
      status: 'ACTIVE',
      revision: mockStageSnapshots.privateThread.revision,
      scope: { type: 'PRIVATE_THREAD', privateThreadId: 'thread-pl1-kp' },
      display: { label: '私密耳语', description: '私密参与者可见的舞台' },
    },
  ],
};

export const mockStageCommandEnvelope: StageCommandEnvelope = {
  contractVersion: STAGE_CONTRACT_VERSION,
  commandId: 'cmd-perform-1',
  channelId: 'stage-main-room-1',
  expectedRevision: 3,
  commandType: 'ACTOR_PERFORM',
  payload: { actorId: 'actor-pl-1', action: 'nod', expression: 'calm' },
};

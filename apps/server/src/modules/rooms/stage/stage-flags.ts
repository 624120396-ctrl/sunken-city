export const STAGE_CONTRACT_VERSION = 'stage.d1a.v1.1' as const;

export function stageGlobalEnabled() {
  return process.env.ROOM_STAGE_ENABLED === 'true';
}

export function canAcceptStageCommands(input: { globalEnabled: boolean; roomStageEnabled: boolean }) {
  return input.globalEnabled && input.roomStageEnabled;
}

export function buildStageStatus(input: {
  globalEnabled: boolean;
  roomStageEnabled: boolean;
  canUseStage: boolean;
  canControlOwnStageActor?: boolean;
  canManageStage: boolean;
  canManageStageAssets?: boolean;
  canExportStageReplay?: boolean;
  viewer?: { userId: string; kind: 'KP' | 'PLAYER' | 'OBSERVER'; roomRole: string };
  channels?: unknown[];
}) {
  const commandEnabled = canAcceptStageCommands({
    globalEnabled: input.globalEnabled,
    roomStageEnabled: input.roomStageEnabled,
  });

  return {
    contractVersion: STAGE_CONTRACT_VERSION,
    stageEnabled: commandEnabled,
    enabled: commandEnabled && input.canUseStage,
    roomStageEnabled: input.roomStageEnabled,
    globalEnabled: input.globalEnabled,
    viewer: input.viewer ?? { userId: '', kind: 'OBSERVER' as const, roomRole: 'UNKNOWN' },
    capabilities: {
      canUseStage: input.canUseStage,
      canControlOwnStageActor: input.canControlOwnStageActor ?? false,
      canManageStage: input.canManageStage,
      canManageStageAssets: input.canManageStageAssets ?? false,
      canExportStageReplay: input.canExportStageReplay ?? false,
    },
    channels: input.channels ?? [],
  };
}

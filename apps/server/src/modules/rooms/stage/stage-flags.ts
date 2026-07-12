export const STAGE_CONTRACT_VERSION = 'stage.d1a.v1' as const;

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
  canManageStage: boolean;
}) {
  const commandEnabled = canAcceptStageCommands({
    globalEnabled: input.globalEnabled,
    roomStageEnabled: input.roomStageEnabled,
  });

  return {
    contractVersion: STAGE_CONTRACT_VERSION,
    enabled: commandEnabled && input.canUseStage,
    roomStageEnabled: input.roomStageEnabled,
    globalEnabled: input.globalEnabled,
    capabilities: {
      canUseStage: input.canUseStage,
      canManageStage: input.canManageStage,
    },
  };
}

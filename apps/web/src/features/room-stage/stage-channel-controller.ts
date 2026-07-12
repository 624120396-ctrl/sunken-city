import type { StageCapabilitiesProjection, StageCommandType, StageSnapshot } from '../../../../shared/stage/stage-contract';

export function selectNewerSnapshot(current: StageSnapshot | undefined, next: StageSnapshot) {
  if (!current || next.channel.id !== current.channel.id || next.revision <= current.revision) return undefined;
  return next;
}

export function canDispatchStageCommand(capabilities: StageCapabilitiesProjection, commandType: StageCommandType) {
  if (!capabilities.canUseStage) return false;
  if (commandType === 'ACTOR_ENTER' || commandType === 'ACTOR_EXIT' || commandType === 'ACTOR_PERFORM') return capabilities.canControlOwnStageActor || capabilities.canManageStage;
  return capabilities.canManageStage;
}

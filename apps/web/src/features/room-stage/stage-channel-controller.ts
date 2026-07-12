import type { StageCapabilitiesProjection, StageCommandType, StageSnapshot, StageStatusProjection } from '../../../../shared/stage/stage-contract';

export function isStageUsable(status: StageStatusProjection | undefined) {
  return Boolean(status?.stageEnabled && status.enabled && status.capabilities.canUseStage);
}

export function selectActiveChannel(status: StageStatusProjection, current?: string) {
  if (!isStageUsable(status)) return undefined;
  return status.channels.some((entry) => entry.channel.id === current && entry.status === 'ACTIVE')
    ? current
    : status.channels.find((entry) => entry.status === 'ACTIVE')?.channel.id;
}

export function selectNewerSnapshot(current: StageSnapshot | undefined, next: StageSnapshot) {
  if (!current || next.channel.id !== current.channel.id || next.revision <= current.revision) return undefined;
  return next;
}

export function canDispatchStageCommand(capabilities: StageCapabilitiesProjection, commandType: StageCommandType) {
  if (!capabilities.canUseStage) return false;
  if (commandType === 'ACTOR_ENTER' || commandType === 'ACTOR_EXIT' || commandType === 'ACTOR_PERFORM') return capabilities.canControlOwnStageActor || capabilities.canManageStage;
  return capabilities.canManageStage;
}

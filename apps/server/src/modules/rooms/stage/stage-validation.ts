const CONTRACT_VERSION = 'stage.d1a.v1.1';
const ID_MAX_LENGTH = 128;
const TEXT_LIMITS = {
  sceneTitle: 120,
  sceneDescription: 2_000,
  action: 80,
  expression: 80,
  messageDraft: 2_000,
} as const;
const STAGE_ZONES = new Set(['far-left', 'left', 'center', 'right', 'far-right', 'backstage']);

type ValidationResult = { ok: true; envelope: Record<string, unknown> } | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validId(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= ID_MAX_LENGTH;
}

function validOptionalText(value: unknown, maxLength: number) {
  return value === undefined || (typeof value === 'string' && value.length <= maxLength);
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function validateMessageDraft(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !exactKeys(value, ['content', 'targetUserId', 'mode'])) return 'messageDraft contains unsupported fields';
  if (typeof value.content !== 'string' || value.content.trim().length === 0 || value.content.length > TEXT_LIMITS.messageDraft) return 'messageDraft.content is invalid';
  if (value.targetUserId !== undefined && !validId(value.targetUserId)) return 'messageDraft.targetUserId is invalid';
  if (value.mode !== 'PUBLIC' && value.mode !== 'PRIVATE') return 'messageDraft.mode is invalid';
  if (value.mode === 'PRIVATE' && !value.targetUserId) return 'messageDraft.targetUserId is required for PRIVATE mode';
  return undefined;
}

function invalidPayload(commandType: string, payload: unknown): string | undefined {
  if (!isRecord(payload)) return `${commandType} payload must be an object`;
  switch (commandType) {
    case 'ACTOR_ENTER':
      if (!exactKeys(payload, ['actorId', 'zone', 'expression', 'action'])) return 'ACTOR_ENTER payload contains unsupported fields';
      if (!validId(payload.actorId) || typeof payload.zone !== 'string' || !STAGE_ZONES.has(payload.zone)) return 'ACTOR_ENTER payload is invalid';
      return validOptionalText(payload.expression, TEXT_LIMITS.expression) && validOptionalText(payload.action, TEXT_LIMITS.action) ? undefined : 'ACTOR_ENTER payload is invalid';
    case 'ACTOR_EXIT':
      if (!exactKeys(payload, ['actorId'])) return 'ACTOR_EXIT payload contains unsupported fields';
      return validId(payload.actorId) ? undefined : 'ACTOR_EXIT payload is invalid';
    case 'ACTOR_PERFORM':
      if (!exactKeys(payload, ['actorId', 'action', 'expression'])) return 'ACTOR_PERFORM payload contains unsupported fields';
      if (!validId(payload.actorId) || typeof payload.action !== 'string' || payload.action.trim().length === 0 || payload.action.length > TEXT_LIMITS.action) return 'ACTOR_PERFORM payload is invalid';
      return validOptionalText(payload.expression, TEXT_LIMITS.expression) ? undefined : 'ACTOR_PERFORM payload is invalid';
    case 'SCENE_SET':
      if (!exactKeys(payload, ['title', 'description', 'backgroundAssetId', 'bgmAssetId', 'ambienceAssetId', 'themePackId'])) return 'SCENE_SET payload contains unsupported fields';
      if (typeof payload.title !== 'string' || payload.title.trim().length === 0 || payload.title.length > TEXT_LIMITS.sceneTitle) return 'SCENE_SET payload is invalid';
      if (!validOptionalText(payload.description, TEXT_LIMITS.sceneDescription)) return 'SCENE_SET payload is invalid';
      return ['backgroundAssetId', 'bgmAssetId', 'ambienceAssetId', 'themePackId'].every((key) => payload[key] === undefined || validId(payload[key])) ? undefined : 'SCENE_SET payload is invalid';
    case 'SCENE_CLEAR':
      if (!exactKeys(payload, ['clear'])) return 'SCENE_CLEAR payload contains unsupported fields';
      return payload.clear === 'SCENE' ? undefined : 'SCENE_CLEAR payload is invalid';
    case 'CHANNEL_ENABLE':
    case 'CHANNEL_DISABLE':
      return exactKeys(payload, []) ? undefined : `${commandType} payload must be empty`;
    default:
      return 'commandType is invalid';
  }
}

/** Runtime validation mirrors the public discriminated command union exactly. */
export function validateStageCommandEnvelope(value: unknown): ValidationResult {
  if (!isRecord(value)) return { ok: false, message: 'Stage command envelope must be an object' };
  if (!exactKeys(value, ['contractVersion', 'commandId', 'channelId', 'expectedRevision', 'commandType', 'payload', 'messageDraft'])) {
    return { ok: false, message: 'Stage command envelope contains unsupported fields' };
  }
  if (value.contractVersion !== CONTRACT_VERSION) return { ok: false, message: '舞台契约版本不匹配' };
  if (!validId(value.commandId) || !validId(value.channelId) || !Number.isSafeInteger(value.expectedRevision) || (value.expectedRevision as number) < 0) {
    return { ok: false, message: 'Stage command envelope identity or revision is invalid' };
  }
  if (typeof value.commandType !== 'string') return { ok: false, message: 'commandType is invalid' };
  const payloadMessage = invalidPayload(value.commandType, value.payload);
  if (payloadMessage) return { ok: false, message: payloadMessage };
  const messageDraftError = validateMessageDraft(value.messageDraft);
  return messageDraftError ? { ok: false, message: messageDraftError } : { ok: true, envelope: value };
}

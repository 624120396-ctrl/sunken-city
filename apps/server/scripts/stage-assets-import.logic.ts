type ActiveMember = { userId: string; leftAt: Date | null };

export function validateStageAssetImportAccess(input: {
  uploadedById: string;
  visibility: string;
  targetUserIds: string[];
  members: ActiveMember[];
}) {
  const activeUserIds = new Set(input.members.filter((member) => !member.leftAt).map((member) => member.userId));
  if (!activeUserIds.has(input.uploadedById)) throw new Error('uploaded-by must be an active member of the target room');
  const targetUserIds = [...new Set(input.targetUserIds)];
  if (input.visibility === 'PRIVATE_TARGETS' && targetUserIds.length === 0) throw new Error('PRIVATE_TARGETS requires --target-user');
  if (targetUserIds.some((userId) => !activeUserIds.has(userId))) throw new Error('PRIVATE_TARGETS users must be active members of the target room');
  return targetUserIds;
}

type ImportRequest = { roomId: string; kind: string; hash: string; uploadedById: string; visibility: string; targetUserIds: string[] };
type ExistingAsset = ImportRequest & { id: string; metadataJson: string };

export function stageAssetImportKey(kind: string, hash: string) {
  return `${kind}:${hash}`;
}

function metadataTargets(value: string) {
  try {
    const parsed = JSON.parse(value) as { targetUserIds?: unknown };
    return Array.isArray(parsed.targetUserIds) && parsed.targetUserIds.every((item) => typeof item === 'string')
      ? [...new Set(parsed.targetUserIds)].sort()
      : [];
  } catch {
    throw new Error('existing stage asset metadata is invalid');
  }
}

export function decideStageAssetImport(input: { existing: ExistingAsset[]; request: ImportRequest }) {
  if (input.existing.length === 0) return { action: 'create' as const };
  if (input.existing.length > 1) throw new Error('multiple active stage assets share this room-kind-hash; refusing to import');
  const existing = input.existing[0];
  const requestedTargets = [...new Set(input.request.targetUserIds)].sort();
  const sameAcl = existing.uploadedById === input.request.uploadedById
    && existing.visibility === input.request.visibility
    && JSON.stringify(metadataTargets(existing.metadataJson)) === JSON.stringify(requestedTargets);
  if (!sameAcl) throw new Error('existing stage asset conflicts with requested ownership or visibility');
  return { action: 'reuse' as const, assetId: existing.id };
}

export type GlobalRecruitmentStatus = 'OPEN' | 'CLOSED' | 'EXPIRED';
export type GlobalRecruitmentContactVisibility = 'PUBLIC' | 'LOGGED_IN' | 'RESPONDERS';

export function getEffectiveGlobalRecruitmentStatus(
  status: string,
  expiresAt: Date | null | undefined,
  now = new Date()
): GlobalRecruitmentStatus {
  if (status === 'CLOSED') return 'CLOSED';
  if (expiresAt && expiresAt.getTime() < now.getTime()) return 'EXPIRED';
  return 'OPEN';
}

export function canManageGlobalRecruitmentPost(authorId: string, viewerId?: string | null) {
  return Boolean(viewerId && authorId === viewerId);
}

export function canViewGlobalRecruitmentContact(input: {
  authorId: string;
  visibility: string;
  viewerId?: string | null;
  hasOwnResponse: boolean;
}) {
  if (input.visibility === 'PUBLIC') return true;
  if (!input.viewerId) return false;
  if (input.visibility === 'LOGGED_IN') return true;
  return input.authorId === input.viewerId || input.hasOwnResponse;
}

export function normalizeGlobalRecruitmentTags(tags: string[] | undefined, max = 12) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const tag of tags ?? []) {
    const value = tag.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    normalized.push(value);
    if (normalized.length >= max) break;
  }

  return normalized;
}

export function shouldCreateGlobalRecruitmentRoomInvitation(input: {
  sourceType: string;
  roomId?: string | null;
  nextResponseStatus: string;
}) {
  return input.sourceType === 'INTERNAL_ROOM'
    && Boolean(input.roomId)
    && input.nextResponseStatus === 'ACCEPTED';
}

export function requiresRoomForInternalGlobalRecruitment(sourceType: string, roomPublicId?: string | null) {
  return sourceType !== 'INTERNAL_ROOM' || Boolean(roomPublicId?.trim());
}

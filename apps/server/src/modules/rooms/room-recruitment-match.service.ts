export type RecruitmentStyleMatchLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';

export interface RecruitmentStyleMatch {
  score: number | null;
  level: RecruitmentStyleMatchLevel;
  matchedTags: string[];
  unmatchedTags: string[];
  summary: string;
}

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const clean = tag.trim();
    const key = normalizeTag(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

export function buildRecruitmentStyleMatch(
  roomStyleTags: string[],
  preferredStyleTags: string[]
): RecruitmentStyleMatch {
  const roomTags = uniqueTags(roomStyleTags);
  const preferredTags = uniqueTags(preferredStyleTags);

  if (preferredTags.length === 0) {
    return {
      score: null,
      level: 'UNKNOWN',
      matchedTags: [],
      unmatchedTags: [],
      summary: '申请人未填写风格偏好，需要 KP 通过留言和沟通判断。',
    };
  }

  if (roomTags.length === 0) {
    return {
      score: null,
      level: 'UNKNOWN',
      matchedTags: [],
      unmatchedTags: preferredTags,
      summary: '房间尚未填写风格标签，暂时无法自动判断匹配度。',
    };
  }

  const roomKeys = new Set(roomTags.map(normalizeTag));
  const matchedTags = preferredTags.filter(tag => roomKeys.has(normalizeTag(tag)));
  const unmatchedTags = preferredTags.filter(tag => !roomKeys.has(normalizeTag(tag)));
  const score = Math.round((matchedTags.length / preferredTags.length) * 100);
  const level: RecruitmentStyleMatchLevel = score >= 70 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW';
  const summary = level === 'HIGH'
    ? '风格匹配度较高，可以优先考虑。'
    : level === 'MEDIUM'
      ? '风格匹配度中等，建议 KP 再确认预期。'
      : '风格匹配度偏低，建议 KP 重点确认跑团预期。';

  return {
    score,
    level,
    matchedTags,
    unmatchedTags,
    summary,
  };
}

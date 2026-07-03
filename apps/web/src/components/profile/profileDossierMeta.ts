export type ProfileBadgeTone = 'gold' | 'ocean';

export interface ProfileRoleBadge {
  label: string;
  title: string;
  tone: ProfileBadgeTone;
}

export interface ProfileForumStats {
  postCount: number;
  replyCount: number;
  likeCountReceived: number;
  bestReplyCount: number;
}

export interface ProfileDossierStatsInput {
  coins?: number;
  stardust?: number;
  forumStats?: ProfileForumStats | null;
}

export interface ProfileDossierStat {
  key: 'coins' | 'stardust' | 'posts' | 'replies' | 'likes' | 'bestReplies';
  label: string;
  value: number;
  tone: 'gold' | 'madness' | 'ocean';
}

export type ProfileInventoryGroupKey = 'titles' | 'relics' | 'frames' | 'supplies';

export interface ProfileInventoryGroup {
  key: ProfileInventoryGroupKey;
  label: string;
  count: number;
  description: string;
}

interface ProfileInventoryItemLike {
  item?: {
    category?: string | null;
  } | null;
}

export function getProfileRoleBadge(isAdmin?: boolean): ProfileRoleBadge {
  if (isAdmin) {
    return {
      label: '管理员',
      title: '深渊档案馆执钥人',
      tone: 'gold',
    };
  }

  return {
    label: '调查员',
    title: '雾港登记调查员',
    tone: 'ocean',
  };
}

export function getProfileDossierStats(input: ProfileDossierStatsInput): ProfileDossierStat[] {
  const forumStats = input.forumStats;

  return [
    { key: 'coins', label: '锈蚀硬币', value: input.coins ?? 0, tone: 'gold' },
    { key: 'stardust', label: '虚银', value: input.stardust ?? 0, tone: 'madness' },
    { key: 'posts', label: '主题帖', value: forumStats?.postCount ?? 0, tone: 'ocean' },
    { key: 'replies', label: '回复', value: forumStats?.replyCount ?? 0, tone: 'ocean' },
    { key: 'likes', label: '获赞', value: forumStats?.likeCountReceived ?? 0, tone: 'gold' },
    { key: 'bestReplies', label: '最佳回复', value: forumStats?.bestReplyCount ?? 0, tone: 'gold' },
  ];
}

export function getProfileInventoryGroups(items: ProfileInventoryItemLike[]): ProfileInventoryGroup[] {
  const groups = {
    titles: 0,
    relics: 0,
    frames: 0,
    supplies: 0,
  };

  for (const item of items) {
    const category = item.item?.category;
    if (category === 'title') {
      groups.titles += 1;
    } else if (category === 'relic') {
      groups.relics += 1;
    } else if (category === 'avatar_frame') {
      groups.frames += 1;
    } else {
      groups.supplies += 1;
    }
  }

  return [
    { key: 'titles', label: '身份印记', count: groups.titles, description: '用于展示身份、称号与仪式标识。' },
    { key: 'relics', label: '异常遗物', count: groups.relics, description: '与调查员绑定的深海遗留物。' },
    { key: 'frames', label: '头像框', count: groups.frames, description: '用于强化个人档案外观。' },
    { key: 'supplies', label: '随身物资', count: groups.supplies, description: '可消耗、可装备或通用收藏。' },
  ];
}

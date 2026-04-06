import { apiFetch } from '@lib/api';

export interface Rank {
  id: string;
  level: number;
  name: string;
  expRequired: number;
  description: string;
  privileges: string[];
  icon: string;
  color: string;
}

export interface Title {
  id: string;
  key: string;
  name: string;
  description: string;
  category: 'exploration' | 'combat' | 'social' | 'madness' | 'special' | 'hidden';
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';
  condition: string;
  conditionCode: string | null;
  expReward: number;
  icon: string;
  color: string;
  hint: string | null;
  isHidden: boolean;
  unlockedAt?: string;
}

export interface UserRankInfo {
  id: string;
  email: string;
  nickname: string;
  exp: number;
  isAdmin: boolean;
  rank: {
    level: number;
    name: string;
    icon: string;
    color: string;
    expRequired: number;
    description: string;
  };
  nextRank: {
    level: number;
    name: string;
    expRequired: number;
  } | null;
  progress: number;
  expToNext: number;
  displayBadge: {
    type: 'rank' | 'title';
    name: string;
    icon: string;
    color: string;
  };
  titleStats: {
    unlockedCount: number;
    displayedTitleKey: string | null;
  };
}

export interface UserTitleWithConfig {
  id: string;
  userId: string;
  titleKey: string;
  unlockedAt: string;
  unlockedBy: string;
  grantedBy: string | null;
  note: string | null;
  titleConfig: Title;
}

// 获取所有位阶
export async function getRanks(): Promise<Rank[]> {
  const res = await apiFetch('/ranks');
  if (!res.ok) throw new Error('获取位阶列表失败');
  const data = await res.json();
  return data.data.ranks;
}

// 获取所有印记
export async function getTitles(params?: { category?: string; rarity?: string }): Promise<Title[]> {
  const query = new URLSearchParams();
  if (params?.category) query.set('category', params.category);
  if (params?.rarity) query.set('rarity', params.rarity);
  
  const res = await apiFetch(`/titles?${query.toString()}`);
  if (!res.ok) throw new Error('获取印记列表失败');
  const data = await res.json();
  return data.data.titles;
}

// 获取当前用户的位阶和印记信息
export async function getMyRankTitle(): Promise<UserRankInfo> {
  const res = await apiFetch('/users/me/rank-title');
  if (!res.ok) throw new Error('获取用户信息失败');
  const data = await res.json();
  return data.data;
}

// 获取当前用户已解锁的印记
export async function getMyTitles(): Promise<UserTitleWithConfig[]> {
  const res = await apiFetch('/users/me/titles');
  if (!res.ok) throw new Error('获取印记失败');
  const data = await res.json();
  return data.data.titles;
}

// 设置当前展示的印记
export async function setDisplayedTitle(titleKey: string | null): Promise<void> {
  const res = await apiFetch('/users/me/displayed-title', {
    method: 'PUT',
    body: JSON.stringify({ titleKey }),
  });
  if (!res.ok) throw new Error('设置展示印记失败');
}

// ========== 管理后台API ==========

export interface AdminRank extends Rank {
  userCount: number;
}

export interface AdminTitle extends Title {
  unlockedCount: number;
}

// 获取位阶列表（管理端）
export async function getAdminRanks(): Promise<AdminRank[]> {
  const res = await apiFetch('/admin/ranks');
  if (!res.ok) throw new Error('获取位阶列表失败');
  const data = await res.json();
  return data.data.ranks;
}

// 创建位阶
export async function createRank(data: Omit<Rank, 'id'>): Promise<Rank> {
  const res = await apiFetch('/admin/ranks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('创建位阶失败');
  const result = await res.json();
  return result.data.rank;
}

// 更新位阶
export async function updateRank(id: string, data: Partial<Rank>): Promise<Rank> {
  const res = await apiFetch(`/admin/ranks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('更新位阶失败');
  const result = await res.json();
  return result.data.rank;
}

// 删除位阶
export async function deleteRank(id: string): Promise<void> {
  const res = await apiFetch(`/admin/ranks/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('删除位阶失败');
}

// 获取印记列表（管理端）
export async function getAdminTitles(): Promise<{ titles: AdminTitle[]; total: number; stats: any }> {
  const res = await apiFetch('/admin/titles');
  if (!res.ok) throw new Error('获取印记列表失败');
  const data = await res.json();
  return data.data;
}

// 创建印记
export async function createTitle(data: Omit<Title, 'id'>): Promise<Title> {
  const res = await apiFetch('/admin/titles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('创建印记失败');
  const result = await res.json();
  return result.data.title;
}

// 更新印记
export async function updateTitle(id: string, data: Partial<Title>): Promise<Title> {
  const res = await apiFetch(`/admin/titles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('更新印记失败');
  const result = await res.json();
  return result.data.title;
}

// 删除印记
export async function deleteTitle(id: string): Promise<void> {
  const res = await apiFetch(`/admin/titles/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('删除印记失败');
}

// 获取用户印记信息（管理端）
export async function getUserTitlesAdmin(userId: string): Promise<any> {
  const res = await apiFetch(`/admin/users/${userId}/titles`);
  if (!res.ok) throw new Error('获取用户印记信息失败');
  const data = await res.json();
  return data.data;
}

// 授予印记
export async function grantTitle(userId: string, titleKey: string, note?: string): Promise<void> {
  const res = await apiFetch(`/admin/users/${userId}/titles`, {
    method: 'POST',
    body: JSON.stringify({ titleKey, note }),
  });
  if (!res.ok) throw new Error('授予印记失败');
}

// 撤销印记
export async function revokeTitle(userId: string, titleKey: string): Promise<void> {
  const res = await apiFetch(`/admin/users/${userId}/titles/${titleKey}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('撤销印记失败');
}

// 调整用户灵魂碎片
export async function adjustUserExp(userId: string, amount: number, reason: string): Promise<any> {
  const res = await apiFetch(`/admin/users/${userId}/exp/adjust`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason }),
  });
  if (!res.ok) throw new Error('调整灵魂碎片失败');
  return res.json();
}
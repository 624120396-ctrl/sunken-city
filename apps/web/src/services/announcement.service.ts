import { apiFetch } from '@lib/api';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

export interface AnnouncementPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function getAnnouncements(page = 1, limit = 10): Promise<{ announcements: Announcement[]; pagination: AnnouncementPagination }> {
  const res = await apiFetch(`/announcements?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('获取公告失败');
  const data = await res.json();
  return data.data;
}

export async function getAnnouncement(id: string): Promise<Announcement> {
  const res = await apiFetch(`/announcements/${id}`);
  if (!res.ok) throw new Error('获取公告详情失败');
  const data = await res.json();
  return data.data.announcement;
}

// 管理端
export async function getAdminAnnouncements(page = 1, limit = 20): Promise<{ announcements: Announcement[]; pagination: AnnouncementPagination }> {
  const res = await apiFetch(`/admin/announcements?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('获取公告列表失败');
  const data = await res.json();
  return data.data;
}

export async function createAnnouncement(data: Partial<Announcement>): Promise<Announcement> {
  const res = await apiFetch('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('创建公告失败');
  const json = await res.json();
  return json.data.announcement;
}

export async function updateAnnouncement(id: string, data: Partial<Announcement>): Promise<Announcement> {
  const res = await apiFetch(`/admin/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('更新公告失败');
  const json = await res.json();
  return json.data.announcement;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const res = await apiFetch(`/admin/announcements/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('删除公告失败');
}

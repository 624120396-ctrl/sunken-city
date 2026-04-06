export interface UploadResponse {
  id: string;
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

export interface UploadItem extends UploadResponse {
  createdAt: string;
}

import { useAuthStore } from '@stores/auth.store';

export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/uploads', {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: '上传失败' }));
    throw new Error(data.message || data.error?.message || '上传失败');
  }

  const data = await res.json();
  return data.data;
}

export async function getUploads(page = 1, limit = 20): Promise<{ uploads: UploadItem[]; pagination: any }> {
  const res = await fetch(`/api/uploads?page=${page}&limit=${limit}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('获取上传记录失败');
  const data = await res.json();
  return data.data;
}

export async function deleteUpload(id: string): Promise<void> {
  const res = await fetch(`/api/uploads/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('删除失败');
}

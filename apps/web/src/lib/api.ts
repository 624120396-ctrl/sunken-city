import { useAuthStore } from '@stores/auth.store';

// API基础URL
const API_BASE_URL = '/api';

// 带认证的fetch封装
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const { token } = useAuthStore.getState();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  return response;
}

// 处理API响应
export async function handleApiResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || '请求失败');
  }
  
  return data.data;
}
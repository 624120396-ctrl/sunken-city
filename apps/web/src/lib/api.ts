import { useAuthStore } from '@stores/auth.store';

// API基础URL
const API_BASE_URL = '/api';

// 是否正在处理401（防止重复跳转）
let isHandling401 = false;

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

  // 自动处理401：令牌过期或无效
  if (response.status === 401 && !isHandling401) {
    isHandling401 = true;
    const { clearAuth } = useAuthStore.getState();
    clearAuth();
    // 延迟跳转，避免 race condition
    setTimeout(() => {
      window.location.href = '/login?expired=1';
    }, 100);
  }
  
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
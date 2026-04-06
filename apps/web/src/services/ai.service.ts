import { apiFetch } from '@lib/api';

export interface GenerateImageResponse {
  url: string;
  size: string;
}

export async function generateImage(prompt: string, size = '1920x1920'): Promise<GenerateImageResponse> {
  const res = await apiFetch('/ai/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, size }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: '生成失败' }));
    throw new Error(data.message || data.error?.message || '生成失败');
  }

  const data = await res.json();
  return data.data;
}

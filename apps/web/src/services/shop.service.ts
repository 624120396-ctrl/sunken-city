import { apiFetch } from '@lib/api';

export interface ShopItem {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: 'coin' | 'stardust';
  rarity: string;
  iconUrl?: string;
}

export interface InventoryItem {
  id: string;
  userId: string;
  itemKey: string;
  quantity: number;
  purchasedAt: string;
  item?: ShopItem;
}

async function handleShopResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({ message: '请求异常' }));
  if (!res.ok || !data.success) {
    throw new Error(data.message || data.error?.message || '请求失败');
  }
  return data.data;
}

export async function getShopItems(category?: string): Promise<{ items: ShopItem[] }> {
  const url = category ? `/shop/items?category=${category}` : '/shop/items';
  const res = await apiFetch(url);
  return handleShopResponse(res);
}

export async function purchaseItem(key: string, quantity = 1): Promise<any> {
  const res = await apiFetch(`/shop/items/${key}/purchase`, {
    method: 'POST',
    body: JSON.stringify({ quantity }),
  });
  return handleShopResponse(res);
}

export async function getInventory(): Promise<{ inventory: InventoryItem[] }> {
  const res = await apiFetch('/shop/inventory');
  return handleShopResponse(res);
}

export async function equipItem(itemKey: string | null): Promise<any> {
  const res = await apiFetch('/shop/equip', {
    method: 'POST',
    body: JSON.stringify({ itemKey }),
  });
  return handleShopResponse(res);
}

export interface OnlineUser {
  userId: string;
  nickname: string;
  avatarUrl?: string;
}

export async function dailyCheckin(): Promise<{ user: any; reward: any }> {
  const res = await apiFetch('/auth/daily-checkin', {
    method: 'POST',
  });
  return handleShopResponse(res);
}

export async function getOnlineUsers(): Promise<{ count: number; users: OnlineUser[] }> {
  const res = await apiFetch('/online-users');
  return handleShopResponse(res);
}

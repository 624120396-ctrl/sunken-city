import { apiFetch } from '@lib/api';

export interface AdminRelic {
  id: string;
  characterId: string;
  userId: string;
  relicKey: string;
  source: string;
  durability: number | null;
  maxDurability: number | null;
  usedCount: number;
  isEquipped: boolean;
  acquiredAt: string;
  tradeLockId: string | null;
  meta?: {
    key: string;
    name: string;
    description: string;
    rarity: string;
  };
  userNickname: string;
  characterName: string;
  isOnSale: boolean;
}

export interface AdminTrade {
  id: string;
  sellerId: string;
  sellerName: string;
  relicKey: string;
  price: number;
  currency: 'coin' | 'stardust';
  status: 'active' | 'sold' | 'cancelled';
  buyerId: string | null;
  buyerName: string | null;
  createdAt: string;
  soldAt: string | null;
  meta?: {
    key: string;
    name: string;
    description: string;
    rarity: string;
  };
  relicSnapshot?: {
    durability: number | null;
    maxDurability: number | null;
    usedCount: number;
    isEquipped: boolean;
  } | null;
}

export async function getAdminRelics(params?: {
  page?: number;
  limit?: number;
  search?: string;
  relicKey?: string;
}) {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.search) search.set('search', params.search);
  if (params?.relicKey) search.set('relicKey', params.relicKey);
  const res = await apiFetch(`/admin/relics?${search.toString()}`);
  return res.json();
}

export async function deleteAdminRelic(id: string) {
  const res = await apiFetch(`/admin/relics/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function grantAdminRelic(data: {
  characterId: string;
  relicKey: string;
  durability?: number;
  maxDurability?: number;
}) {
  const res = await apiFetch('/admin/relics/grant', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getAdminTrades(params?: {
  page?: number;
  limit?: number;
  status?: string;
  relicKey?: string;
}) {
  const search = new URLSearchParams();
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));
  if (params?.status) search.set('status', params.status);
  if (params?.relicKey) search.set('relicKey', params.relicKey);
  const res = await apiFetch(`/admin/relics/trades?${search.toString()}`);
  return res.json();
}

export async function cancelAdminTrade(tradeId: string) {
  const res = await apiFetch(`/admin/relics/trades/${tradeId}/cancel`, { method: 'POST' });
  return res.json();
}

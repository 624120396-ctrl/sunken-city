import { apiFetch, handleApiResponse } from '@lib/api';

export async function fetchMarketListings(filters?: { relicKey?: string; sellerId?: string }) {
  const params = new URLSearchParams();
  if (filters?.relicKey) params.set('relicKey', filters.relicKey);
  if (filters?.sellerId) params.set('sellerId', filters.sellerId);
  const res = await apiFetch(`/relics/market/listings?${params.toString()}`);
  return handleApiResponse<{ listings: any[] }>(res);
}

export async function createListing(characterRelicId: string, price: number, currency: string) {
  const res = await apiFetch('/relics/market/listings', {
    method: 'POST',
    body: JSON.stringify({ characterRelicId, price, currency }),
  });
  return handleApiResponse<{ data: any }>(res);
}

export async function cancelListing(tradeId: string) {
  const res = await apiFetch(`/relics/market/listings/${tradeId}`, {
    method: 'DELETE',
  });
  return handleApiResponse<{ data: any }>(res);
}

export async function buyListing(tradeId: string, characterId: string) {
  const res = await apiFetch(`/relics/market/listings/${tradeId}/buy`, {
    method: 'POST',
    body: JSON.stringify({ characterId }),
  });
  return handleApiResponse<{ data: any }>(res);
}

export async function fetchCharacterRelics(characterId: string) {
  const res = await apiFetch(`/relics/character/${characterId}`);
  return handleApiResponse<{ relics: any[] }>(res);
}

export async function fetchRelicRegistry() {
  const res = await apiFetch('/relics/registry');
  return handleApiResponse<{ relics: any[] }>(res);
}

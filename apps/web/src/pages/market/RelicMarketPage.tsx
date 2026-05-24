import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { Tooltip } from '@components/ui/Tooltip';
import { useState } from 'react';
import { useAuthStore } from '@stores/auth.store';
import {
  fetchMarketListings,
  fetchCharacterRelics,
  fetchRelicRegistry,
  createListing,
  cancelListing,
  buyListing,
} from '@services/relics.service';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Store, X, Plus, Coins, Sparkles } from 'lucide-react';
import { getRarityColorClass } from '@data/relics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@components/ui/Toast';

interface Listing {
  id: string;
  sellerId: string;
  sellerName: string;
  relicKey: string;
  price: number;
  currency: 'coin' | 'stardust';
  status: string;
  createdAt: string;
  meta?: {
    key: string;
    name: string;
    description: string;
    rarity: string;
  };
  relicSnapshot?: {
    durability?: number;
    maxDurability?: number;
    usedCount?: number;
  } | null;
}

async function fetchCharacters() {
  const res = await apiFetch('/characters');
  return handleApiResponse<{ characters: any[] }>(res);
}

export function RelicMarketPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'market' | 'mine'>('market');
  const [filterKey, setFilterKey] = useState('');

  // 上架 Modal
  const [showListModal, setShowListModal] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState('');
  const [selectedRelicId, setSelectedRelicId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [listCurrency, setListCurrency] = useState<'coin' | 'stardust'>('coin');

  // 购买 Modal
  const [buyTradeId, setBuyTradeId] = useState<string | null>(null);
  const [buyCharId, setBuyCharId] = useState('');

  // Queries
  const {
    data: marketData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['marketListings', filterKey],
    queryFn: () =>
      Promise.all([
        fetchMarketListings(filterKey ? { relicKey: filterKey } : undefined),
        fetchRelicRegistry(),
      ]),
    staleTime: 30 * 1000,
  });

  const [listingsRaw, registryRaw] = marketData ?? [{ listings: [] }, { relics: [] }];
  const allListings: Listing[] = listingsRaw.listings || [];
  const myListings = allListings.filter((l: Listing) => l.sellerId === user?.id);
  const listings = activeTab === 'market' ? allListings : myListings;

  const registryMap: Record<string, any> = {};
  (registryRaw.relics || []).forEach((r: any) => {
    registryMap[r.key] = r;
  });

  const { data: charactersData } = useQuery({
    queryKey: ['characters'],
    queryFn: fetchCharacters,
    staleTime: 60 * 1000,
  });
  const characters = charactersData?.characters || [];

  const { data: charRelicsData, isLoading: charRelicsLoading } = useQuery({
    queryKey: ['characterRelics', selectedCharId],
    queryFn: () => fetchCharacterRelics(selectedCharId),
    enabled: !!selectedCharId,
    staleTime: 30 * 1000,
  });
  const charRelics = (charRelicsData?.relics || []).filter((r: any) => !r.tradeLockId);

  // Mutations
  const listMutation = useMutation({
    mutationFn: () =>
      createListing(selectedRelicId, Number(listPrice), listCurrency),
    onSuccess: () => {
      setShowListModal(false);
      showToast('上架成功', 'success');
      queryClient.invalidateQueries({ queryKey: ['marketListings'] });
      setSelectedCharId('');
      setSelectedRelicId('');
      setListPrice('');
      setListCurrency('coin');
    },
    onError: (err: any) => {
      showToast(err.message || '上架失败', 'error');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (tradeId: string) => cancelListing(tradeId),
    onSuccess: () => {
      showToast('下架成功', 'success');
      queryClient.invalidateQueries({ queryKey: ['marketListings'] });
    },
    onError: (err: any) => {
      showToast(err.message || '下架失败', 'error');
    },
  });

  const buyMutation = useMutation({
    mutationFn: () => buyListing(buyTradeId!, buyCharId),
    onSuccess: () => {
      showToast('购买成功', 'success');
      setBuyTradeId(null);
      setBuyCharId('');
      queryClient.invalidateQueries({ queryKey: ['marketListings'] });
    },
    onError: (err: any) => {
      showToast(err.message || '购买失败', 'error');
    },
  });

  const handleOpenListModal = (charId?: string) => {
    setSelectedCharId(charId || '');
    setSelectedRelicId('');
    setListPrice('');
    setListCurrency('coin');
    setShowListModal(true);
  };

  const handleCharChange = (charId: string) => {
    setSelectedCharId(charId);
    setSelectedRelicId('');
  };

  const handleList = () => {
    if (!selectedRelicId || !listPrice || Number(listPrice) <= 0) return;
    listMutation.mutate();
  };

  const handleCancel = (tradeId: string) => {
    if (!confirm('确定下架该挂单吗？')) return;
    cancelMutation.mutate(tradeId);
  };

  const handleBuy = () => {
    if (!buyTradeId || !buyCharId) return;
    buyMutation.mutate();
  };

  const renderListingCard = (l: Listing, isMine = false) => {
    const meta = registryMap[l.relicKey] || l.meta;
    const dur =
      l.relicSnapshot?.durability ?? l.relicSnapshot?.maxDurability ?? null;
    const rarity = meta?.rarity || 'common';
    return (
      <div
        key={l.id}
        className={`rounded border bg-black/20 p-4 ${getRarityColorClass(rarity).split(' ')[1]}`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-base font-bold text-[#e8d4a0]">
                {meta?.name || l.relicKey}
              </div>
              <Tooltip content={({
                common: '普通 — 随处可见的遗物',
                uncommon: '罕见 — 不易获得，略有价值',
                rare: '稀有 — 珍贵的调查员遗物',
                epic: '史诗 — 传说级存在',
                legendary: '传说 — 深渊之主的馈赠'
              } as Record<string, string>)[rarity] || rarity}>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide border ${getRarityColorClass(rarity)} cursor-help`}
                >
                  {rarity}
                </span>
              </Tooltip>
            </div>
            <div className="mt-1 text-xs text-[#6b6558]">
              {meta?.description}
            </div>
            {dur !== null && (
              <div className="mt-1 text-xs text-[#8b8375]">
                耐久: {dur}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-lg font-bold text-[#c9a227]">
              {l.currency === 'coin' ? <Coins size={16} /> : <Sparkles size={16} />}
              {l.price}
            </div>
            <div className="text-xs text-[#6b6558]">
              {l.currency === 'coin' ? '锈蚀硬币' : '虚银'} · {l.sellerName}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-[#8b8375]">
            {new Date(l.createdAt).toLocaleString()}
          </span>
          {isMine ? (
            <button
              onClick={() => handleCancel(l.id)}
              disabled={cancelMutation.isPending}
              className="btn-v2 flex items-center gap-1 rounded bg-red-900/40 px-2 py-1 text-xs text-red-200 hover:bg-red-900/60 disabled:opacity-50"
            >
              <X size={12} /> 下架
            </button>
          ) : (
            <button
              onClick={() => {
                setBuyTradeId(l.id);
                setBuyCharId('');
              }}
              className="btn-v2 rounded bg-coc-gold px-3 py-1 text-xs font-bold text-coc-abyss hover:bg-coc-gold-glow"
            >
              购买
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Store size={24} className="text-[#c9a227]" />
          <h1 className="text-2xl font-serif font-bold">遗物市场</h1>
        </div>
        <button
          onClick={() => handleOpenListModal()}
          className="flex items-center gap-1 rounded bg-coc-gold px-3 py-2 text-sm font-bold text-coc-abyss hover:bg-coc-gold-glow"
        >
          <Plus size={16} /> 上架遗物
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 border-b border-[#3a3a3a]/40">
        <button
          onClick={() => setActiveTab('market')}
          className={`px-4 py-2 text-sm ${
            activeTab === 'market'
              ? 'border-b-2 border-[#a63848] text-coc-accent-red'
              : 'text-[#8b8375] hover:text-[#d4c5a8]'
          }`}
        >
          交易大厅
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`px-4 py-2 text-sm ${
            activeTab === 'mine'
              ? 'border-b-2 border-[#a63848] text-coc-accent-red'
              : 'text-[#8b8375] hover:text-[#d4c5a8]'
          }`}
        >
          我的挂单
        </button>
      </div>

      {activeTab === 'market' && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <select
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
              className="rounded border border-coc-void bg-black/20 px-3 py-1.5 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
            >
              <option value="">全部遗物</option>
              {Object.values(registryMap).map((r: any) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['marketListings'] })
              }
              className="btn-v2 coc-btn-secondary text-sm"
            >
              刷新
            </button>
          </div>
          {isLoading ? (
            <EmptyState
              icon={EmptyIcons.Shop}
              title="加载中..."
              size="sm"
              animate={false}
            />
          ) : error ? (
            <div className="py-12 text-center text-red-300">
              <p>加载失败，请稍后重试</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center text-[#6b6558]">
              <Store
                size={48}
                className="mx-auto mb-4 text-coc-text-secondary/50"
              />
              <p>暂无挂单</p>
              <p className="mt-1 text-xs">
                成为第一位在市场出售遗物的调查员
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {listings.map((l) => renderListingCard(l))}
            </div>
          )}
        </>
      )}

      {activeTab === 'mine' && (
        <>
          {myListings.length === 0 ? (
            <div className="py-12 text-center text-[#6b6558]">
              你没有正在出售的遗物
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {myListings.map((l) => renderListingCard(l, true))}
            </div>
          )}
        </>
      )}

      {/* 上架 Modal */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-lg border border-[#3a3a3a]/40 bg-black/20 p-6">
            <h3 className="mb-4 text-lg font-bold text-[#e8d4a0]">上架遗物</h3>
            <div className="mb-4">
              <label className="mb-1 block text-xs text-[#6b6558]">
                选择角色卡
              </label>
              <select
                value={selectedCharId}
                onChange={(e) => handleCharChange(e.target.value)}
                className="w-full rounded border border-coc-void bg-black/20 px-3 py-2 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
              >
                <option value="">请选择</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.occupation}
                  </option>
                ))}
              </select>
            </div>

            {selectedCharId && (
              <div className="mb-4">
                <label className="mb-1 block text-xs text-[#6b6558]">
                  选择遗物
                </label>
                {charRelicsLoading ? (
                  <div className="text-sm text-[#6b6558]">加载中...</div>
                ) : charRelics.length === 0 ? (
                  <div className="text-sm text-[#6b6558]">
                    该角色没有可交易的遗物
                  </div>
                ) : (
                  <select
                    value={selectedRelicId}
                    onChange={(e) => setSelectedRelicId(e.target.value)}
                    className="w-full rounded border border-coc-void bg-black/20 px-3 py-2 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
                  >
                    <option value="">请选择</option>
                    {charRelics.map((r) => {
                      const meta = registryMap[r.relicKey] || r.meta;
                      return (
                        <option key={r.id} value={r.id}>
                          {meta?.name || r.relicKey}
                          {r.durability != null
                            ? ` (耐久 ${r.durability})`
                            : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            )}

            <div className="mb-4 flex items-center gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[#6b6558]">
                  价格
                </label>
                <input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  min={1}
                  className="w-full rounded border border-coc-void bg-black/20 px-3 py-2 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
                />
              </div>
              <div className="w-32">
                <label className="mb-1 block text-xs text-[#6b6558]">
                  币种
                </label>
                <select
                  value={listCurrency}
                  onChange={(e) =>
                    setListCurrency(e.target.value as 'coin' | 'stardust')
                  }
                  className="w-full rounded border border-coc-void bg-black/20 px-3 py-2 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
                >
                  <option value="coin">锈蚀硬币</option>
                  <option value="stardust">虚银</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowListModal(false)}
                className="btn-v2 coc-btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={handleList}
                disabled={
                  !selectedRelicId ||
                  !listPrice ||
                  Number(listPrice) <= 0 ||
                  listMutation.isPending
                }
                className="rounded bg-coc-gold px-4 py-2 text-sm font-bold text-coc-abyss hover:bg-coc-gold-glow disabled:opacity-50"
              >
                {listMutation.isPending ? '上架中...' : '确认上架'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 购买 Modal */}
      {buyTradeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-[#3a3a3a]/40 bg-black/20 p-6">
            <h3 className="mb-4 text-lg font-bold text-[#e8d4a0]">购买遗物</h3>
            <p className="mb-3 text-sm text-[#6b6558]">
              请选择要接收该遗物的角色卡
            </p>
            <select
              value={buyCharId}
              onChange={(e) => setBuyCharId(e.target.value)}
              className="mb-4 w-full rounded border border-coc-void bg-black/20 px-3 py-2 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
            >
              <option value="">请选择</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.occupation}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setBuyTradeId(null);
                  setBuyCharId('');
                }}
                className="btn-v2 coc-btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={handleBuy}
                disabled={!buyCharId || buyMutation.isPending}
                className="rounded bg-coc-gold px-4 py-2 text-sm font-bold text-coc-abyss hover:bg-coc-gold-glow disabled:opacity-50"
              >
                {buyMutation.isPending ? '购买中...' : '确认购买'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

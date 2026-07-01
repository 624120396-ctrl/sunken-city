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
import { EconomyPageShell } from '@components/economy/EconomyPageShell';
import { Surface } from '@components/system';

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
      <Surface
        key={l.id}
        variant="panel"
        tone={rarity === 'legendary' || rarity === 'epic' ? 'blood' : rarity === 'rare' ? 'gold' : 'neutral'}
        padding="md"
        className={getRarityColorClass(rarity).split(' ')[1]}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-bold text-[#e8d4a0] break-words">
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
            <div className="mt-1 text-xs text-[#b0a898] line-clamp-2">
              {meta?.description}
            </div>
            {dur !== null && (
              <div className="mt-1 text-xs text-[#8b8375]">
                耐久: {dur}
              </div>
            )}
          </div>
          <div className="shrink-0 sm:text-right">
            <div className="flex items-center gap-1 text-lg font-bold text-[#c9a227] sm:justify-end">
              {l.currency === 'coin' ? <Coins size={16} /> : <Sparkles size={16} />}
              {l.price}
            </div>
            <div className="text-xs text-[#b0a898]">
              {l.currency === 'coin' ? '锈蚀硬币' : '虚银'} · {l.sellerName}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[#8b8375]">
            {new Date(l.createdAt).toLocaleString()}
          </span>
          {isMine ? (
            <button
              onClick={() => handleCancel(l.id)}
              disabled={cancelMutation.isPending}
              className="btn-v2 flex min-h-10 items-center justify-center gap-1 rounded bg-red-900/40 px-3 py-1.5 text-xs text-red-200 hover:bg-red-900/60 disabled:opacity-50"
            >
              <X size={12} /> 下架
            </button>
          ) : (
            <button
              onClick={() => {
                setBuyTradeId(l.id);
                setBuyCharId('');
              }}
              className="btn-v2 min-h-10 rounded bg-coc-gold px-4 py-1.5 text-xs font-bold text-coc-abyss hover:bg-coc-gold-glow"
            >
              购买
            </button>
          )}
        </div>
      </Surface>
    );
  };

  return (
    <EconomyPageShell
      active="market"
      eyebrow="relic exchange"
      title="遗物市场"
      description="调查员之间的遗物交易大厅。上架、购买和取消挂单仍使用原有交易接口。"
      meta={
        <div className="flex min-h-11 items-center justify-center gap-3 rounded-lg border border-[#3a3a3a]/45 bg-[#0f1016]/70 px-3 text-sm">
          <div className="flex items-center gap-1.5 text-[#e8d4a0]">
            <Coins size={16} className="text-[#c9a227]" />
            <span>{user?.coins ?? 0}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#e8d4a0]">
            <Sparkles size={16} className="text-purple-400" />
            <span>{user?.stardust ?? 0}</span>
          </div>
        </div>
      }
      action={
        <button
          onClick={() => handleOpenListModal()}
          className="btn-v2 flex min-h-11 items-center justify-center gap-1 rounded bg-coc-gold px-4 py-2 text-sm font-bold text-coc-abyss hover:bg-coc-gold-glow sm:w-auto"
        >
          <Plus size={16} /> 上架遗物
        </button>
      }
    >
      <div>

      <Surface variant="panel" padding="sm" className="mb-4 flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('market')}
          className={`min-h-11 shrink-0 px-4 py-2 text-sm ${
            activeTab === 'market'
              ? 'border-b-2 border-[#a63848] text-coc-accent-red'
              : 'text-[#8b8375] hover:text-[#d4c5a8]'
          }`}
        >
          交易大厅
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`min-h-11 shrink-0 px-4 py-2 text-sm ${
            activeTab === 'mine'
              ? 'border-b-2 border-[#a63848] text-coc-accent-red'
              : 'text-[#8b8375] hover:text-[#d4c5a8]'
          }`}
        >
          我的挂单
        </button>
      </Surface>

      {activeTab === 'market' && (
        <>
          <Surface variant="panel" padding="md" className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
              className="min-h-11 rounded border border-coc-void bg-black/45 px-3 py-1.5 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
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
              className="btn-v2 coc-btn-secondary min-h-11 text-sm"
            >
              刷新
            </button>
          </Surface>
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
          <Surface variant="elevated" padding="lg" className="w-full max-w-md">
            <h3 className="mb-4 text-lg font-bold text-[#e8d4a0]">上架遗物</h3>
            <div className="mb-4">
              <label className="mb-1 block text-xs text-[#b0a898]">
                选择角色卡
              </label>
              <select
                value={selectedCharId}
                onChange={(e) => handleCharChange(e.target.value)}
                className="min-h-11 w-full rounded border border-coc-void bg-black/45 px-3 py-2 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
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
                <label className="mb-1 block text-xs text-[#b0a898]">
                  选择遗物
                </label>
                {charRelicsLoading ? (
                  <div className="text-sm text-[#b0a898]">加载中...</div>
                ) : charRelics.length === 0 ? (
                  <div className="text-sm text-[#b0a898]">
                    该角色没有可交易的遗物
                  </div>
                ) : (
                  <select
                    value={selectedRelicId}
                    onChange={(e) => setSelectedRelicId(e.target.value)}
                    className="min-h-11 w-full rounded border border-coc-void bg-black/45 px-3 py-2 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
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

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-[#b0a898]">
                  价格
                </label>
                <input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  min={1}
                  className="min-h-11 w-full rounded border border-coc-void bg-black/45 px-3 py-2 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
                />
              </div>
              <div className="sm:w-36">
                <label className="mb-1 block text-xs text-[#b0a898]">
                  币种
                </label>
                <select
                  value={listCurrency}
                  onChange={(e) =>
                    setListCurrency(e.target.value as 'coin' | 'stardust')
                  }
                  className="min-h-11 w-full rounded border border-coc-void bg-black/45 px-3 py-2 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
                >
                  <option value="coin">锈蚀硬币</option>
                  <option value="stardust">虚银</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => setShowListModal(false)}
                className="btn-v2 coc-btn-secondary min-h-11 text-sm"
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
                className="btn-v2 min-h-11 rounded bg-coc-gold px-4 py-2 text-sm font-bold text-coc-abyss hover:bg-coc-gold-glow disabled:opacity-50"
              >
                {listMutation.isPending ? '上架中...' : '确认上架'}
              </button>
            </div>
          </Surface>
        </div>
      )}

      {/* 购买 Modal */}
      {buyTradeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Surface variant="elevated" padding="lg" className="w-full max-w-sm">
            <h3 className="mb-4 text-lg font-bold text-[#e8d4a0]">购买遗物</h3>
            <p className="mb-3 text-sm text-[#b0a898]">
              请选择要接收该遗物的角色卡
            </p>
            <select
              value={buyCharId}
              onChange={(e) => setBuyCharId(e.target.value)}
              className="mb-4 min-h-11 w-full rounded border border-coc-void bg-black/45 px-3 py-2 text-sm text-[#e8d4a0] focus:border-coc-gold focus:outline-none"
            >
              <option value="">请选择</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.occupation}
                </option>
              ))}
            </select>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={() => {
                  setBuyTradeId(null);
                  setBuyCharId('');
                }}
                className="btn-v2 coc-btn-secondary min-h-11 text-sm"
              >
                取消
              </button>
              <button
                onClick={handleBuy}
                disabled={!buyCharId || buyMutation.isPending}
                className="btn-v2 min-h-11 rounded bg-coc-gold px-4 py-2 text-sm font-bold text-coc-abyss hover:bg-coc-gold-glow disabled:opacity-50"
              >
                {buyMutation.isPending ? '购买中...' : '确认购买'}
              </button>
            </div>
          </Surface>
        </div>
      )}
      </div>
    </EconomyPageShell>
  );
}

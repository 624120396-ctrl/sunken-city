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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@components/ui/Toast';
import { EconomyPageShell } from '@components/economy/EconomyPageShell';
import { Surface } from '@components/system';
import { getMarketListingPresentation } from '@components/economy/marketListingMeta';

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
    const listingMeta = getMarketListingPresentation({
      rarity,
      currency: l.currency,
      price: l.price,
      durability: dur,
      sellerName: l.sellerName,
      isMine,
    });
    return (
      <article
        key={l.id}
        className="market-contract-card"
        data-contract-tone={listingMeta.tone}
      >
        <div className="market-contract-card__seal">{listingMeta.seal}</div>
        <div className="market-contract-card__header">
          <div className="min-w-0">
            <div className="market-contract-card__title-row">
              <h2>{meta?.name || l.relicKey}</h2>
              <Tooltip content={({
                common: '普通 — 随处可见的遗物',
                uncommon: '罕见 — 不易获得，略有价值',
                rare: '稀有 — 珍贵的调查员遗物',
                epic: '史诗 — 传说级存在',
                legendary: '传说 — 深渊之主的馈赠'
              } as Record<string, string>)[rarity] || rarity}>
                <span>{listingMeta.rarityLabel}</span>
              </Tooltip>
            </div>
            <p>{meta?.description}</p>
          </div>
          <div className="market-contract-card__price">
            <div>
              {l.currency === 'coin' ? <Coins size={16} /> : <Sparkles size={16} />}
              <strong>{listingMeta.priceLabel}</strong>
            </div>
            <span>{listingMeta.sellerLabel}</span>
          </div>
        </div>
        <div className="market-contract-card__footer">
          <div className="market-contract-card__meta">
            {listingMeta.durabilityLabel && <span>{listingMeta.durabilityLabel}</span>}
            <span>{listingMeta.currencyLabel}</span>
            <span>
            {new Date(l.createdAt).toLocaleString()}
            </span>
          </div>
          {isMine ? (
            <button
              onClick={() => handleCancel(l.id)}
              disabled={cancelMutation.isPending}
              className="market-contract-card__action market-contract-card__action--danger"
            >
              <X size={12} /> {listingMeta.actionLabel}
            </button>
          ) : (
            <button
              onClick={() => {
                setBuyTradeId(l.id);
                setBuyCharId('');
              }}
              className="market-contract-card__action"
            >
              {listingMeta.actionLabel}
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <EconomyPageShell
      active="market"
      eyebrow="RELIC EXCHANGE"
      title="遗物市场"
      description="遗物在掌心之外流转，契约上的金粉像沉睡鳞片一样发冷。"
      meta={
        <div className="economy-wallet-summary">
          <div>
            <Coins size={16} />
            <span>{user?.coins ?? 0}</span>
          </div>
          <div>
            <Sparkles size={16} />
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
      <div className="market-contracts">

      <Surface variant="panel" material="archive" padding="sm" className="market-contract-tabs">
        <button
          onClick={() => setActiveTab('market')}
          data-active={activeTab === 'market'}
        >
          交易大厅
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          data-active={activeTab === 'mine'}
        >
          我的挂单
        </button>
      </Surface>

      {activeTab === 'market' && (
        <>
          <Surface variant="panel" material="archive" padding="md" className="market-contract-filter">
            <select
              value={filterKey}
              onChange={(e) => setFilterKey(e.target.value)}
              className="market-contract-filter__select"
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
              className="market-contract-filter__refresh"
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
            <div className="market-contract-empty">
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
            <div className="market-contract-grid">
              {listings.map((l) => renderListingCard(l))}
            </div>
          )}
        </>
      )}

      {activeTab === 'mine' && (
        <>
          {myListings.length === 0 ? (
            <div className="market-contract-empty">
              你没有正在出售的遗物
            </div>
          ) : (
            <div className="market-contract-grid">
              {myListings.map((l) => renderListingCard(l, true))}
            </div>
          )}
        </>
      )}

      {/* 上架 Modal */}
      {showListModal && (
        <div className="economy-contract-modal">
          <Surface variant="elevated" material="relic" padding="lg" className="economy-contract-modal__card">
            <h3>上架遗物</h3>
            <div className="mb-4">
              <label className="economy-contract-label">
                选择角色卡
              </label>
              <select
                value={selectedCharId}
                onChange={(e) => handleCharChange(e.target.value)}
                className="economy-contract-input"
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
                <label className="economy-contract-label">
                  选择遗物
                </label>
                {charRelicsLoading ? (
                  <div className="economy-contract-note">加载中...</div>
                ) : charRelics.length === 0 ? (
                  <div className="economy-contract-note">
                    该角色没有可交易的遗物
                  </div>
                ) : (
                  <select
                    value={selectedRelicId}
                    onChange={(e) => setSelectedRelicId(e.target.value)}
                    className="economy-contract-input"
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
                <label className="economy-contract-label">
                  价格
                </label>
                <input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  min={1}
                  className="economy-contract-input"
                />
              </div>
              <div className="sm:w-36">
                <label className="economy-contract-label">
                  币种
                </label>
                <select
                  value={listCurrency}
                  onChange={(e) =>
                    setListCurrency(e.target.value as 'coin' | 'stardust')
                  }
                  className="economy-contract-input"
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
        <div className="economy-contract-modal">
          <Surface variant="elevated" material="relic" padding="lg" className="economy-contract-modal__card economy-contract-modal__card--compact">
            <h3>购买遗物</h3>
            <p className="economy-contract-note">
              请选择要接收该遗物的角色卡
            </p>
            <select
              value={buyCharId}
              onChange={(e) => setBuyCharId(e.target.value)}
              className="economy-contract-input mb-4"
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

import { useEffect, useState } from 'react';
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

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

export function RelicMarketPage() {
  const { user } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [registry, setRegistry] = useState<Record<string, any>>({});
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'market' | 'mine'>('market');
  const [filterKey, setFilterKey] = useState('');
  const [toast, setToast] = useState<ToastState | null>(null);

  // 上架 Modal
  const [showListModal, setShowListModal] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState('');
  const [charRelics, setCharRelics] = useState<any[]>([]);
  const [selectedRelicId, setSelectedRelicId] = useState('');
  const [listPrice, setListPrice] = useState('');
  const [listCurrency, setListCurrency] = useState<'coin' | 'stardust'>('coin');

  // 购买 Modal
  const [buyTradeId, setBuyTradeId] = useState<string | null>(null);
  const [buyCharId, setBuyCharId] = useState('');

  useEffect(() => {
    loadData();
    fetchCharacters();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [marketData, regData] = await Promise.all([
        fetchMarketListings(filterKey ? { relicKey: filterKey } : undefined),
        fetchRelicRegistry(),
      ]);
      const all = marketData.listings || [];
      setListings(all);
      setMyListings(all.filter((l: Listing) => l.sellerId === user?.id));
      const map: Record<string, any> = {};
      (regData.relics || []).forEach((r: any) => {
        map[r.key] = r;
      });
      setRegistry(map);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCharacters = async () => {
    try {
      const res = await apiFetch('/characters');
      const data = await handleApiResponse<{ characters: any[] }>(res);
      setCharacters(data.characters || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenListModal = async (charId?: string) => {
    setSelectedCharId(charId || '');
    setSelectedRelicId('');
    setListPrice('');
    setListCurrency('coin');
    setShowListModal(true);
    if (charId) {
      try {
        const data = await fetchCharacterRelics(charId);
        setCharRelics(
          (data.relics || []).filter((r: any) => !r.tradeLockId)
        );
      } catch (err) {
        console.error(err);
      }
    } else {
      setCharRelics([]);
    }
  };

  const handleCharChange = async (charId: string) => {
    setSelectedCharId(charId);
    setSelectedRelicId('');
    if (!charId) {
      setCharRelics([]);
      return;
    }
    try {
      const data = await fetchCharacterRelics(charId);
      setCharRelics(
        (data.relics || []).filter((r: any) => !r.tradeLockId)
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleList = async () => {
    if (!selectedRelicId || !listPrice || Number(listPrice) <= 0) return;
    try {
      await createListing(selectedRelicId, Number(listPrice), listCurrency);
      setShowListModal(false);
      setToast({ message: '上架成功', type: 'success' });
      loadData();
    } catch (err: any) {
      setToast({ message: err.message || '上架失败', type: 'error' });
    }
  };

  const handleCancel = async (tradeId: string) => {
    if (!confirm('确定下架该挂单吗？')) return;
    try {
      await cancelListing(tradeId);
      setToast({ message: '下架成功', type: 'success' });
      loadData();
    } catch (err: any) {
      setToast({ message: err.message || '下架失败', type: 'error' });
    }
  };

  const handleBuy = async () => {
    if (!buyTradeId || !buyCharId) return;
    try {
      await buyListing(buyTradeId, buyCharId);
      setToast({ message: '购买成功', type: 'success' });
      setBuyTradeId(null);
      setBuyCharId('');
      loadData();
    } catch (err: any) {
      setToast({ message: err.message || '购买失败', type: 'error' });
    }
  };

  const renderListingCard = (l: Listing, isMine = false) => {
    const meta = registry[l.relicKey] || l.meta;
    const dur =
      l.relicSnapshot?.durability ?? l.relicSnapshot?.maxDurability ?? null;
    const rarity = meta?.rarity || 'common';
    return (
      <div key={l.id} className={`rounded border bg-coc-bg-secondary p-4 ${getRarityColorClass(rarity).split(' ')[1]}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-base font-bold text-coc-parchment">
                {meta?.name || l.relicKey}
              </div>
              <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide border ${getRarityColorClass(rarity)}`}>
                {rarity}
              </span>
            </div>
            <div className="mt-1 text-xs text-coc-text-muted">{meta?.description}</div>
            {dur !== null && (
              <div className="mt-1 text-xs text-coc-text-secondary">耐久: {dur}</div>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-lg font-bold text-coc-gold">
              {l.currency === 'coin' ? <Coins size={16} /> : <Sparkles size={16} />}
              {l.price}
            </div>
            <div className="text-xs text-coc-text-muted">{l.sellerName}</div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-coc-text-secondary">{new Date(l.createdAt).toLocaleString()}</span>
          {isMine ? (
            <button
              onClick={() => handleCancel(l.id)}
              className="flex items-center gap-1 rounded bg-red-900/40 px-2 py-1 text-xs text-red-200 hover:bg-red-900/60"
            >
              <X size={12} /> 下架
            </button>
          ) : (
            <button
              onClick={() => {
                setBuyTradeId(l.id);
                setBuyCharId('');
              }}
              className="rounded bg-coc-gold px-3 py-1 text-xs font-bold text-coc-abyss hover:bg-coc-gold-glow"
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
          <Store size={24} className="text-coc-gold" />
          <h1 className="text-2xl font-serif font-bold">遗物市场</h1>
        </div>
        <button
          onClick={() => handleOpenListModal()}
          className="flex items-center gap-1 rounded bg-coc-gold px-3 py-2 text-sm font-bold text-coc-abyss hover:bg-coc-gold-glow"
        >
          <Plus size={16} /> 上架遗物
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 border-b border-coc-border">
        <button
          onClick={() => setActiveTab('market')}
          className={`px-4 py-2 text-sm ${
            activeTab === 'market'
              ? 'border-b-2 border-coc-accent-red text-coc-accent-red'
              : 'text-coc-text-secondary hover:text-coc-text-primary'
          }`}
        >
          交易大厅
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={`px-4 py-2 text-sm ${
            activeTab === 'mine'
              ? 'border-b-2 border-coc-accent-red text-coc-accent-red'
              : 'text-coc-text-secondary hover:text-coc-text-primary'
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
              className="rounded border border-coc-void bg-coc-bg-tertiary px-3 py-1.5 text-sm text-coc-parchment focus:border-coc-gold focus:outline-none"
            >
              <option value="">全部遗物</option>
              {Object.values(registry).map((r: any) => (
                <option key={r.key} value={r.key}>{r.name}</option>
              ))}
            </select>
            <button
              onClick={loadData}
              className="coc-btn-secondary text-sm"
            >
              刷新
            </button>
          </div>
          {loading ? (
            <div className="py-12 text-center text-coc-text-muted">加载中...</div>
          ) : listings.length === 0 ? (
            <div className="py-16 text-center text-coc-text-muted">
              <Store size={48} className="mx-auto mb-4 text-coc-text-secondary/50" />
              <p>暂无挂单</p>
              <p className="mt-1 text-xs">成为第一位在市场出售遗物的调查员</p>
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
            <div className="py-12 text-center text-coc-text-muted">你没有正在出售的遗物</div>
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
          <div className="w-full max-w-md rounded-lg border border-coc-border bg-coc-bg-secondary p-6">
            <h3 className="mb-4 text-lg font-bold text-coc-parchment">上架遗物</h3>
            <div className="mb-4">
              <label className="mb-1 block text-xs text-coc-text-muted">选择角色卡</label>
              <select
                value={selectedCharId}
                onChange={(e) => handleCharChange(e.target.value)}
                className="w-full rounded border border-coc-void bg-coc-bg-tertiary px-3 py-2 text-sm text-coc-parchment focus:border-coc-gold focus:outline-none"
              >
                <option value="">请选择</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.occupation}</option>
                ))}
              </select>
            </div>

            {selectedCharId && (
              <div className="mb-4">
                <label className="mb-1 block text-xs text-coc-text-muted">选择遗物</label>
                {charRelics.length === 0 ? (
                  <div className="text-sm text-coc-text-muted">该角色没有可交易的遗物</div>
                ) : (
                  <select
                    value={selectedRelicId}
                    onChange={(e) => setSelectedRelicId(e.target.value)}
                    className="w-full rounded border border-coc-void bg-coc-bg-tertiary px-3 py-2 text-sm text-coc-parchment focus:border-coc-gold focus:outline-none"
                  >
                    <option value="">请选择</option>
                    {charRelics.map((r) => {
                      const meta = registry[r.relicKey] || r.meta;
                      return (
                        <option key={r.id} value={r.id}>
                          {meta?.name || r.relicKey}
                          {r.durability != null ? ` (耐久 ${r.durability})` : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            )}

            <div className="mb-4 flex items-center gap-2">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-coc-text-muted">价格</label>
                <input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  min={1}
                  className="w-full rounded border border-coc-void bg-coc-bg-tertiary px-3 py-2 text-sm text-coc-parchment focus:border-coc-gold focus:outline-none"
                />
              </div>
              <div className="w-32">
                <label className="mb-1 block text-xs text-coc-text-muted">币种</label>
                <select
                  value={listCurrency}
                  onChange={(e) => setListCurrency(e.target.value as any)}
                  className="w-full rounded border border-coc-void bg-coc-bg-tertiary px-3 py-2 text-sm text-coc-parchment focus:border-coc-gold focus:outline-none"
                >
                  <option value="coin">硬币</option>
                  <option value="stardust">星尘</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowListModal(false)}
                className="coc-btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={handleList}
                disabled={!selectedRelicId || !listPrice || Number(listPrice) <= 0}
                className="rounded bg-coc-gold px-4 py-2 text-sm font-bold text-coc-abyss hover:bg-coc-gold-glow disabled:opacity-50"
              >
                确认上架
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 购买 Modal */}
      {buyTradeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-lg border border-coc-border bg-coc-bg-secondary p-6">
            <h3 className="mb-4 text-lg font-bold text-coc-parchment">购买遗物</h3>
            <p className="mb-3 text-sm text-coc-text-muted">请选择要接收该遗物的角色卡</p>
            <select
              value={buyCharId}
              onChange={(e) => setBuyCharId(e.target.value)}
              className="mb-4 w-full rounded border border-coc-void bg-coc-bg-tertiary px-3 py-2 text-sm text-coc-parchment focus:border-coc-gold focus:outline-none"
            >
              <option value="">请选择</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.occupation}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setBuyTradeId(null);
                  setBuyCharId('');
                }}
                className="coc-btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={handleBuy}
                disabled={!buyCharId}
                className="rounded bg-coc-gold px-4 py-2 text-sm font-bold text-coc-abyss hover:bg-coc-gold-glow disabled:opacity-50"
              >
                确认购买
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-[60] rounded border px-4 py-2 text-sm shadow-lg ${
            toast.type === 'success'
              ? 'border-green-500/50 bg-green-900/80 text-green-100'
              : 'border-red-500/50 bg-red-900/80 text-red-100'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

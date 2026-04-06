import { useEffect, useState } from 'react';
import { RuneBorder } from '@components/ui/RuneBorder';
import { RELIC_REGISTRY } from '@data/relics';
import {
  getAdminRelics,
  deleteAdminRelic,
  grantAdminRelic,
  getAdminTrades,
  cancelAdminTrade,
  type AdminRelic,
  type AdminTrade,
} from '@services/admin-relics.service';
import {
  Backpack,
  Store,
  Search,
  Trash2,
  X,
  Plus,
  Ban,
  Coins,
  Sparkles,
  Loader2,
  ScrollText,
} from 'lucide-react';

const rarityColors: Record<string, string> = {
  common: '#9ca3af',
  rare: '#38bdf8',
  epic: '#a855f7',
  legendary: '#f59e0b',
  mythical: '#ef4444',
};

const sourceLabels: Record<string, string> = {
  shop: '商城购买',
  room_drop: '房间掉落',
  trade: '市场交易',
  admin_grant: 'GM发放',
};

export function AdminRelicMarketPage() {
  const [tab, setTab] = useState<'relics' | 'trades' | 'codex'>('relics');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Relics state
  const [relics, setRelics] = useState<AdminRelic[]>([]);
  const [relicsTotal, setRelicsTotal] = useState(0);
  const [relicPage, setRelicPage] = useState(1);
  const [relicSearch, setRelicSearch] = useState('');
  const [relicFilterKey, setRelicFilterKey] = useState('');

  // Trades state
  const [trades, setTrades] = useState<AdminTrade[]>([]);
  const [tradesTotal, setTradesTotal] = useState(0);
  const [tradePage, setTradePage] = useState(1);
  const [tradeStatus, setTradeStatus] = useState('');
  const [tradeFilterKey, setTradeFilterKey] = useState('');

  // Grant modal
  const [showGrant, setShowGrant] = useState(false);
  const [grantCharacterId, setGrantCharacterId] = useState('');
  const [grantRelicKey, setGrantRelicKey] = useState('');
  const [grantDurability, setGrantDurability] = useState('');
  const [grantMaxDurability, setGrantMaxDurability] = useState('');
  const [grantLoading, setGrantLoading] = useState(false);

  // Codex filters
  const [codexType, setCodexType] = useState('');
  const [codexRarity, setCodexRarity] = useState('');

  const relicOptions = Object.entries(RELIC_REGISTRY).map(([k, v]) => ({ key: k, name: v.name, rarity: v.rarity }));

  const filteredCodex = Object.values(RELIC_REGISTRY).filter((r) => {
    if (codexType && r.type !== codexType) return false;
    if (codexRarity && r.rarity !== codexRarity) return false;
    return true;
  });

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    if (tab === 'relics') loadRelics();
    else if (tab === 'trades') loadTrades();
  }, [tab, relicPage, tradePage]);

  const loadRelics = async () => {
    setLoading(true);
    try {
      const res = await getAdminRelics({
        page: relicPage,
        limit: 20,
        search: relicSearch || undefined,
        relicKey: relicFilterKey || undefined,
      });
      if (res.success) {
        setRelics(res.data.relics);
        setRelicsTotal(res.data.total);
      }
    } catch {
      setToast({ message: '加载遗物失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadTrades = async () => {
    setLoading(true);
    try {
      const res = await getAdminTrades({
        page: tradePage,
        limit: 20,
        status: tradeStatus || undefined,
        relicKey: tradeFilterKey || undefined,
      });
      if (res.success) {
        setTrades(res.data.trades);
        setTradesTotal(res.data.total);
      }
    } catch {
      setToast({ message: '加载交易失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRelic = async (id: string) => {
    if (!confirm('确定删除该遗物？此操作不可恢复。')) return;
    try {
      const res = await deleteAdminRelic(id);
      if (res.success) {
        setToast({ message: '遗物已删除', type: 'success' });
        loadRelics();
      } else {
        setToast({ message: res.error?.message || '删除失败', type: 'error' });
      }
    } catch {
      setToast({ message: '删除失败', type: 'error' });
    }
  };

  const handleGrant = async () => {
    if (!grantCharacterId || !grantRelicKey) {
      setToast({ message: '请填写角色卡ID和遗物', type: 'error' });
      return;
    }
    setGrantLoading(true);
    try {
      const res = await grantAdminRelic({
        characterId: grantCharacterId,
        relicKey: grantRelicKey,
        durability: grantDurability ? parseInt(grantDurability) : undefined,
        maxDurability: grantMaxDurability ? parseInt(grantMaxDurability) : undefined,
      });
      if (res.success) {
        setToast({ message: '遗物已发放', type: 'success' });
        setShowGrant(false);
        setGrantCharacterId('');
        setGrantRelicKey('');
        setGrantDurability('');
        setGrantMaxDurability('');
        loadRelics();
      } else {
        setToast({ message: res.error?.message || '发放失败', type: 'error' });
      }
    } catch {
      setToast({ message: '发放失败', type: 'error' });
    } finally {
      setGrantLoading(false);
    }
  };

  const handleCancelTrade = async (tradeId: string) => {
    if (!confirm('确定强制下架该交易？')) return;
    try {
      const res = await cancelAdminTrade(tradeId);
      if (res.success) {
        setToast({ message: '交易已强制下架', type: 'success' });
        loadTrades();
      } else {
        setToast({ message: res.error?.message || '下架失败', type: 'error' });
      }
    } catch {
      setToast({ message: '下架失败', type: 'error' });
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-600/20 text-green-400 border-green-600/30',
      sold: 'bg-coc-gold/20 text-coc-gold border-coc-gold/30',
      cancelled: 'bg-coc-void text-coc-parchment-dim border-coc-border',
    };
    return map[status] || 'bg-coc-void text-coc-parchment-dim border-coc-border';
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 rounded border px-4 py-2 shadow ${
            toast.type === 'success'
              ? 'border-green-600/30 bg-green-900/80 text-green-100'
              : 'border-red-600/30 bg-red-900/80 text-red-100'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {tab === 'relics' ? (
            <Backpack className="w-7 h-7 text-coc-gold" />
          ) : tab === 'trades' ? (
            <Store className="w-7 h-7 text-coc-gold" />
          ) : (
            <ScrollText className="w-7 h-7 text-coc-gold" />
          )}
          <h1 className="text-2xl font-ritual font-bold text-coc-parchment">遗物与市场管理</h1>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'relics' && (
            <button
              onClick={() => setShowGrant(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-coc-gold text-coc-abyss text-sm font-medium hover:bg-coc-gold-glow"
            >
              <Plus size={16} />
              直接发放遗物
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-coc-border pb-2">
        {[
          { key: 'relics', label: '遗物总览' },
          { key: 'trades', label: '市场交易' },
          { key: 'codex', label: '遗物图鉴' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-t ${
              tab === t.key
                ? 'text-coc-gold border-b-2 border-coc-gold'
                : 'text-coc-text-muted hover:text-coc-parchment'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 遗物总览 */}
      {tab === 'relics' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-coc-bg-secondary border border-coc-border rounded px-3 py-2">
              <Search size={16} className="text-coc-text-muted" />
              <input
                type="text"
                value={relicSearch}
                onChange={(e) => setRelicSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setRelicPage(1), loadRelics())}
                placeholder="搜索用户昵称或角色名"
                className="bg-transparent text-sm text-coc-parchment placeholder:text-coc-text-muted outline-none w-48"
              />
            </div>
            <select
              value={relicFilterKey}
              onChange={(e) => { setRelicFilterKey(e.target.value); setRelicPage(1); loadRelics(); }}
              className="bg-coc-bg-secondary border border-coc-border rounded px-3 py-2 text-sm text-coc-parchment outline-none"
            >
              <option value="">全部遗物</option>
              {relicOptions.map((r) => (
                <option key={r.key} value={r.key}>{r.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setRelicPage(1); loadRelics(); }}
              className="px-3 py-2 rounded bg-coc-bg-tertiary text-coc-parchment text-sm hover:bg-coc-mist border border-coc-border"
            >
              查询
            </button>
          </div>

          <RuneBorder variant="gold" intensity="subtle">
            <div className="bg-coc-bg-secondary p-4 overflow-x-auto">
              {loading ? (
                <div className="py-12 text-center text-coc-text-muted flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  加载中...
                </div>
              ) : (
                <>
                  <table className="w-full text-sm text-left">
                    <thead className="text-coc-parchment-dim border-b border-coc-border">
                      <tr>
                        <th className="py-2 pr-4">遗物</th>
                        <th className="py-2 pr-4">所属用户</th>
                        <th className="py-2 pr-4">所属角色</th>
                        <th className="py-2 pr-4">来源</th>
                        <th className="py-2 pr-4">耐久</th>
                        <th className="py-2 pr-4">状态</th>
                        <th className="py-2 pr-4">获得时间</th>
                        <th className="py-2 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="text-coc-parchment">
                      {relics.map((r) => (
                        <tr key={r.id} className="border-b border-coc-border/40 hover:bg-coc-mist/30">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: rarityColors[r.meta?.rarity || 'common'] }}
                              />
                              <span>{r.meta?.name || r.relicKey}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">{r.userNickname}</td>
                          <td className="py-3 pr-4">{r.characterName}</td>
                          <td className="py-3 pr-4">{sourceLabels[r.source] || r.source}</td>
                          <td className="py-3 pr-4">
                            {r.durability != null ? `${r.durability}/${r.maxDurability}` : '-'}
                          </td>
                          <td className="py-3 pr-4">
                            {r.isOnSale ? (
                              <span className="px-2 py-0.5 rounded text-xs border bg-coc-gold/10 text-coc-gold border-coc-gold/30">在售</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs border bg-coc-void text-coc-text-muted border-coc-border">正常</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-coc-text-muted">{new Date(r.acquiredAt).toLocaleString()}</td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleDeleteRelic(r.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-coc-accent-red/40 text-coc-accent-red hover:bg-coc-accent-red/10"
                            >
                              <Trash2 size={12} />
                              删除
                            </button>
                          </td>
                        </tr>
                      ))}
                      {relics.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-coc-text-muted">暂无数据</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {relicsTotal > 20 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {Array.from({ length: Math.ceil(relicsTotal / 20) }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setRelicPage(p)}
                          className={`px-2.5 py-1 rounded text-xs border ${
                            relicPage === p
                              ? 'bg-coc-gold text-coc-abyss border-coc-gold'
                              : 'bg-coc-bg-tertiary text-coc-parchment border-coc-border hover:bg-coc-mist'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </RuneBorder>
        </div>
      )}

      {/* 市场交易 */}
      {tab === 'trades' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={tradeStatus}
              onChange={(e) => { setTradeStatus(e.target.value); setTradePage(1); loadTrades(); }}
              className="bg-coc-bg-secondary border border-coc-border rounded px-3 py-2 text-sm text-coc-parchment outline-none"
            >
              <option value="">全部状态</option>
              <option value="active">在售</option>
              <option value="sold">已成交</option>
              <option value="cancelled">已下架</option>
            </select>
            <select
              value={tradeFilterKey}
              onChange={(e) => { setTradeFilterKey(e.target.value); setTradePage(1); loadTrades(); }}
              className="bg-coc-bg-secondary border border-coc-border rounded px-3 py-2 text-sm text-coc-parchment outline-none"
            >
              <option value="">全部遗物</option>
              {relicOptions.map((r) => (
                <option key={r.key} value={r.key}>{r.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setTradePage(1); loadTrades(); }}
              className="px-3 py-2 rounded bg-coc-bg-tertiary text-coc-parchment text-sm hover:bg-coc-mist border border-coc-border"
            >
              查询
            </button>
          </div>

          <RuneBorder variant="madness" intensity="subtle">
            <div className="bg-coc-bg-secondary p-4 overflow-x-auto">
              {loading ? (
                <div className="py-12 text-center text-coc-text-muted flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  加载中...
                </div>
              ) : (
                <>
                  <table className="w-full text-sm text-left">
                    <thead className="text-coc-parchment-dim border-b border-coc-border">
                      <tr>
                        <th className="py-2 pr-4">遗物</th>
                        <th className="py-2 pr-4">价格</th>
                        <th className="py-2 pr-4">卖家</th>
                        <th className="py-2 pr-4">买家</th>
                        <th className="py-2 pr-4">状态</th>
                        <th className="py-2 pr-4">上架时间</th>
                        <th className="py-2 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="text-coc-parchment">
                      {trades.map((t) => (
                        <tr key={t.id} className="border-b border-coc-border/40 hover:bg-coc-mist/30">
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: rarityColors[t.meta?.rarity || 'common'] }}
                              />
                              <span>{t.meta?.name || t.relicKey}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1">
                              {t.currency === 'coin' ? <Coins size={14} className="text-coc-gold" /> : <Sparkles size={14} className="text-purple-400" />}
                              <span>{t.price}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-4">{t.sellerName}</td>
                          <td className="py-3 pr-4">{t.buyerName || '-'}</td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 rounded text-xs border ${statusBadge(t.status)}`}>
                              {t.status === 'active' ? '在售' : t.status === 'sold' ? '已成交' : '已下架'}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-coc-text-muted">{new Date(t.createdAt).toLocaleString()}</td>
                          <td className="py-3 text-right">
                            {t.status === 'active' && (
                              <button
                                onClick={() => handleCancelTrade(t.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-coc-accent-red/40 text-coc-accent-red hover:bg-coc-accent-red/10"
                              >
                                <Ban size={12} />
                                强制下架
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {trades.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-coc-text-muted">暂无数据</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {tradesTotal > 20 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {Array.from({ length: Math.ceil(tradesTotal / 20) }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setTradePage(p)}
                          className={`px-2.5 py-1 rounded text-xs border ${
                            tradePage === p
                              ? 'bg-coc-gold text-coc-abyss border-coc-gold'
                              : 'bg-coc-bg-tertiary text-coc-parchment border-coc-border hover:bg-coc-mist'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </RuneBorder>
        </div>
      )}

      {/* 遗物图鉴 */}
      {tab === 'codex' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={codexType}
              onChange={(e) => setCodexType(e.target.value)}
              className="bg-coc-bg-secondary border border-coc-border rounded px-3 py-2 text-sm text-coc-parchment outline-none"
            >
              <option value="">全部类型</option>
              <option value="narrative">叙事型</option>
              <option value="micro_buff">微效型</option>
              <option value="tool">工具型</option>
              <option value="consumable">消耗型</option>
            </select>
            <select
              value={codexRarity}
              onChange={(e) => setCodexRarity(e.target.value)}
              className="bg-coc-bg-secondary border border-coc-border rounded px-3 py-2 text-sm text-coc-parchment outline-none"
            >
              <option value="">全部稀有度</option>
              <option value="common">普通</option>
              <option value="rare">稀有</option>
              <option value="epic">史诗</option>
              <option value="legendary">传说</option>
              <option value="mythical">神话</option>
            </select>
          </div>

          <RuneBorder variant="gold" intensity="subtle">
            <div className="bg-coc-bg-secondary p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCodex.map((r) => (
                  <div
                    key={r.key}
                    className="rounded-lg border bg-coc-bg-tertiary p-4 transition-colors hover:bg-coc-mist"
                    style={{ borderColor: rarityColors[r.rarity] || '#9ca3af' }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-coc-parchment">{r.name}</h3>
                      <span
                        className="px-2 py-0.5 rounded text-xs border"
                        style={{
                          color: rarityColors[r.rarity] || '#9ca3af',
                          borderColor: rarityColors[r.rarity] || '#9ca3af',
                          backgroundColor: `${rarityColors[r.rarity]}20`,
                        }}
                      >
                        {r.rarity === 'common' ? '普通' : r.rarity === 'rare' ? '稀有' : r.rarity === 'epic' ? '史诗' : r.rarity === 'legendary' ? '传说' : '神话'}
                      </span>
                    </div>
                    <div className="mb-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs border border-coc-border text-coc-text-muted bg-coc-void">
                        {r.type === 'narrative' ? '叙事型' : r.type === 'micro_buff' ? '微效型' : r.type === 'tool' ? '工具型' : '消耗型'}
                      </span>
                    </div>
                    <p className="text-sm text-coc-text-secondary mb-3 leading-relaxed">{r.description}</p>
                    <div className="space-y-1 text-xs text-coc-parchment-dim">
                      {r.skill && r.value !== undefined && (
                        <div>效果：{r.skill} {r.value > 0 ? '+' : ''}{r.value}{r.threshold !== undefined ? `（阈值 ${r.threshold}）` : ''}</div>
                      )}
                      {r.dice && (
                        <div>骰子：{r.dice}</div>
                      )}
                      {r.maxUsePerRoom !== undefined && (
                        <div>每局可用：{r.maxUsePerRoom} 次</div>
                      )}
                      {r.maxDurability !== undefined && (
                        <div>最大耐久：{r.maxDurability}</div>
                      )}
                      {r.sideEffect && (
                        <div className="text-coc-accent-red">副作用：{r.sideEffect}</div>
                      )}
                      {r.tags && r.tags.length > 0 && (
                        <div>标签：{r.tags.join('、')}</div>
                      )}
                    </div>
                  </div>
                ))}
                {filteredCodex.length === 0 && (
                  <div className="col-span-full py-12 text-center text-coc-text-muted">暂无匹配图鉴</div>
                )}
              </div>
            </div>
          </RuneBorder>
        </div>
      )}

      {/* Grant Modal */}
      {showGrant && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
          <RuneBorder variant="gold" intensity="normal" showCorners>
            <div className="bg-coc-bg-secondary p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-coc-parchment">直接发放遗物</h3>
                <button onClick={() => setShowGrant(false)} className="text-coc-text-muted hover:text-coc-parchment">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-coc-parchment-dim mb-1">角色卡 ID</label>
                  <input
                    type="text"
                    value={grantCharacterId}
                    onChange={(e) => setGrantCharacterId(e.target.value)}
                    placeholder="输入角色卡 ID"
                    className="w-full bg-coc-bg-tertiary border border-coc-border rounded px-3 py-2 text-sm text-coc-parchment outline-none focus:border-coc-gold"
                  />
                </div>
                <div>
                  <label className="block text-xs text-coc-parchment-dim mb-1">遗物</label>
                  <select
                    value={grantRelicKey}
                    onChange={(e) => setGrantRelicKey(e.target.value)}
                    className="w-full bg-coc-bg-tertiary border border-coc-border rounded px-3 py-2 text-sm text-coc-parchment outline-none focus:border-coc-gold"
                  >
                    <option value="">请选择遗物</option>
                    {relicOptions.map((r) => (
                      <option key={r.key} value={r.key}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-coc-parchment-dim mb-1">当前耐久（可选）</label>
                    <input
                      type="number"
                      value={grantDurability}
                      onChange={(e) => setGrantDurability(e.target.value)}
                      className="w-full bg-coc-bg-tertiary border border-coc-border rounded px-3 py-2 text-sm text-coc-parchment outline-none focus:border-coc-gold"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-coc-parchment-dim mb-1">最大耐久（可选）</label>
                    <input
                      type="number"
                      value={grantMaxDurability}
                      onChange={(e) => setGrantMaxDurability(e.target.value)}
                      className="w-full bg-coc-bg-tertiary border border-coc-border rounded px-3 py-2 text-sm text-coc-parchment outline-none focus:border-coc-gold"
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    onClick={() => setShowGrant(false)}
                    className="px-4 py-2 rounded border border-coc-border text-coc-parchment text-sm hover:bg-coc-mist"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleGrant}
                    disabled={grantLoading}
                    className="px-4 py-2 rounded bg-coc-gold text-coc-abyss text-sm font-medium hover:bg-coc-gold-glow disabled:opacity-50"
                  >
                    {grantLoading ? '发放中...' : '确认发放'}
                  </button>
                </div>
              </div>
            </div>
          </RuneBorder>
        </div>
      )}
    </div>
  );
}

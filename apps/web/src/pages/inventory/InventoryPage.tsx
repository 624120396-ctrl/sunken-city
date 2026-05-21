import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useEffect, useState } from 'react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { RuneBorder } from '@components/ui/RuneBorder';
import { ItemCard } from '@components/items/ItemCard';
import { Backpack } from 'lucide-react';
import { cn } from '@lib/utils';

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythical'];

const rarityGlowClass: Record<string, string> = {
  common: 'border-coc-parchment-dim shadow-none',
  rare: 'border-coc-ether shadow-[0_0_12px_rgba(59,130,246,0.25)]',
  epic: 'border-purple-500 shadow-[0_0_14px_rgba(168,85,247,0.35)]',
  legendary: 'border-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.45)]',
  mythical: 'border-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.55)]',
};

const rarityLabel: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  mythical: '神话',
};

function getLootboxFlavor(maxRarity: string) {
  switch (maxRarity) {
    case 'mythical':
      return '时间凝滞了一瞬。你感觉有千只眼睛同时睁开，又同时闭上。——祂记住了你。';
    case 'legendary':
      return '雾气翻涌，某种古老的存在向你瞥了一眼。珍贵的回响落入掌心。';
    case 'epic':
      return '深渊的褶皱里滑出几道流光，它们选择在此刻为你停留。';
    default:
      return '盒中传出微弱的呢喃。你得到了一些来自过去的碎片。';
  }
}

interface InventoryItem {
  id: string;
  itemKey: string;
  quantity: number;
  item?: {
    id: string;
    key: string;
    name: string;
    description: string;
    category: string;
    rarity: string;
    iconUrl?: string;
  };
}

interface TitleItem {
  id: string;
  itemKey: string;
  quantity: number;
  item?: {
    id: string;
    key: string;
    name: string;
    description: string;
    category: string;
    rarity: string;
    iconUrl?: string;
  };
}

interface RelicMeta {
  key: string;
  name: string;
  description: string;
  rarity: string;
}

interface BoundRelic {
  id: string;
  relicKey: string;
  meta?: RelicMeta;
}

interface LootboxResult {
  coins: number;
  gainedCoins: number;
  relics: {
    id: string;
    key: string;
    name: string;
    description: string;
    rarity: string;
    iconUrl?: string;
  }[];
}

export function InventoryPage() {
  const [tab, setTab] = useState<'general' | 'titles' | 'relics'>('general');
  const [generalItems, setGeneralItems] = useState<InventoryItem[]>([]);
  const [titleItems, setTitleItems] = useState<TitleItem[]>([]);
  const [boundRelics, setBoundRelics] = useState<BoundRelic[]>([]);
  const [unboundRelics, setUnboundRelics] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lootboxResult, setLootboxResult] = useState<LootboxResult | null>(null);
  const [visibleRelics, setVisibleRelics] = useState<number>(0);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    fetchInventory();
    fetchCharacters();
  }, []);

  useEffect(() => {
    if (!lootboxResult) {
      setVisibleRelics(0);
      setFlash(false);
      return;
    }
    const maxRarity = lootboxResult.relics.reduce((max, r) => {
      return RARITY_ORDER.indexOf(r.rarity) > RARITY_ORDER.indexOf(max) ? r.rarity : max;
    }, 'common');
    if (['legendary', 'mythical'].includes(maxRarity)) {
      setFlash(true);
      setTimeout(() => setFlash(false), 600);
    }
    setVisibleRelics(0);
    lootboxResult.relics.forEach((_, idx) => {
      setTimeout(() => {
        setVisibleRelics((v) => v + 1);
      }, 400 + idx * 600);
    });
  }, [lootboxResult]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/shop/inventory');
      const data = await handleApiResponse<{ inventory: InventoryItem[] }>(res);
      const all = data.inventory || [];
      setGeneralItems(all.filter((i) => i.item?.category !== 'title' && i.item?.category !== 'relic'));
      setTitleItems(all.filter((i) => i.item?.category === 'title'));

      // 获取已绑定遗物（所有角色的聚合）
      const charsRes = await apiFetch('/characters');
      const charsData = await handleApiResponse<{ characters: any[] }>(charsRes);
      const chars = charsData.characters || [];
      const relicLists = await Promise.all(
        chars.map((c) =>
          apiFetch(`/relics/character/${c.id}`)
            .then((r) => r.json())
            .then((d) => ({ characterId: c.id, characterName: c.name, list: d.data?.relics || [] }))
            .catch(() => ({ characterId: c.id, characterName: c.name, list: [] })))
      );
      const bound = relicLists.flatMap((r) =>
        r.list.map((rel: any) => ({ ...rel, characterName: r.characterName }))
      );
      setBoundRelics(bound);

      // 获取未绑定遗物
      const unboundRes = await apiFetch('/relics/unbound');
      const unboundData = await unboundRes.json();
      setUnboundRelics(unboundData.data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  const fetchCharacters = async () => {
    const res = await apiFetch('/characters');
    const data = await res.json();
    setCharacters(data.data?.characters || []);
  };

  const bindRelic = async (inventoryId: string, characterId: string) => {
    const res = await apiFetch('/relics/bind', {
      method: 'POST',
      body: JSON.stringify({ inventoryId, characterId }),
    });
    await handleApiResponse(res);
    fetchInventory();
  };

  const openLootbox = async () => {
    try {
      const res = await apiFetch('/shop/open-lootbox', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const data = await handleApiResponse<{ data: LootboxResult }>(res);
      setLootboxResult(data.data);
      fetchInventory();
    } catch (err: any) {
      alert(err?.message || '开启失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Backpack className="w-6 h-6 text-coc-gold" />
        <h1 className="text-xl font-ritual font-bold text-coc-parchment">背包</h1>
      </div>

      <div className="flex gap-2">
        {[
          { key: 'general', label: '道具' },
          { key: 'titles', label: '印记' },
          { key: 'relics', label: '遗物' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-coc-gold text-coc-abyss'
                : 'bg-coc-bg-secondary text-coc-text-secondary hover:text-coc-parchment'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <RuneBorder variant="gold" intensity="subtle">
          <div className="bg-coc-bg-secondary p-4">
            {loading ? (
              <div className="py-10 text-center text-coc-text-muted">加载中...</div>
            ) : generalItems.length === 0 ? (
              <EmptyState
                icon={EmptyIcons.Inventory}
                title="暂无道具"
                description="背包空空如也……前往商店或完成调查以获取物品。"
                size="sm"
                animate={false}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {generalItems.map((i) => (
                  <ItemCard
                    key={i.id}
                    variant="inventory"
                    name={i.item?.name || i.itemKey}
                    description={i.item?.description}
                    rarity={i.item?.rarity || 'common'}
                    category={i.item?.category || '道具'}
                    iconUrl={i.item?.iconUrl}
                    quantity={i.quantity}
                    actions={
                      i.itemKey === 'old_one_lootbox'
                        ? [
                            {
                              label: '打开',
                              onClick: openLootbox,
                              variant: 'primary',
                            } as const,
                          ]
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </RuneBorder>
      )}

      {tab === 'titles' && (
        <RuneBorder variant="madness" intensity="subtle">
          <div className="bg-coc-bg-secondary p-4">
            {loading ? (
              <div className="py-10 text-center text-coc-text-muted">加载中...</div>
            ) : titleItems.length === 0 ? (
              <EmptyState
                icon={EmptyIcons.Investigator}
                title="暂无印记"
                description="完成特定成就，调查员的传说将被铭记。"
                size="sm"
                animate={false}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {titleItems.map((i) => (
                  <ItemCard
                    key={i.id}
                    variant="inventory"
                    name={i.item?.name || i.itemKey}
                    description={i.item?.description}
                    rarity={i.item?.rarity || 'common'}
                    category="印记"
                    iconUrl={i.item?.iconUrl}
                    quantity={i.quantity}
                  />
                ))}
              </div>
            )}
          </div>
        </RuneBorder>
      )}

      {tab === 'relics' && (
        <div className="space-y-4">
          <RuneBorder variant="gold" intensity="subtle">
            <div className="bg-coc-bg-secondary p-4">
              <h2 className="mb-3 text-sm font-bold text-coc-parchment">已绑定遗物（角色保险箱）</h2>
              {boundRelics.length === 0 ? (
                <div className="py-6 text-center text-sm text-coc-text-muted">还没有遗物绑定到角色卡上</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {boundRelics.map((r) => (
                    <ItemCard
                      key={r.id}
                      variant="relic"
                      name={r.meta?.name || r.relicKey}
                      description={r.meta?.description}
                      rarity={r.meta?.rarity || 'common'}
                      category="遗物"
                      badge={(r as any).characterName}
                    />
                  ))}
                </div>
              )}
            </div>
          </RuneBorder>

          <RuneBorder variant="madness" intensity="subtle">
            <div className="bg-coc-bg-secondary p-4">
              <h2 className="mb-3 text-sm font-bold text-coc-parchment">未绑定遗物</h2>
              {unboundRelics.length === 0 ? (
                <div className="py-6 text-center text-sm text-coc-text-muted">暂无有可绑定的遗物</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {unboundRelics.map((r) => (
                    <ItemCard
                      key={r.id}
                      variant="relic"
                      name={r.item?.name || r.itemKey}
                      description={r.item?.description || r.meta?.description}
                      rarity={r.item?.rarity || r.meta?.rarity || 'common'}
                      category="遗物"
                      quantity={r.quantity}
                      actions={characters.map((c) => ({
                        label: `绑定到 ${c.name}`,
                        onClick: () => bindRelic(r.id, c.id),
                        variant: 'primary',
                      }))}
                    />
                  ))}
                </div>
              )}
            </div>
          </RuneBorder>
        </div>
      )}

      {/* 开箱结果弹窗 */}
      {lootboxResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div
            className={cn(
              'relative w-full max-w-sm rounded-xl border-2 bg-coc-bg-secondary p-5 transition-shadow duration-300',
              flash
                ? 'border-coc-gold shadow-[0_0_40px_rgba(251,191,36,0.6)]'
                : 'border-coc-madness'
            )}
          >
            <div className="mb-2 text-center">
              <h3 className="text-lg font-ritual font-bold text-coc-gold">旧日低语已兑现</h3>
              <p className="mt-2 text-sm italic leading-relaxed text-coc-text-secondary">
                {getLootboxFlavor(
                  lootboxResult.relics.reduce(
                    (max, r) =>
                      RARITY_ORDER.indexOf(r.rarity) > RARITY_ORDER.indexOf(max) ? r.rarity : max,
                    'common' as string
                  )
                )}
              </p>
            </div>

            <div className="my-4 flex items-center justify-center gap-2 rounded-lg border border-coc-gold/30 bg-coc-gold/10 py-2">
              <span className="text-sm text-coc-text-secondary">锈蚀硬币</span>
              <span className="text-base font-bold text-coc-gold">+{lootboxResult.gainedCoins}</span>
              <span className="text-xs text-coc-text-muted">（当前 {lootboxResult.coins}）</span>
            </div>

            <div className="space-y-3">
              {lootboxResult.relics.map((r, idx) => (
                <div
                  key={r.id}
                  className={cn(
                    'rounded-lg border bg-coc-bg-tertiary p-3 transition-all duration-500',
                    rarityGlowClass[r.rarity] || rarityGlowClass.common,
                    idx < visibleRelics ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                  )}
                  style={{ transitionDelay: `${idx * 80}ms` }}
                >
                  <div className="flex items-center gap-3">
                    {r.iconUrl ? (
                      <img
                        src={r.iconUrl}
                        alt={r.name}
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-coc-bg-secondary text-xs text-coc-text-muted">
                        无图
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-bold text-coc-parchment">{r.name}</div>
                      <div
                        className="mt-0.5 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-coc-abyss"
                        style={{
                          backgroundColor:
                            r.rarity === 'mythical'
                              ? '#f43f5e'
                              : r.rarity === 'legendary'
                                ? '#fb923c'
                                : r.rarity === 'epic'
                                  ? '#a855f7'
                                  : r.rarity === 'rare'
                                    ? '#3b82f6'
                                    : '#78716c',
                        }}
                      >
                        {rarityLabel[r.rarity] || r.rarity}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-coc-text-secondary line-clamp-3">
                    {r.description}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setLootboxResult(null)}
              className="mt-5 w-full rounded bg-coc-gold px-4 py-2.5 text-sm font-bold text-coc-abyss hover:bg-coc-gold-glow"
            >
              收下它们
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

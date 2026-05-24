import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useState } from 'react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Skeleton, SkeletonCard } from '@components/ui/Skeleton';
import { ItemCard } from '@components/items/ItemCard';
import { Backpack } from 'lucide-react';
import { cn } from '@lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@components/ui/Toast';

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythical'];

const rarityGlowClass: Record<string, string> = {
  common: 'border-coc-text-muted shadow-none',
  rare: 'border-coc-gold shadow-[0_0_12px_rgba(201,162,39,0.25)]',
  epic: 'border-coc-blood shadow-[0_0_14px_rgba(139,38,53,0.30)]',
  legendary: 'border-coc-gold shadow-[0_0_18px_rgba(201,162,39,0.45)]',
  mythical: 'border-coc-blood shadow-[0_0_22px_rgba(139,38,53,0.40)]',
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

async function fetchInventory() {
  const res = await apiFetch('/shop/inventory');
  return handleApiResponse<{ inventory: InventoryItem[] }>(res);
}

async function fetchCharacters() {
  const res = await apiFetch('/characters');
  return handleApiResponse<{ characters: any[] }>(res);
}

async function fetchBoundRelics() {
  const charsRes = await apiFetch('/characters');
  const charsData = await handleApiResponse<{ characters: any[] }>(charsRes);
  const chars = charsData.characters || [];
  const relicLists = await Promise.all(
    chars.map((c) =>
      apiFetch(`/relics/character/${c.id}`)
        .then((r) => r.json())
        .then((d) => ({ characterId: c.id, characterName: c.name, list: d.data?.relics || [] }))
        .catch(() => ({ characterId: c.id, characterName: c.name, list: [] }))
    )
  );
  return relicLists.flatMap((r) =>
    r.list.map((rel: any) => ({ ...rel, characterName: r.characterName }))
  );
}

async function fetchUnboundRelics() {
  const res = await apiFetch('/relics/unbound');
  const data = await res.json();
  return data.data?.items || [];
}

export function InventoryPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'general' | 'titles' | 'relics'>('general');
  const [lootboxResult, setLootboxResult] = useState<LootboxResult | null>(null);
  const [visibleRelics, setVisibleRelics] = useState<number>(0);
  const [flash, setFlash] = useState(false);

  // Queries
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
    staleTime: 30 * 1000,
  });
  const allItems = inventoryData?.inventory || [];
  const generalItems = allItems.filter((i) => i.item?.category !== 'title' && i.item?.category !== 'relic');
  const titleItems = allItems.filter((i) => i.item?.category === 'title');

  const { data: charactersData } = useQuery({
    queryKey: ['characters'],
    queryFn: fetchCharacters,
    staleTime: 60 * 1000,
  });
  const characters = charactersData?.characters || [];

  const { data: boundRelics, isLoading: boundRelicsLoading } = useQuery({
    queryKey: ['relics', 'bound'],
    queryFn: fetchBoundRelics,
    staleTime: 30 * 1000,
  });

  const { data: unboundRelics, isLoading: unboundRelicsLoading } = useQuery<any[]>({
    queryKey: ['relics', 'unbound'],
    queryFn: fetchUnboundRelics,
    staleTime: 30 * 1000,
  });

  const loading = inventoryLoading || boundRelicsLoading || unboundRelicsLoading;

  // Mutations
  const bindMutation = useMutation({
    mutationFn: ({ inventoryId, characterId }: { inventoryId: string; characterId: string }) =>
      apiFetch('/relics/bind', {
        method: 'POST',
        body: JSON.stringify({ inventoryId, characterId }),
      }).then((r) => handleApiResponse(r)),
    onSuccess: () => {
      showToast('遗物绑定成功', 'success');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['relics'] });
    },
    onError: (err: any) => {
      showToast(err?.message || '绑定失败', 'error');
    },
  });

  const openLootboxMutation = useMutation({
    mutationFn: () =>
      apiFetch('/shop/open-lootbox', { method: 'POST', body: JSON.stringify({}) })
        .then((r) => handleApiResponse<{ data: LootboxResult }>(r)),
    onSuccess: (data) => {
      const result = data.data;
      setLootboxResult(result);
      showToast(`开箱成功！获得 ${result.relics.length} 件遗物`, 'success');
      // 开箱动画
      const maxRarity = result.relics.reduce((max: string, r) => {
        return RARITY_ORDER.indexOf(r.rarity) > RARITY_ORDER.indexOf(max) ? r.rarity : max;
      }, 'common');
      if (['legendary', 'mythical'].includes(maxRarity)) {
        setFlash(true);
        setTimeout(() => setFlash(false), 600);
      }
      setVisibleRelics(0);
      result.relics.forEach((_, idx) => {
        setTimeout(() => {
          setVisibleRelics((v) => v + 1);
        }, 400 + idx * 600);
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err: any) => {
      showToast(err?.message || '开启失败', 'error');
    },
  });

  const openLootbox = () => {
    openLootboxMutation.mutate();
  };

  const bindRelic = (inventoryId: string, characterId: string) => {
    bindMutation.mutate({ inventoryId, characterId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Backpack className="w-6 h-6" style={{ color: '#c9a227' }} />
        <div>
          <h1 className="text-xl font-ritual font-bold" style={{ color: '#1a1a1a' }}>背包</h1>
          <div className="w-12 h-px mt-1" style={{ background: 'linear-gradient(90deg, rgba(201,162,39,0.4) 0%, transparent 100%)' }} />
        </div>
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
                : 'bg-black/20 text-[#8b8375] hover:text-[#e8d4a0]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="card-layer-2 rounded-lg overflow-hidden">
          <div className="bg-[#1a1a1a] p-4">
            {loading ? (
              <div className="py-10"><SkeletonCard className="h-32" /></div>
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
                              label: openLootboxMutation.isPending ? '开启中...' : '打开',
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
        </div>
      )}

      {tab === 'titles' && (
        <div className="card-layer-2 rounded-lg overflow-hidden">
          <div className="bg-[#1a1a1a] p-4">
            {loading ? (
              <div className="py-10"><SkeletonCard className="h-32" /></div>
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
        </div>
      )}

      {tab === 'relics' && (
        <div className="space-y-4">
          <div className="card-layer-2 rounded-lg overflow-hidden">
            <div className="bg-[#1a1a1a] p-4">
              <h2 className="mb-3 text-sm font-bold text-[#e8d4a0]">已绑定遗物（角色保险箱）</h2>
              {boundRelicsLoading ? (
                <div className="py-6"><Skeleton className="h-20" /></div>
              ) : !boundRelics || boundRelics.length === 0 ? (
                <div className="py-6 text-center text-sm text-[#6b6558]">还没有遗物绑定到角色卡上</div>
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
                      badge={r.characterName}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card-layer-2 rounded-lg overflow-hidden">
            <div className="bg-[#1a1a1a] p-4">
              <h2 className="mb-3 text-sm font-bold text-[#e8d4a0]">未绑定遗物</h2>
              {unboundRelicsLoading ? (
                <div className="py-6"><Skeleton className="h-20" /></div>
              ) : !unboundRelics || unboundRelics.length === 0 ? (
                <div className="py-6 text-center text-sm text-[#6b6558]">暂无有可绑定的遗物</div>
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
                        label: bindMutation.isPending ? '绑定中...' : `绑定到 ${c.name}`,
                        onClick: () => bindRelic(r.id, c.id),
                        variant: 'primary',
                      }))}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 开箱结果弹窗 */}
      {lootboxResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overlay-layer-3 p-4">
          <div
            className={cn(
              'relative w-full max-w-sm rounded-xl border-2 bg-coc-bg-overlay p-5 transition-shadow duration-300 modal-layer-3',
              flash
                ? 'border-coc-gold shadow-[0_0_40px_rgba(251,191,36,0.6)]'
                : 'border-coc-blood'
            )}
          >
            <div className="mb-2 text-center">
              <h3 className="text-lg font-ritual font-bold text-[#c9a227]">旧日低语已兑现</h3>
              <p className="mt-2 text-sm italic leading-relaxed text-[#8b8375]">
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
              <span className="text-sm text-[#8b8375]">锈蚀硬币</span>
              <span className="text-base font-bold text-[#c9a227]">+{lootboxResult.gainedCoins}</span>
              <span className="text-xs text-[#6b6558]">（当前 {lootboxResult.coins}）</span>
            </div>

            <div className="space-y-3">
              {lootboxResult.relics.map((r, idx) => (
                <div
                  key={r.id}
                  className={cn(
                    'rounded-lg border bg-black/20 p-3 transition-all duration-500',
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
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-black/20 text-xs text-[#6b6558]">
                        无图
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-bold text-[#e8d4a0]">{r.name}</div>
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
                  <p className="mt-2 text-xs leading-relaxed text-[#8b8375] line-clamp-3">
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

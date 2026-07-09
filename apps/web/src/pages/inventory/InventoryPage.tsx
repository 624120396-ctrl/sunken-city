import { EmptyState, EmptyIcons } from '@components/ui/EmptyState';
import { useState } from 'react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { Skeleton, SkeletonCard } from '@components/ui/Skeleton';
import { ItemCard } from '@components/items/ItemCard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@components/ui/Toast';
import { EconomyPageShell } from '@components/economy/EconomyPageShell';
import { Surface } from '@components/system';
import {
  getInventoryVaultSummary,
  getInventoryVaultTabs,
  getLootboxRevealPresentation,
  type InventoryVaultTabKey,
} from '@components/economy/inventoryVaultMeta';

const rarityLabel: Record<string, string> = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  mythical: '神话',
};

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
  const [tab, setTab] = useState<InventoryVaultTabKey>('general');
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
  const relicCount = (boundRelics?.length || 0) + (unboundRelics?.length || 0);
  const vaultSummary = getInventoryVaultSummary({
    general: generalItems.length,
    titles: titleItems.length,
    relics: relicCount,
  });
  const vaultTabs = getInventoryVaultTabs(tab);

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
      const reveal = getLootboxRevealPresentation(result.relics.map((relic) => relic.rarity));
      if (reveal.flash) {
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
  const lootboxReveal = lootboxResult
    ? getLootboxRevealPresentation(lootboxResult.relics.map((relic) => relic.rarity))
    : null;

  return (
    <EconomyPageShell
      active="inventory"
      eyebrow="SEALED INVENTORY"
      title="背包"
      description="盐霜覆住旧纸与暗格，未命名之物仍在里面轻轻挪动。"
      meta={
        <div className="inventory-vault-summary">
          {vaultSummary.map((item) => (
            <div key={item.label} className="inventory-vault-summary__item">
              <span>{item.seal}</span>
              <strong>{item.value}</strong>
              <small>{item.label}</small>
            </div>
          ))}
        </div>
      }
    >
      <div className="inventory-vault space-y-4">
      <Surface variant="panel" material="archive" padding="sm" className="inventory-vault-tabs">
        {vaultTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="inventory-vault-tab"
            data-active={t.active}
            data-tone={t.tone}
          >
            <span>{t.seal}</span>
            <strong>{t.label}</strong>
          </button>
        ))}
      </Surface>

      {tab === 'general' && (
        <Surface variant="solid" material="archive" padding="md" className="inventory-vault-panel" data-vault-tone="gold">
          <div>
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
              <div className="inventory-vault-list">
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
        </Surface>
      )}

      {tab === 'titles' && (
        <Surface variant="solid" material="archive" padding="md" className="inventory-vault-panel" data-vault-tone="ocean">
          <div>
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
              <div className="inventory-vault-list">
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
        </Surface>
      )}

      {tab === 'relics' && (
        <div className="space-y-4">
          <Surface variant="solid" material="archive" padding="md" className="inventory-vault-panel" data-vault-tone="blood">
            <div>
              <h2 className="inventory-vault-heading">已绑定遗物（角色保险箱）</h2>
              {boundRelicsLoading ? (
                <div className="py-6"><Skeleton className="h-20" /></div>
              ) : !boundRelics || boundRelics.length === 0 ? (
                <div className="inventory-vault-empty">还没有遗物绑定到角色卡上</div>
              ) : (
                <div className="inventory-vault-list">
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
          </Surface>

          <Surface variant="solid" material="archive" padding="md" className="inventory-vault-panel" data-vault-tone="blood">
            <div>
              <h2 className="inventory-vault-heading">未绑定遗物</h2>
              {unboundRelicsLoading ? (
                <div className="py-6"><Skeleton className="h-20" /></div>
              ) : !unboundRelics || unboundRelics.length === 0 ? (
                <div className="inventory-vault-empty">暂无有可绑定的遗物</div>
              ) : (
                <div className="inventory-vault-list">
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
          </Surface>
        </div>
      )}

      {/* 开箱结果弹窗 */}
      {lootboxResult && lootboxReveal && (
        <div className="lootbox-reveal-overlay">
          <Surface
            variant="elevated"
            material="relic"
            className="lootbox-reveal-card"
            data-tone={lootboxReveal.tone}
            data-flash={flash ? 'true' : 'false'}
          >
            <div className="lootbox-reveal-card__header">
              <span>{lootboxReveal.rarityLabel}</span>
              <h3>旧日低语已兑现</h3>
              <p>
                {lootboxReveal.flavor}
              </p>
            </div>

            <div className="lootbox-reveal-card__coins">
              <span>锈蚀硬币</span>
              <strong>+{lootboxResult.gainedCoins}</strong>
              <small>当前 {lootboxResult.coins}</small>
            </div>

            <div className="lootbox-reveal-list">
              {lootboxResult.relics.map((r, idx) => (
                <div
                  key={r.id}
                  className="lootbox-reveal-relic"
                  data-rarity={r.rarity}
                  data-visible={idx < visibleRelics ? 'true' : 'false'}
                  style={{ transitionDelay: `${idx * 80}ms` }}
                >
                  <div className="lootbox-reveal-relic__main">
                    {r.iconUrl ? (
                      <img
                        src={r.iconUrl}
                        alt={r.name}
                      />
                    ) : (
                      <div className="lootbox-reveal-relic__empty">
                        无图
                      </div>
                    )}
                    <div>
                      <strong>{r.name}</strong>
                      <span>
                        {rarityLabel[r.rarity] || r.rarity}
                      </span>
                    </div>
                  </div>
                  <p>
                    {r.description}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setLootboxResult(null)}
              className="lootbox-reveal-card__accept"
            >
              收下它们
            </button>
          </Surface>
        </div>
      )}
      </div>
    </EconomyPageShell>
  );
}

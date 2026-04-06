import { useEffect, useState } from 'react';
import { apiFetch, handleApiResponse } from '@lib/api';
import { RuneBorder } from '@components/ui/RuneBorder';
import { ItemCard } from '@components/items/ItemCard';
import { Backpack } from 'lucide-react';

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

export function InventoryPage() {
  const [tab, setTab] = useState<'general' | 'titles' | 'relics'>('general');
  const [generalItems, setGeneralItems] = useState<InventoryItem[]>([]);
  const [titleItems, setTitleItems] = useState<TitleItem[]>([]);
  const [boundRelics, setBoundRelics] = useState<BoundRelic[]>([]);
  const [unboundRelics, setUnboundRelics] = useState<any[]>([]);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
    fetchCharacters();
  }, []);

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
          <div className="coc-bg-parchment p-4">
            {loading ? (
              <div className="py-10 text-center text-coc-parchment-dim">加载中...</div>
            ) : generalItems.length === 0 ? (
              <div className="py-10 text-center text-coc-parchment-dim">暂无道具</div>
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
                  />
                ))}
              </div>
            )}
          </div>
        </RuneBorder>
      )}

      {tab === 'titles' && (
        <RuneBorder variant="madness" intensity="subtle">
          <div className="coc-bg-parchment p-4">
            {loading ? (
              <div className="py-10 text-center text-coc-parchment-dim">加载中...</div>
            ) : titleItems.length === 0 ? (
              <div className="py-10 text-center text-coc-parchment-dim">暂无印记</div>
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
            <div className="coc-bg-parchment p-4">
              <h2 className="mb-3 text-sm font-bold text-coc-parchment">已绑定遗物（角色保险箱）</h2>
              {boundRelics.length === 0 ? (
                <div className="py-6 text-center text-sm text-coc-parchment-dim">还没有遗物绑定到角色卡上</div>
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
            <div className="coc-bg-parchment p-4">
              <h2 className="mb-3 text-sm font-bold text-coc-parchment">未绑定遗物</h2>
              {unboundRelics.length === 0 ? (
                <div className="py-6 text-center text-sm text-coc-parchment-dim">暂无有可绑定的遗物</div>
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
    </div>
  );
}

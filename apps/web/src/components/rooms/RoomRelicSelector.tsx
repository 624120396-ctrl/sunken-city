import { useEffect, useState } from 'react';
import { apiFetch } from '@lib/api';
import { getRelicEffect, getRarityColorClass } from '@data/relics';
import { cn } from '@lib/utils';

interface Relic {
  id: string;
  relicKey: string;
  meta?: {
    name: string;
    description: string;
    rarity: string;
  };
}

interface RoomRelicSelectorProps {
  characterId?: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function RoomRelicSelector({ characterId, selectedIds, onChange }: RoomRelicSelectorProps) {
  const [relics, setRelics] = useState<Relic[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!characterId) {
      setRelics([]);
      return;
    }
    setLoading(true);
    apiFetch(`/relics/character/${characterId}`)
      .then((res) => res.json())
      .then((data) => {
        const list = (data.data?.relics || []).map((r: any) => ({
          ...r,
          meta: r.meta || getRelicEffect(r.relicKey),
        }));
        setRelics(list);
      })
      .finally(() => setLoading(false));
  }, [characterId]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else if (selectedIds.length < 2) {
      onChange([...selectedIds, id]);
    }
  };

  if (!characterId) {
    return (
      <div className="rounded border border-coc-void bg-coc-bg-secondary/40 p-3 text-sm text-coc-parchment-dim">
        请先选择一张角色卡，再选择携带遗物。
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded border border-coc-void bg-coc-bg-secondary/40 p-3 text-sm text-coc-parchment-dim">
        读取遗物中...
      </div>
    );
  }

  if (relics.length === 0) {
    return (
      <div className="rounded border border-coc-void bg-coc-bg-secondary/40 p-3 text-sm text-coc-parchment-dim">
        该角色没有任何遗物。前往商店或背包绑定遗物后再来。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-coc-text-muted">
        已选择 {selectedIds.length} / 2 件遗物
      </div>
      <div className="grid grid-cols-1 gap-2">
        {relics.map((r) => {
          const selected = selectedIds.includes(r.id);
          const rarity = r.meta?.rarity || 'common';
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => toggle(r.id)}
              className={cn(
                'flex items-center justify-between rounded border p-3 text-left transition-colors',
                selected
                  ? 'border-coc-gold bg-coc-gold/10'
                  : `${getRarityColorClass(rarity).split(' ')[1]} bg-coc-bg-secondary/40 hover:bg-coc-bg-secondary/70`
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-coc-parchment">{r.meta?.name || r.relicKey}</div>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide border ${getRarityColorClass(rarity)}`}>
                    {rarity}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-coc-text-muted line-clamp-1">{r.meta?.description}</div>
              </div>
              {selected && (
                <span className="rounded bg-coc-gold px-2 py-0.5 text-xs font-bold text-coc-abyss">携带</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

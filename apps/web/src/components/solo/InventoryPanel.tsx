import { useState } from 'react';
import { X, Package, Beaker, Key } from 'lucide-react';

interface InventoryItem {
  key: string;
  name: string;
  type: 'consumable' | 'key_item';
  description?: string;
}

interface InventoryPanelProps {
  open: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onUse: (key: string) => void;
}

export function InventoryPanel({ open, onClose, items, onUse }: InventoryPanelProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* 遮罩 */}
      <div className="flex-1 bg-black/50" onClick={onClose} />

      {/* 抽屉 */}
      <div className="w-80 max-w-[80vw] h-full bg-slate-900/95 border-l border-white/10 backdrop-blur flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
            <Package className="w-4 h-4" />
            物品栏
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2">
          {items.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-8">背包空空如也</div>
          )}
          {items.map((item) => {
            const isSelected = selectedKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setSelectedKey(isSelected ? null : item.key)}
                className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 text-sm text-slate-200">
                  {item.type === 'consumable' ? (
                    <Beaker className="w-3.5 h-3.5 text-emerald-300" />
                  ) : (
                    <Key className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  {item.name}
                </div>
                {item.description && (
                  <div className="text-xs text-slate-400 mt-1">{item.description}</div>
                )}
                {isSelected && item.type === 'consumable' && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUse(item.key);
                      }}
                      className="flex-1 px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    >
                      使用
                    </button>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

// 状态标记类型
export type StatusTag = 
  | 'injured'      // 受伤
  | 'poisoned'     // 中毒
  | 'insane'       // 疯狂
  | 'unconscious'  // 昏迷
  | 'dying'        // 濒死
  | 'bleeding'     // 流血
  | 'paralyzed'    // 麻痹
  | 'blessed';     // 祝福

interface StatusTagConfig {
  id: StatusTag;
  label: string;
  color: string;
  bgColor: string;
}

const STATUS_CONFIG: StatusTagConfig[] = [
  { id: 'injured', label: '受伤', color: 'text-red-400', bgColor: 'bg-red-400/20' },
  { id: 'poisoned', label: '中毒', color: 'text-green-400', bgColor: 'bg-green-400/20' },
  { id: 'insane', label: '疯狂', color: 'text-purple-400', bgColor: 'bg-purple-400/20' },
  { id: 'unconscious', label: '昏迷', color: 'text-gray-400', bgColor: 'bg-gray-400/20' },
  { id: 'dying', label: '濒死', color: 'text-red-600', bgColor: 'bg-red-600/30' },
  { id: 'bleeding', label: '流血', color: 'text-rose-400', bgColor: 'bg-rose-400/20' },
  { id: 'paralyzed', label: '麻痹', color: 'text-yellow-400', bgColor: 'bg-yellow-400/20' },
  { id: 'blessed', label: '祝福', color: 'text-coc-accent-gold', bgColor: 'bg-coc-accent-gold/20' },
];

interface StatusTagsProps {
  tags: string[];
  isEditable?: boolean;
  onChange?: (tags: string[]) => void;
  size?: 'sm' | 'md';
}

export function StatusTags({ tags, isEditable, onChange, size = 'md' }: StatusTagsProps) {
  const [showSelector, setShowSelector] = useState(false);

  const activeConfigs = STATUS_CONFIG.filter(cfg => tags.includes(cfg.id));

  const handleAdd = (tagId: StatusTag) => {
    if (!tags.includes(tagId)) {
      onChange?.([...tags, tagId]);
    }
    setShowSelector(false);
  };

  const handleRemove = (tagId: StatusTag) => {
    onChange?.(tags.filter(t => t !== tagId));
  };

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-1.5 py-0.5' 
    : 'text-xs px-2 py-1';

  return (
    <div className="flex flex-wrap gap-1">
      {activeConfigs.map(cfg => (
        <span
          key={cfg.id}
          className={`inline-flex items-center gap-1 rounded ${cfg.color} ${cfg.bgColor} ${sizeClasses}`}
        >
          {cfg.label}
          {isEditable && (
            <button
              onClick={() => handleRemove(cfg.id)}
              className="hover:text-white transition-colors"
            >
              <X size={size === 'sm' ? 10 : 12} />
            </button>
          )}
        </span>
      ))}

      {isEditable && (
        <div className="relative">
          <button
            onClick={() => setShowSelector(!showSelector)}
            className={`inline-flex items-center gap-1 rounded border border-dashed border-coc-text-muted text-coc-text-muted hover:text-coc-text-primary hover:border-coc-text-primary transition-colors ${sizeClasses}`}
          >
            <Plus size={size === 'sm' ? 10 : 12} />
          </button>

          {showSelector && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-coc-bg-secondary border border-coc-border rounded-lg shadow-lg p-2 min-w-[120px]">
              {STATUS_CONFIG
                .filter(cfg => !tags.includes(cfg.id))
                .map(cfg => (
                  <button
                    key={cfg.id}
                    onClick={() => handleAdd(cfg.id)}
                    className={`w-full text-left px-2 py-1 rounded text-sm ${cfg.color} hover:bg-coc-bg-tertiary transition-colors`}
                  >
                    {cfg.label}
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

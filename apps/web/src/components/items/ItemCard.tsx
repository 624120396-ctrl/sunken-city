import { cn } from '@lib/utils';
import { getRarityLabelClass } from '@data/relics';

export interface ItemCardProps {
  variant: 'shop' | 'inventory' | 'relic' | 'trade';
  iconUrl?: string;
  name: string;
  rarity: string;
  category: string;
  description?: string;
  quantity?: number;
  badge?: string;
  children?: React.ReactNode;
  actions?: { label: string; onClick: () => void; variant?: 'primary' | 'danger' | 'ghost' }[];
  onClick?: () => void;
  className?: string;
}

const rarityBorderClass: Record<string, string> = {
  common: 'border-coc-parchment-dim',
  rare: 'border-coc-gold',
  epic: 'border-coc-madness',
  legendary: 'border-purple-400',
  mythical: 'border-rose-300',
};

export function ItemCard({
  variant,
  iconUrl,
  name,
  rarity,
  category,
  description,
  quantity,
  badge,
  children,
  actions,
  onClick,
  className,
}: ItemCardProps) {
  const borderColor = rarityBorderClass[rarity] || rarityBorderClass.common;
  // variant 预留用于未来不同模式下的样式分支
  void variant;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-lg border bg-coc-bg-tertiary p-4 transition-colors',
        borderColor,
        onClick && 'cursor-pointer hover:bg-coc-mist',
        className
      )}
    >
      {badge && (
        <span className="absolute right-2 top-2 rounded bg-coc-bg-tertiary px-1.5 py-0.5 text-[10px] text-coc-text-muted">
          {badge}
        </span>
      )}

      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-coc-bg-tertiary">
          {iconUrl ? (
            <img src={iconUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-coc-text-muted">无图</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-bold text-coc-parchment">{name}</span>
            {quantity != null && quantity > 1 && (
              <span className="rounded bg-coc-bg-tertiary px-1 text-xs text-coc-text-muted">×{quantity}</span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-coc-text-muted">
            <span className={`capitalize ${getRarityLabelClass(rarity)}`}>{rarity}</span>
            <span>·</span>
            <span>{category}</span>
          </div>
          {description && (
            <p className="mt-1 line-clamp-2 text-xs text-coc-text-secondary">{description}</p>
          )}
          {children}
        </div>
      </div>

      {actions && actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
              }}
              className={cn(
                'rounded px-3 py-1.5 text-xs font-medium transition-colors',
                action.variant === 'danger'
                  ? 'bg-red-900/40 text-red-200 hover:bg-red-900/60'
                  : action.variant === 'ghost'
                  ? 'bg-transparent text-coc-text-muted hover:text-coc-parchment'
                  : 'bg-coc-gold text-coc-abyss hover:bg-coc-gold-glow'
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

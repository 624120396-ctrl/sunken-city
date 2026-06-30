import { cn } from '@lib/utils';

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs({ items, value, onChange, ariaLabel, className }: TabsProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex rounded-md border border-[var(--coc-border-subtle)] bg-black/30 p-1', className)}
    >
      {items.map((item) => {
        const selected = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={cn(
              'coc-focus-ring min-h-9 rounded px-3 text-sm transition',
              selected
                ? 'bg-[var(--coc-accent-gold)] text-[var(--coc-text-inverse)]'
                : 'text-[var(--coc-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--coc-text-primary)]'
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="ml-1 opacity-70">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

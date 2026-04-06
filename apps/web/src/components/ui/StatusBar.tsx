interface StatusBarProps {
  label: string;
  current: number;
  max: number;
  color: 'red' | 'cyan' | 'gold';
  tooltip?: string;
}

export function StatusBar({ label, current, max, color, tooltip }: StatusBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  
  const colorClasses = {
    red: 'bg-coc-accent-red',
    cyan: 'bg-coc-accent-cyan',
    gold: 'bg-coc-accent-gold',
  };

  return (
    <div className="space-y-1" title={tooltip}>
      <div className="flex justify-between text-xs">
        <span className="text-coc-text-secondary">{label}</span>
        <span className={percentage < 30 ? 'text-red-400' : 'text-coc-text-primary'}>
          {current}/{max}
        </span>
      </div>
      <div className="h-2 bg-coc-bg-tertiary rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

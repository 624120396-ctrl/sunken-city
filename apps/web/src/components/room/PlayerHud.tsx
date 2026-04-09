import { useMemo } from 'react';
import { Heart, Brain, Shield, Zap, UserX, Skull, Wind, Frown } from 'lucide-react';

interface PlayerHudProps {
  character?: {
    id: string;
    name: string;
    occupation?: string;
    avatarUrl?: string;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    san: number;
    maxSan: number;
    str: number;
    con: number;
    siz: number;
    dex: number;
    app: number;
    int: number;
    pow: number;
    edu: number;
    luck?: number;
    mov?: number;
    build?: number;
    skills?: string;
    weapons?: string;
    armor?: string;
  } | null;
  statusTags?: string[];
  quickSkills?: { name: string; value: number }[];
  onQuickRoll?: (skillName: string, value: number) => void;
  onTagClick?: (tag: string) => void;
  isKP?: boolean;
  availableTags?: string[];
  className?: string;
}

function CircularGauge({
  value,
  max,
  label,
  colorClass,
  icon: Icon,
}: {
  value: number;
  max: number;
  label: string;
  colorClass: string;
  icon: any;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={radius} stroke="#1f1f2e" strokeWidth="5" fill="none" />
          <circle
            cx="22"
            cy="22"
            r={radius}
            stroke="currentColor"
            strokeWidth="5"
            fill="none"
            strokeLinecap="round"
            className={colorClass}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
              transition: 'stroke-dashoffset 0.5s ease',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={14} className={colorClass} />
        </div>
      </div>
      <div className="text-xs text-coc-text-secondary">
        {label} <span className={colorClass}>{value}</span>/{max}
      </div>
    </div>
  );
}

const TAG_META: Record<string, { label: string; icon: any; color: string }> = {
  injured: { label: '受伤', icon: Heart, color: 'text-coc-blood-glow' },
  poisoned: { label: '中毒', icon: Skull, color: 'text-emerald-400' },
  insane: { label: '疯狂', icon: Brain, color: 'text-purple-400' },
  unconscious: { label: '昏迷', icon: UserX, color: 'text-slate-400' },
  dying: { label: '濒死', icon: Wind, color: 'text-red-600' },
  stunned: { label: '震慑', icon: Zap, color: 'text-yellow-400' },
  depressed: { label: '沮丧', icon: Frown, color: 'text-blue-400' },
};

export function PlayerHud({
  character,
  statusTags = [],
  quickSkills = [],
  onQuickRoll,
  onTagClick,
  isKP = false,
  availableTags = ['injured', 'poisoned', 'insane', 'unconscious', 'dying', 'stunned'],
  className = '',
}: PlayerHudProps) {
  const skills = useMemo(() => {
    if (!quickSkills?.length) return [];
    return quickSkills.slice(0, 6);
  }, [quickSkills]);

  if (!character) {
    return (
      <div className={`coc-card ${className}`}>
        <div className="text-sm text-coc-text-muted text-center py-4">尚未选择调查员</div>
      </div>
    );
  }

  return (
    <div className={`coc-card ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        {character.avatarUrl ? (
          <img src={character.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover border border-coc-border bg-coc-bg-secondary" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-coc-bg-tertiary border border-coc-border flex items-center justify-center">
            <Shield size={20} className="text-coc-text-muted" />
          </div>
        )}
        <div className="overflow-hidden">
          <div className="font-ritual font-bold text-coc-parchment truncate">{character.name}</div>
          <div className="text-xs text-coc-text-secondary truncate">{character.occupation || '未知职业'}</div>
        </div>
      </div>

      <div className="flex justify-around mb-3">
        <CircularGauge value={character.hp} max={character.maxHp} label="HP" colorClass="text-coc-blood-glow" icon={Heart} />
        <CircularGauge value={character.mp} max={character.maxMp} label="MP" colorClass="text-cyan-400" icon={Zap} />
        <CircularGauge value={character.san} max={character.maxSan} label="SAN" colorClass="text-purple-400" icon={Brain} />
      </div>

      {statusTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {statusTags.map((tag) => {
            const meta = TAG_META[tag] || { label: tag, icon: Shield, color: 'text-coc-text-muted' };
            return (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-coc-border bg-coc-bg-tertiary ${meta.color} hover:bg-coc-bg-primary transition-colors`}
                title={isKP ? '点击移除' : ''}
              >
                <meta.icon size={10} />
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {skills.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-coc-text-secondary">快捷检定</div>
          <div className="grid grid-cols-2 gap-1.5">
            {skills.map((s) => (
              <button
                key={s.name}
                onClick={() => onQuickRoll?.(s.name, s.value)}
                className="text-left px-2 py-1.5 rounded bg-coc-bg-tertiary hover:bg-coc-accent-red/20 transition-colors text-xs"
              >
                <div className="truncate text-coc-parchment">{s.name}</div>
                <div className="text-coc-accent-gold">{s.value}%</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {isKP && (
        <div className="mt-3 pt-3 border-t border-coc-border">
          <div className="text-xs text-coc-text-secondary mb-1.5">添加状态</div>
          <div className="flex flex-wrap gap-1">
            {availableTags.map((tag) => {
              const meta = TAG_META[tag] || { label: tag, icon: Shield, color: 'text-coc-text-muted' };
              if (statusTags.includes(tag)) return null;
              return (
                <button
                  key={tag}
                  onClick={() => onTagClick?.(tag)}
                  className="px-2 py-0.5 rounded text-xs border border-dashed border-coc-border text-coc-text-secondary hover:text-coc-parchment hover:border-coc-text-secondary transition-colors"
                >
                  + {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

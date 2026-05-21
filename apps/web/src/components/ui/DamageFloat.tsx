import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@lib/utils';
import { animateDamage } from '@lib/animation';

interface DamageFloatProps {
  amount: number;
  isCrit?: boolean;
  isHeal?: boolean;
  isSanity?: boolean;
  onComplete?: () => void;
}

export function DamageFloat({
  amount,
  isCrit = false,
  isHeal = false,
  isSanity = false,
  onComplete,
}: DamageFloatProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (ref.current) {
      const anim = animateDamage(ref.current, isCrit);
      
      // anime.js v4 返回 Promise
      anim.then(() => {
        setVisible(false);
        onComplete?.();
      });
    }
  }, [isCrit, onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      className={cn(
        'fixed z-50 pointer-events-none',
        'font-rune text-2xl md:text-4xl font-bold',
        'flex items-center gap-2',
        isHeal && 'text-coc-gold',
        isSanity && 'text-coc-madness-glow',
        !isHeal && !isSanity && 'text-coc-blood',
        isCrit && 'text-coc-gold scale-125'
      )}
      style={{
        textShadow: isCrit
          ? '0 0 20px rgba(201, 162, 39, 0.6), 0 0 40px rgba(201, 162, 39, 0.3)'
          : '0 0 10px rgba(139, 38, 53, 0.5)',
      }}
    >
      <span>
        {isHeal ? '+' : isSanity ? 'SAN ' : '-'}{amount}
      </span>
      {isCrit && (
        <span className="text-sm md:text-base text-coc-gold animate-pulse">
          暴击!
        </span>
      )}
    </div>
  );
}

/**
 * 伤害飘字管理器（支持多个同时显示）
 */
interface DamageEntry {
  id: string;
  amount: number;
  isCrit?: boolean;
  isHeal?: boolean;
  isSanity?: boolean;
  x: number;
  y: number;
}

interface DamageFloatManagerProps {
  damages: DamageEntry[];
  onRemove?: (id: string) => void;
}

export function DamageFloatManager({ damages, onRemove }: DamageFloatManagerProps) {
  return (
    <>
      {damages.map((damage) => (
        <div
          key={damage.id}
          className="fixed z-50"
          style={{
            left: damage.x,
            top: damage.y,
          }}
        >
          <DamageFloat
            amount={damage.amount}
            isCrit={damage.isCrit}
            isHeal={damage.isHeal}
            isSanity={damage.isSanity}
            onComplete={() => onRemove?.(damage.id)}
          />
        </div>
      ))}
    </>
  );
}

/**
 * 使用伤害飘字的 Hook
 */
export function useDamageFloats() {
  const [damages, setDamages] = useState<DamageEntry[]>([]);
  const idRef = useRef(0);

  const addDamage = useCallback((params: Omit<DamageEntry, 'id'>) => {
    const id = `damage-${++idRef.current}`;
    setDamages((prev) => [...prev, { ...params, id }]);
  }, []);

  const removeDamage = useCallback((id: string) => {
    setDamages((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearDamages = useCallback(() => {
    setDamages([]);
  }, []);

  return {
    damages,
    addDamage,
    removeDamage,
    clearDamages,
    DamageFloats: (
      <DamageFloatManager
        damages={damages}
        onRemove={removeDamage}
      />
    ),
  };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@lib/utils';
import { animateClueReveal } from '@lib/animation';
import { EyeOff, Sparkles } from 'lucide-react';

interface ClueCardProps {
  title: string;
  content: string;
  isRevealed: boolean;
  onReveal?: () => void;
  className?: string;
  variant?: 'default' | 'gold' | 'blood' | 'madness';
}

const variantStyles = {
  default: {
    border: 'border-coc-void hover:border-coc-rift',
    glow: '',
    icon: 'text-coc-parchment-dim',
  },
  gold: {
    border: 'border-coc-gold/20 hover:border-coc-gold/40',
    glow: 'shadow-[0_0_15px_rgba(201,162,39,0.1)]',
    icon: 'text-coc-gold',
  },
  blood: {
    border: 'border-coc-blood/20 hover:border-coc-blood/40',
    glow: 'shadow-[0_0_15px_rgba(139,38,53,0.1)]',
    icon: 'text-coc-blood',
  },
  madness: {
    border: 'border-coc-madness/20 hover:border-coc-madness/40',
    glow: 'shadow-[0_0_15px_rgba(107,76,122,0.1)]',
    icon: 'text-coc-madness',
  },
};

export function ClueCard({
  title,
  content,
  isRevealed,
  onReveal,
  className,
  variant = 'default',
}: ClueCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);
  const styles = variantStyles[variant];

  useEffect(() => {
    if (isRevealed && !animated && ref.current) {
      animateClueReveal(ref.current, () => {
        setAnimated(true);
      });
    }
  }, [isRevealed, animated]);

  const handleClick = useCallback(() => {
    if (!isRevealed) {
      onReveal?.();
    }
  }, [isRevealed, onReveal]);

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={cn(
        'relative rounded-xl border p-4 md:p-6 cursor-pointer',
        'bg-coc-surface/80 backdrop-blur-sm',
        'transition-all duration-300',
        styles.border,
        styles.glow,
        isRevealed && 'cursor-default',
        className
      )}
    >
      {/* 未揭示状态 */}
      {!isRevealed && (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className={cn('w-12 h-12 rounded-full flex items-center justify-center bg-coc-abyss/50', styles.icon)}>
            <EyeOff size={20} />
          </div>
          <div className="text-coc-parchment-dim text-sm font-rune text-center">
            {title}
          </div>
          <div className="text-xs text-coc-parchment-faded">
            点击揭示线索
          </div>
        </div>
      )}

      {/* 已揭示状态 */}
      {isRevealed && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className={styles.icon} />
            <h3 className="font-ritual text-lg text-coc-parchment tracking-wide">
              {title}
            </h3>
          </div>
          <p className="text-sm text-coc-parchment-dim leading-relaxed">
            {content}
          </p>
        </div>
      )}

      {/* 边缘发光效果（已揭示时） */}
      {isRevealed && (
        <div
          className={cn(
            'absolute inset-0 rounded-xl pointer-events-none',
            'opacity-30 animate-rune-glow',
            variant === 'gold' && 'bg-gradient-to-br from-coc-gold/5 to-transparent',
            variant === 'blood' && 'bg-gradient-to-br from-coc-blood/5 to-transparent',
            variant === 'madness' && 'bg-gradient-to-br from-coc-madness/5 to-transparent'
          )}
        />
      )}
    </div>
  );
}

/**
 * 线索揭示动画包装器
 */
interface ClueRevealAnimationProps {
  children: React.ReactNode;
  trigger: boolean;
  className?: string;
}

export function ClueRevealAnimation({
  children,
  trigger,
  className,
}: ClueRevealAnimationProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (trigger && !animated && ref.current) {
      animateClueReveal(ref.current, () => {
        setAnimated(true);
      });
    }
  }, [trigger, animated]);

  return (
    <div ref={ref} className={cn('opacity-0', className)}>
      {children}
    </div>
  );
}

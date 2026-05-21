import { useEffect, useRef, useState } from 'react';
import { cn } from '@lib/utils';
import { animateDice, isMobile } from '@lib/animation';
import { Dices } from 'lucide-react';

interface DiceResult {
  id: string;
  type: 'd100' | 'd10' | 'd6' | 'd4';
  result: number;
  label?: string;
  isSuccess?: boolean;
  isCritical?: boolean;
  isFumble?: boolean;
}

interface DiceTheaterProps {
  results: DiceResult[];
  onComplete?: () => void;
  visible: boolean;
}

export function DiceTheater({ results, onComplete, visible }: DiceTheaterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);
  const mobile = isMobile();

  useEffect(() => {
    if (visible && !animated && containerRef.current) {
      const diceElements = containerRef.current.querySelectorAll('.dice-item');
      
      diceElements.forEach((el, i) => {
        setTimeout(() => {
          animateDice(el as HTMLElement);
        }, i * 150);
      });

      setAnimated(true);
      
      const totalDelay = diceElements.length * 150 + 800;
      const timer = setTimeout(() => {
        onComplete?.();
      }, totalDelay);

      return () => clearTimeout(timer);
    }
  }, [visible, animated, onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center',
        'bg-coc-abyss/80 backdrop-blur-sm',
        mobile && 'bg-coc-abyss/90 backdrop-blur-none'
      )}
      onClick={onComplete}
    >
      <div className="flex flex-col items-center gap-8">
        {/* 骰子结果 */}
        <div className="flex items-center gap-6 flex-wrap justify-center">
          {results.map((result) => (
            <div
              key={result.id}
              className={cn(
                'dice-item flex flex-col items-center gap-2',
                'opacity-0'
              )}
            >
              <div
                className={cn(
                  'w-20 h-20 md:w-24 md:h-24 rounded-2xl',
                  'flex items-center justify-center',
                  'font-rune text-3xl md:text-4xl font-bold',
                  'border-2',
                  result.isCritical && 'bg-coc-gold/20 border-coc-gold text-coc-gold shadow-[0_0_20px_rgba(201,162,39,0.4)]',
                  result.isFumble && 'bg-coc-blood/20 border-coc-blood text-coc-blood shadow-[0_0_20px_rgba(139,38,53,0.4)]',
                  !result.isCritical && !result.isFumble && 'bg-coc-surface border-coc-void text-coc-parchment'
                )}
              >
                {result.result}
              </div>
              <div className="text-center">
                <div className="text-xs text-coc-parchment-dim font-rune">
                  {result.label || result.type}
                </div>
                {result.isSuccess !== undefined && (
                  <div
                    className={cn(
                      'text-xs font-bold mt-0.5',
                      result.isSuccess ? 'text-coc-gold' : 'text-coc-blood'
                    )}
                  >
                    {result.isSuccess ? '成功' : '失败'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 提示文字 */}
        <div className="text-coc-parchment-dim text-sm font-rune animate-breathe">
          <Dices className="inline-block mr-2" size={16} />
          点击任意处关闭
        </div>
      </div>
    </div>
  );
}

/**
 * 小型骰子结果组件（非剧场模式）
 */
interface DiceBadgeProps {
  result: number;
  type: string;
  isSuccess?: boolean;
  isCritical?: boolean;
  isFumble?: boolean;
  className?: string;
}

export function DiceBadge({
  result,
  type,
  isSuccess,
  isCritical,
  isFumble,
  className,
}: DiceBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md',
        'font-rune text-sm font-bold',
        'border',
        isCritical && 'bg-coc-gold/20 border-coc-gold text-coc-gold',
        isFumble && 'bg-coc-blood/20 border-coc-blood text-coc-blood',
        !isCritical && !isFumble && isSuccess && 'bg-coc-gold/10 border-coc-gold/30 text-coc-gold',
        !isCritical && !isFumble && !isSuccess && 'bg-coc-blood/10 border-coc-blood/30 text-coc-blood',
        className
      )}
    >
      <span>{result}</span>
      <span className="text-xs opacity-60">{type}</span>
    </span>
  );
}

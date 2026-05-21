import { useEffect, useRef, forwardRef } from 'react';
import { cn } from '@lib/utils';
import { animateBreathe } from '@lib/animation';

interface BreathePulseProps {
  children: React.ReactNode;
  className?: string;
}

export const BreathePulse = forwardRef<HTMLDivElement, BreathePulseProps>(
  ({ children, className }, ref) => {
    const localRef = useRef<HTMLDivElement>(null);
    const actualRef = (ref as React.RefObject<HTMLDivElement>) || localRef;

    useEffect(() => {
      if (actualRef.current) {
        animateBreathe(actualRef.current);
      }
    }, []);

    return (
      <div ref={actualRef} className={cn('inline-block', className)}>
        {children}
      </div>
    );
  }
);

BreathePulse.displayName = 'BreathePulse';

/**
 * 呼吸灯指示器（用于状态/在线标记）
 */
interface BreatheIndicatorProps {
  color?: 'gold' | 'blood' | 'madness' | 'green';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorStyles = {
  gold: 'bg-coc-gold shadow-[0_0_8px_rgba(201,162,39,0.5)]',
  blood: 'bg-coc-blood shadow-[0_0_8px_rgba(139,38,53,0.5)]',
  madness: 'bg-coc-madness shadow-[0_0_8px_rgba(107,76,122,0.5)]',
  green: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
};

const sizeStyles = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function BreatheIndicator({
  color = 'gold',
  size = 'md',
  className,
}: BreatheIndicatorProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      animateBreathe(ref.current);
    }
  }, []);

  return (
    <span
      ref={ref}
      className={cn(
        'inline-block rounded-full',
        colorStyles[color],
        sizeStyles[size],
        className
      )}
    />
  );
}

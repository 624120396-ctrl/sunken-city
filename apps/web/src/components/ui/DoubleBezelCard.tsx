import { cn } from '@lib/utils';
import { forwardRef } from 'react';

interface DoubleBezelCardProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  variant?: 'default' | 'gold' | 'blood' | 'madness';
  glow?: boolean;
  runeCorners?: boolean;
}

const variantStyles = {
  default: {
    outer: 'ring-coc-void/50',
    inner: 'border-coc-void/30',
    glowColor: 'rgba(42, 42, 53, 0.2)',
  },
  gold: {
    outer: 'ring-coc-gold/20',
    inner: 'border-coc-gold/10',
    glowColor: 'rgba(201, 162, 39, 0.15)',
  },
  blood: {
    outer: 'ring-coc-blood/20',
    inner: 'border-coc-blood/10',
    glowColor: 'rgba(139, 38, 53, 0.15)',
  },
  madness: {
    outer: 'ring-coc-madness/20',
    inner: 'border-coc-madness/10',
    glowColor: 'rgba(107, 76, 122, 0.15)',
  },
};

export const DoubleBezelCard = forwardRef<HTMLDivElement, DoubleBezelCardProps>(
  ({ children, className, innerClassName, variant = 'default', glow = false, runeCorners = false }, ref) => {
    const styles = variantStyles[variant];

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-[2rem] p-[1px]',
          'ring-1 ring-inset',
          styles.outer,
          glow && 'shadow-lg',
          className
        )}
        style={
          glow
            ? {
                boxShadow: `0 0 30px ${styles.glowColor}, inset 0 1px 1px rgba(255,255,255,0.05)`,
              }
            : undefined
        }
      >
        <div
          className={cn(
            'relative rounded-[calc(2rem-1px)]',
            'bg-coc-surface/95',
            'border border-inset',
            styles.inner,
            'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),inset_0_-1px_1px_rgba(0,0,0,0.2)]',
            runeCorners && 'overflow-hidden',
            innerClassName
          )}
        >
          {runeCorners && (
            <>
              <div className="absolute top-0 left-0 w-10 h-10 pointer-events-none opacity-10">
                <svg viewBox="0 0 40 40" fill="none">
                  <path d="M0 40 L0 0 L40 0" stroke="currentColor" strokeWidth="0.5" />
                  <circle cx="8" cy="8" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="absolute top-0 right-0 w-10 h-10 pointer-events-none opacity-10 rotate-90">
                <svg viewBox="0 0 40 40" fill="none">
                  <path d="M0 40 L0 0 L40 0" stroke="currentColor" strokeWidth="0.5" />
                  <circle cx="8" cy="8" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="absolute bottom-0 left-0 w-10 h-10 pointer-events-none opacity-10 -rotate-90">
                <svg viewBox="0 0 40 40" fill="none">
                  <path d="M0 40 L0 0 L40 0" stroke="currentColor" strokeWidth="0.5" />
                  <circle cx="8" cy="8" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none opacity-10 rotate-180">
                <svg viewBox="0 0 40 40" fill="none">
                  <path d="M0 40 L0 0 L40 0" stroke="currentColor" strokeWidth="0.5" />
                  <circle cx="8" cy="8" r="2" fill="currentColor" />
                </svg>
              </div>
            </>
          )}
          {children}
        </div>
      </div>
    );
  }
);

DoubleBezelCard.displayName = 'DoubleBezelCard';

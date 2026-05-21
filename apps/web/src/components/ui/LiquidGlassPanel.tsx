import { cn } from '@lib/utils';
import { forwardRef } from 'react';
import { isMobile } from '@lib/mobile';

interface LiquidGlassPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gold' | 'blood';
  blur?: boolean;
  fixed?: boolean;
}

const variantStyles = {
  default: {
    bg: 'bg-coc-abyss/60',
    border: 'border-coc-void/20',
    highlight: 'from-white/5',
  },
  gold: {
    bg: 'bg-coc-abyss/60',
    border: 'border-coc-gold/10',
    highlight: 'from-coc-gold/5',
  },
  blood: {
    bg: 'bg-coc-abyss/60',
    border: 'border-coc-blood/10',
    highlight: 'from-coc-blood/5',
  },
};

export const LiquidGlassPanel = forwardRef<HTMLDivElement, LiquidGlassPanelProps>(
  ({ children, className, variant = 'default', blur = true, fixed = false }, ref) => {
    const styles = variantStyles[variant];
    const mobile = isMobile();
    
    // 移动端禁用 blur
    const effectiveBlur = blur && !mobile;

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-2xl border',
          styles.bg,
          styles.border,
          effectiveBlur && 'backdrop-blur-xl',
          !effectiveBlur && 'bg-coc-abyss/85',
          fixed && 'fixed',
          className
        )}
        style={{
          background: effectiveBlur
            ? `linear-gradient(135deg, rgba(10,10,15,0.6) 0%, rgba(26,26,36,0.4) 100%)`
            : `linear-gradient(135deg, rgba(10,10,15,0.85) 0%, rgba(26,26,36,0.75) 100%)`,
        }}
      >
        {/* 高光边缘 */}
        <div 
          className={cn(
            'absolute inset-0 rounded-2xl pointer-events-none',
            'bg-gradient-to-b from-transparent to-transparent',
            styles.highlight
          )}
          style={{
            background: `linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.1) 100%)`,
          }}
        />
        
        {/* 内容 */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }
);

LiquidGlassPanel.displayName = 'LiquidGlassPanel';

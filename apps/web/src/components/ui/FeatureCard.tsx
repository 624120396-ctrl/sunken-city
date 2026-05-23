import { cn } from '@lib/utils';
import { forwardRef } from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  onClick?: () => void;
  href?: string;
  className?: string;
  iconClassName?: string;
  /** 背景图路径，默认使用深渊触手背景 */
  bgImage?: string;
  /** 磨砂玻璃强度 */
  blurStrength?: 'light' | 'medium' | 'heavy';
  /** 遮罩暗度 */
  overlayOpacity?: number;
}

export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ icon: Icon, title, subtitle, onClick, href, className, iconClassName, bgImage = '/images/card-bg-tentacle.png', blurStrength = 'medium', overlayOpacity = 0.25 }, ref) => {
    const Wrapper = href ? motion.a : motion.div;
    const wrapperProps = href
      ? { href, onClick }
      : { onClick };

    const blurClass = {
      light: 'backdrop-blur-[2px]',
      medium: 'backdrop-blur-[6px]',
      heavy: 'backdrop-blur-[12px]',
    }[blurStrength];

    return (
      <Wrapper
        ref={ref as any}
        {...wrapperProps}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'relative block overflow-hidden rounded-xl',
          'border border-white/[0.08]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.06)]',
          'cursor-pointer select-none',
          'group',
          className
        )}
      >
        {/* 背景图层 */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
          style={{ backgroundImage: `url(${bgImage})` }}
        />

        {/* 暗角遮罩 — 增强深渊感 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-transparent to-coc-blood/20 pointer-events-none" />

        {/* 磨砂玻璃前景层 */}
        <div
          className={cn(
            'absolute inset-0',
            blurStrength === 'medium' ? 'backdrop-blur-md' : blurClass,
            'bg-black/[var(--overlay)]',
          )}
          style={{ '--overlay': overlayOpacity } as React.CSSProperties}
        />

        {/* 顶部微光 */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* 内容层 */}
        <div className="relative p-5 z-10">
          {/* 图标容器 — 磨砂玻璃质感 */}
          <div
            className={cn(
              'w-10 h-10 rounded-lg',
              'flex items-center justify-center',
              'bg-white/[0.06]',
              'border border-white/[0.12]',
              'backdrop-blur-sm',
              'shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)]',
              'group-hover:bg-white/[0.10] group-hover:border-coc-gold/30',
              'transition-all duration-300',
              iconClassName
            )}
          >
            <Icon
              size={20}
              className="text-coc-gold/90 group-hover:text-coc-glow transition-colors duration-300"
              strokeWidth={1.5}
            />
          </div>

          {/* 标题 */}
          <h3 className="mt-3.5 font-ritual font-bold text-sm text-coc-parchment tracking-wide group-hover:text-coc-gold-glow transition-colors duration-300 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]">
            {title}
          </h3>

          {/* 副标题 */}
          <p className="mt-1 text-xs text-coc-text-secondary group-hover:text-coc-parchment-dim transition-colors duration-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            {subtitle}
          </p>
        </div>

        {/* 底部边缘光 */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-coc-gold/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* 悬停时边框高亮 */}
        <div className="absolute inset-0 rounded-xl border border-coc-gold/0 group-hover:border-coc-gold/20 transition-colors duration-500 pointer-events-none" />
      </Wrapper>
    );
  }
);

FeatureCard.displayName = 'FeatureCard';

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
  /** 背景图路径 */
  bgImage?: string;
}

export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ icon: Icon, title, subtitle, onClick, href, className, iconClassName, bgImage = '/images/card-bg-tentacle.png' }, ref) => {
    const Wrapper = href ? motion.a : motion.div;
    const wrapperProps = href ? { href, onClick } : { onClick };

    return (
      <Wrapper
        ref={ref as any}
        {...wrapperProps}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'relative block overflow-hidden rounded-xl',
          'border border-white/[0.06]',
          'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
          'cursor-pointer select-none',
          'group',
          className
        )}
      >
        {/* 背景图 — 全尺寸覆盖 */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ backgroundImage: `url(${bgImage})` }}
        />

        {/* 磨砂玻璃内容层 — 唯一的前景层，不额外加遮罩 */}
        <div
          className={cn(
            'relative m-2 rounded-lg p-5',
            'bg-white/[0.03] backdrop-blur-[10px]',
            'border border-white/[0.08]',
            'shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_1px_rgba(255,255,255,0.04)]',
            'transition-all duration-300',
            'group-hover:bg-white/[0.05] group-hover:border-white/[0.12]'
          )}
        >
          {/* 图标容器 */}
          <div
            className={cn(
              'w-10 h-10 rounded-lg',
              'flex items-center justify-center',
              'bg-white/[0.06]',
              'border border-white/[0.10]',
              'backdrop-blur-sm',
              'group-hover:bg-white/[0.10] group-hover:border-coc-gold/25',
              'transition-all duration-300',
              iconClassName
            )}
          >
            <Icon
              size={20}
              className="text-coc-gold/90 group-hover:text-coc-gold transition-colors duration-300"
              strokeWidth={1.5}
            />
          </div>

          {/* 标题 — 强阴影确保在模糊背景上可读 */}
          <h3
            className="mt-3.5 font-ritual font-bold text-sm text-coc-parchment tracking-wide group-hover:text-coc-gold-glow transition-colors duration-300"
            style={{ textShadow: '0 1px 8px rgba(0,0,0,0.7), 0 0 1px rgba(0,0,0,0.5)' }}
          >
            {title}
          </h3>

          {/* 副标题 */}
          <p
            className="mt-1 text-xs text-coc-text-secondary group-hover:text-coc-parchment-dim transition-colors duration-300"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
          >
            {subtitle}
          </p>
        </div>

        {/* 悬停时边框微光 */}
        <div className="absolute inset-0 rounded-xl border border-coc-gold/0 group-hover:border-coc-gold/15 transition-colors duration-500 pointer-events-none" />
      </Wrapper>
    );
  }
);

FeatureCard.displayName = 'FeatureCard';

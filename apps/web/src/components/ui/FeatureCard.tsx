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
  /** 暗红渐变方向: 'default' 左上到右下, 'reverse' 反向 */
  gradient?: 'default' | 'subtle' | 'warm';
  /** 是否显示右上角的微光效果 */
  glow?: boolean;
}

const gradientMap = {
  default: 'from-[#141018] via-[#1a1018] to-[#241018]',
  subtle: 'from-[#111118] via-[#141018] to-[#181018]',
  warm: 'from-[#181015] via-[#1e1015] to-[#281018]',
};

export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ icon: Icon, title, subtitle, onClick, href, className, iconClassName, gradient = 'default', glow = false }, ref) => {
    const Wrapper = href ? motion.a : motion.div;
    const wrapperProps = href
      ? { href, onClick }
      : { onClick };

    return (
      <Wrapper
        ref={ref as any}
        {...wrapperProps}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'relative block overflow-hidden rounded-xl',
          'bg-gradient-to-br',
          gradientMap[gradient],
          'border border-[#2a2020]/60',
          'shadow-[0_4px_24px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.03)]',
          'cursor-pointer select-none',
          'group',
          className
        )}
      >
        {/* 顶部微光装饰 */}
        {glow && (
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-coc-gold/5 rounded-full blur-3xl pointer-events-none group-hover:bg-coc-gold/10 transition-colors duration-500" />
        )}

        {/* 左上到左下的暗红渐变叠加层 */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-coc-blood/5 pointer-events-none" />

        <div className="relative p-5">
          {/* 图标容器 */}
          <div
            className={cn(
              'w-10 h-10 rounded-lg',
              'flex items-center justify-center',
              'bg-[#0f0f14]/80',
              'border border-coc-gold/30',
              'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
              'group-hover:border-coc-gold/50 group-hover:bg-[#0f0f14]',
              'transition-all duration-300',
              iconClassName
            )}
          >
            <Icon
              size={20}
              className="text-coc-gold/80 group-hover:text-coc-gold transition-colors duration-300"
              strokeWidth={1.5}
            />
          </div>

          {/* 标题 */}
          <h3 className="mt-3.5 font-ritual font-bold text-sm text-coc-parchment tracking-wide group-hover:text-coc-gold-glow transition-colors duration-300">
            {title}
          </h3>

          {/* 副标题 */}
          <p className="mt-1 text-xs text-coc-text-muted group-hover:text-coc-text-secondary transition-colors duration-300">
            {subtitle}
          </p>
        </div>

        {/* 底部边缘微光 */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-coc-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </Wrapper>
    );
  }
);

FeatureCard.displayName = 'FeatureCard';

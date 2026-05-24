import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==================== 金色装饰线 / 分隔线 ====================
interface GoldLineProps {
  variant?: 'horizontal' | 'vertical' | 'gradient' | 'shimmer';
  className?: string;
  glow?: boolean;
}

export const GoldLine: React.FC<GoldLineProps> = ({ variant = 'horizontal', className, glow = false }) => {
  const baseClasses = cn(
    'pointer-events-none',
    variant === 'horizontal' && 'h-[2px] w-full',
    variant === 'vertical' && 'w-[2px] h-full',
    variant === 'gradient' && 'h-[2px] w-full bg-gradient-to-r from-transparent via-[#c9a227]/70 to-transparent',
    variant === 'shimmer' && 'h-[2px] w-full relative overflow-hidden',
    glow && 'shadow-[0_0_12px_rgba(201,162,39,0.5)]',
    className
  );

  if (variant === 'shimmer') {
    return (
      <div className={baseClasses}>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c9a227]/50 to-transparent" />
        <div className="shimmer-line" />
      </div>
    );
  }

  return <div className={baseClasses} />;
};

// ==================== 四角装饰 ====================
interface CornerOrnamentProps {
  position: 'tl' | 'tr' | 'bl' | 'br';
  size?: 'sm' | 'md' | 'lg';
  glow?: boolean;
  className?: string;
}

export const CornerOrnament: React.FC<CornerOrnamentProps> = ({ position, size = 'md', glow = false, className }) => {
  const sizeMap = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const posClasses = {
    tl: 'top-0 left-0 border-t border-l',
    tr: 'top-0 right-0 border-t border-r',
    bl: 'bottom-0 left-0 border-b border-l',
    br: 'bottom-0 right-0 border-b border-r',
  };

  return (
    <div
      className={cn(
        'absolute pointer-events-none',
        sizeMap[size],
        posClasses[position],
        'border-[#c9a227]/20',
        glow && 'border-[#c9a227]/50',
        className
      )}
    />
  );
};

// ==================== 标题装饰（下划线+两侧） ====================
interface TitleOrnamentProps {
  children: React.ReactNode;
  className?: string;
  lineClassName?: string;
}

export const TitleOrnament: React.FC<TitleOrnamentProps> = ({ children, className, lineClassName }) => {
  return (
    <div className={cn('relative inline-flex items-center gap-3', className)}>
      <GoldLine variant="gradient" className={cn('w-14', lineClassName)} glow />
      {children}
      <GoldLine variant="gradient" className={cn('w-14', lineClassName)} glow />
    </div>
  );
};

// ==================== 统一导出 ====================
export const GoldOrnament = {
  Line: GoldLine,
  Corner: CornerOrnament,
  Title: TitleOrnament,
};

export default GoldOrnament;

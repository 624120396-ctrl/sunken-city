import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnimatedBorderProps {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  active?: boolean; // 持续旋转
  color?: 'gold' | 'blood' | 'multi';
  speed?: number; // 秒/圈
}

const colorMap = {
  gold: '#c9a227',
  blood: '#8b2635',
  multi: null, // conic-gradient 用多色
};

export const AnimatedBorder = React.forwardRef<HTMLDivElement, AnimatedBorderProps>(
  ({ children, className, innerClassName, active = false, color = 'gold', speed = 4 }, ref) => {
    const c = colorMap[color];
    const gradient = c
      ? `conic-gradient(from var(--angle), #2a2a35, ${c}, #2a2a35, ${c}, #2a2a35)`
      : `conic-gradient(from var(--angle), #2a2a35, #c9a227, #8b2635, #2a2a35)`;

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-lg',
          active && 'animated-border-rotate',
          className
        )}
        style={
          active
            ? {
                '--angle': '0deg',
                animation: `rotate-border ${speed}s linear infinite`,
              } as React.CSSProperties
            : undefined
        }
      >
        {/* 旋转边框层（非active时hover触发） */}
        {!active && (
          <div
            className="absolute -inset-[2px] rounded-[10px] opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: gradient,
              zIndex: -1,
              animation: `rotate-border ${speed}s linear infinite`,
            }}
          />
        )}

        {/* 内层背景（遮挡边框中心） */}
        <div
          className={cn(
            'relative bg-[#12121a] rounded-lg',
            innerClassName
          )}
        >
          {children}
        </div>
      </div>
    );
  }
);

AnimatedBorder.displayName = 'AnimatedBorder';

import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CthulhuCard3DProps {
  children: React.ReactNode;
  variant?: 'abyss' | 'blood' | 'gold' | 'parchment';
  className?: string;
  innerClassName?: string;
  noTilt?: boolean;
  glowOnHover?: boolean;
  depth?: number;
  as?: React.ElementType;
}

const variantStyles = {
  abyss: {
    bg: 'bg-[#12121a]',
    border: 'border-[#2a2a35]',
    borderHover: 'hover:border-[#c9a227]/20',
    topLight: 'via-[#c9a227]/40',
    texture: 'tentacle-texture',
  },
  blood: {
    bg: 'bg-[#0f0a0a]',
    border: 'border-[#8b2635]/30',
    borderHover: 'hover:border-[#8b2635]/50',
    topLight: 'via-[#8b2635]/40',
    texture: '',
  },
  gold: {
    bg: 'bg-[#1a1710]',
    border: 'border-[#c9a227]/20',
    borderHover: 'hover:border-[#c9a227]/40',
    topLight: 'via-[#c9a227]/50',
    texture: 'gold-grain',
  },
  parchment: {
    bg: 'bg-[#1a1a24]',
    border: 'border-[#6b6558]/20',
    borderHover: 'hover:border-[#c9a227]/15',
    topLight: 'via-[#6b6558]/30',
    texture: 'gold-grain',
  },
};

export const CthulhuCard3D = React.forwardRef<HTMLDivElement, CthulhuCard3DProps>(
  (
    {
      children,
      variant = 'abyss',
      className,
      innerClassName,
      noTilt = false,
      glowOnHover = true,
      depth = 20,
      as: Component = 'div',
    },
    forwardedRef
  ) => {
    const localRef = useRef<HTMLDivElement>(null);
    const ref = (forwardedRef as React.RefObject<HTMLDivElement | null>) || localRef;
    const [rotateX, setRotateX] = useState(0);
    const [rotateY, setRotateY] = useState(0);
    const [glow, setGlow] = useState(false);
    const v = variantStyles[variant];

    const handleMouseMove = useCallback(
      (e: React.MouseEvent) => {
        if (noTilt || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setRotateX(y * -12);
        setRotateY(x * 12);
      },
      [noTilt, ref]
    );

    const handleMouseEnter = useCallback(() => {
      if (glowOnHover) setGlow(true);
    }, [glowOnHover]);

    const handleMouseLeave = useCallback(() => {
      setRotateX(0);
      setRotateY(0);
      setGlow(false);
    }, []);

    return (
      <motion.div
        ref={ref as React.LegacyRef<HTMLDivElement>}
        className={cn('relative', className)}
        style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        animate={{
          rotateX,
          rotateY,
          scale: glow ? 1.02 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* 边框发光层 */}
        {glowOnHover && (
          <div
            className="absolute -inset-[1px] rounded-lg transition-opacity duration-500 pointer-events-none"
            style={{
              opacity: glow ? 0.6 : 0,
              background: `conic-gradient(from 0deg, transparent, ${variant === 'blood' ? '#8b2635' : '#c9a227'}, transparent, ${variant === 'blood' ? '#8b2635' : '#c9a227'}, transparent)`,
              filter: 'blur(4px)',
              zIndex: -1,
            }}
          />
        )}

        {/* 主卡片体 */}
        <Component
          className={cn(
            'relative rounded-lg overflow-hidden backdrop-blur-sm',
            v.bg,
            'border',
            v.border,
            v.borderHover,
            v.texture,
            'transition-colors duration-300',
            innerClassName
          )}
          style={{ transform: `translateZ(${depth}px)` }}
        >
          {/* 程序化噪点纹理 */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* 顶部金色光带 */}
          <div
            className={cn(
              'absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent to-transparent pointer-events-none',
              v.topLight
            )}
          />

          {/* 四角装饰 */}
          <div className={cn('corner-accent corner-accent-tl', glow && 'corner-accent-glow')} />
          <div className={cn('corner-accent corner-accent-tr', glow && 'corner-accent-glow')} />
          <div className={cn('corner-accent corner-accent-bl', glow && 'corner-accent-glow')} />
          <div className={cn('corner-accent corner-accent-br', glow && 'corner-accent-glow')} />

          {/* 内容层 */}
          <div style={{ transform: `translateZ(${depth + 10}px)` }}>
            {children}
          </div>
        </Component>
      </motion.div>
    );
  }
);

CthulhuCard3D.displayName = 'CthulhuCard3D';

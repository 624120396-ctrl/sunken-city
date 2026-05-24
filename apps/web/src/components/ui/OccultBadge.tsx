import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type OccultType = 'eye' | 'eye2' | 'moon' | 'sun' | 'skull' | 'crown';
type BadgeSize = 'sm' | 'md' | 'lg';

interface OccultBadgeProps {
  type: OccultType;
  size?: BadgeSize;
  glow?: boolean;
  pulse?: boolean;
  className?: string;
  label?: string;
}

const typeConfig: Record<OccultType, { src: string; fallback: string; glowColor: string }> = {
  eye: {
    src: '/images/occult-eye.png',
    fallback: '👁',
    glowColor: 'rgba(201, 162, 39, 0.4)',
  },
  eye2: {
    src: '/images/occult-eye-2.png',
    fallback: '👁️‍🗨️',
    glowColor: 'rgba(107, 76, 122, 0.4)',
  },
  moon: {
    src: '/images/occult-moon.png',
    fallback: '🌙',
    glowColor: 'rgba(107, 76, 122, 0.4)',
  },
  sun: {
    src: '/images/occult-sun.png',
    fallback: '☀️',
    glowColor: 'rgba(201, 162, 39, 0.4)',
  },
  skull: {
    src: '/images/occult-skull.png',
    fallback: '💀',
    glowColor: 'rgba(139, 38, 53, 0.4)',
  },
  crown: {
    src: '/images/occult-death-crown.png',
    fallback: '👑',
    glowColor: 'rgba(201, 162, 39, 0.4)',
  },
};

const sizeMap: Record<BadgeSize, string> = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

const ringMap: Record<BadgeSize, string> = {
  sm: 'border',
  md: 'border-2',
  lg: 'border-[3px]',
};

export const OccultBadge: React.FC<OccultBadgeProps> = ({
  type,
  size = 'md',
  glow = false,
  pulse = false,
  className,
  label,
}) => {
  const config = typeConfig[type];

  return (
    <motion.div
      className={cn('relative inline-flex flex-col items-center gap-1', className)}
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <div
        className={cn(
          'relative rounded-full overflow-hidden flex items-center justify-center',
          sizeMap[size],
          ringMap[size],
          'border-[#2a2a35]',
          'bg-[#12121a]',
          glow && 'border-[#c9a227]/30',
        )}
        style={
          glow
            ? {
                boxShadow: `0 0 12px ${config.glowColor}`,
              }
            : undefined
        }
      >
        {pulse && (
          <motion.div
            className="absolute inset-0 rounded-full"
            animate={{
              boxShadow: [
                `0 0 0px ${config.glowColor}00`,
                `0 0 12px ${config.glowColor}`,
                `0 0 0px ${config.glowColor}00`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        <img
          src={config.src}
          alt={type}
          className="w-3/4 h-3/4 object-contain"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              const fallback = document.createElement('span');
              fallback.textContent = config.fallback;
              fallback.className = 'text-sm';
              parent.appendChild(fallback);
            }
          }}
        />
      </div>
      {label && (
        <span className="text-[10px] text-[#6b6558] uppercase tracking-wider">{label}</span>
      )}
    </motion.div>
  );
};

// ==================== Occult 纹理蒙版组件 ====================
interface OccultMaskProps {
  type: OccultType;
  children: React.ReactNode;
  className?: string;
  maskOpacity?: number;
}

export const OccultMask: React.FC<OccultMaskProps> = ({
  type,
  children,
  className,
  maskOpacity = 0.05,
}) => {
  const config = typeConfig[type];

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        maskImage: `url(${config.src})`,
        maskSize: 'contain',
        maskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskImage: `url(${config.src})`,
        WebkitMaskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        opacity: maskOpacity,
      }}
    >
      {children}
    </div>
  );
};

export default OccultBadge;

import React from 'react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==================== XP / 等级进度条 ====================
interface XPProgressProps {
  current: number;
  max: number;
  label?: string;
  className?: string;
}

const XPProgressComponent: React.FC<XPProgressProps> = ({ current, max, label, className }) => {
  const progress = Math.min((current / max) * 100, 100);

  return (
    <div className={cn('w-full', className)}>
      <div className="h-2 bg-[#1a1a24] rounded-full overflow-hidden border border-[#2a2a35]/50">
        <motion.div
          className="h-full rounded-full relative overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, #8b6914 0%, #c9a227 50%, #e8d4a0 100%)',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          {/* 流光扫过 */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* 顶端粒子溢出 */}
          <div
            className="absolute -top-1 right-0 w-2 h-3 rounded-full blur-sm"
            style={{ background: '#c9a227', opacity: 0.6 }}
          />
        </motion.div>
      </div>
      {label && (
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-[#6b6558]">{label}</span>
          <span className="text-[#c9a227] font-medium">{current} / {max}</span>
        </div>
      )}
    </div>
  );
};

// ==================== HP / MP / SAN 状态条 ====================
interface StatusBarProps {
  type: 'hp' | 'mp' | 'san';
  current: number;
  max: number;
  showValue?: boolean;
  className?: string;
}

const statusConfig = {
  hp: {
    fill: ['#4a1515', '#8b2635'],
    glow: '#8b2635',
    label: 'HP',
  },
  mp: {
    fill: ['#0a1a2a', '#1a3a5a'],
    glow: '#3a6a9a',
    label: 'MP',
  },
  san: {
    fill: ['#2a0a3a', '#5a1a7a'],
    glow: '#7a3a9a',
    label: 'SAN',
  },
};

const StatusBarComponent: React.FC<StatusBarProps> = ({ type, current, max, showValue = true, className }) => {
  const config = statusConfig[type];
  const progress = Math.min((current / max) * 100, 100);
  const isLow = progress < 30;
  const [displayValue, setDisplayValue] = React.useState(current);

  React.useEffect(() => {
    setDisplayValue(current);
  }, [current]);

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'h-2 rounded-full overflow-hidden',
          isLow && 'pulse-glow'
        )}
        style={{
          background: '#1a1a24',
          boxShadow: isLow ? `0 0 8px ${config.glow}40` : 'none',
        }}
      >
        <motion.div
          className="h-full rounded-full relative"
          style={{
            background: `linear-gradient(90deg, ${config.fill[0]}, ${config.fill[1]})`,
          }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          {isLow && (
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  `0 0 0px ${config.glow}00`,
                  `0 0 12px ${config.glow}60`,
                  `0 0 0px ${config.glow}00`,
                ],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>
      {showValue && (
        <div className="flex justify-between mt-0.5 text-xs">
          <span className="text-[#6b6558]">{config.label}</span>
          <motion.span
            key={displayValue}
            initial={{ scale: 1.3, color: '#fff' }}
            animate={{ scale: 1, color: isLow ? '#8b2635' : '#6b6558' }}
            className="font-medium"
          >
            {current}/{max}
          </motion.span>
        </div>
      )}
    </div>
  );
};

// ==================== 收集进度条（分段格子） ====================
interface CollectionProgressProps {
  collected: number;
  total: number;
  label?: string;
  className?: string;
}

const CollectionProgressComponent: React.FC<CollectionProgressProps> = ({
  collected,
  total,
  label,
  className,
}) => {
  const segments = Array.from({ length: total }, (_, i) => i < collected);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <div className="flex justify-between text-sm">
          <span className="text-[#6b6558]">{label}</span>
          <span className="text-[#c9a227] font-medium">
            {collected}/{total}
          </span>
        </div>
      )}
      <div className="flex gap-1">
        {segments.map((isCollected, i) => (
          <motion.div
            key={i}
            className="h-2 flex-1 rounded-full"
            style={{
              background: isCollected
                ? 'linear-gradient(90deg, #8b6914, #c9a227)'
                : '#1a1a24',
            }}
            initial={isCollected ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
          >
            {isCollected && (
              <motion.div
                className="w-full h-full rounded-full"
                animate={{
                  boxShadow: [
                    '0 0 0px #c9a22700',
                    '0 0 4px #c9a22760',
                    '0 0 0px #c9a22700',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ==================== 统一导出组件 ====================
interface CthulhuProgressProps {
  type: 'xp' | 'status' | 'collection';
  variant?: 'hp' | 'mp' | 'san';
  current?: number;
  max?: number;
  collected?: number;
  total?: number;
  label?: string;
  className?: string;
}

export const CthulhuProgress: React.FC<CthulhuProgressProps> = ({
  type,
  variant = 'hp',
  current = 0,
  max = 100,
  collected = 0,
  total = 10,
  label,
  className,
}) => {
  if (type === 'xp') {
    return <XPProgressComponent current={current} max={max} label={label} className={className} />;
  }
  if (type === 'status') {
    return <StatusBarComponent type={variant} current={current} max={max} className={className} />;
  }
  return <CollectionProgressComponent collected={collected} total={total} label={label} className={className} />;
};

// 命名导出
export { XPProgressComponent as XPProgress, StatusBarComponent as StatusBar, CollectionProgressComponent as CollectionProgress };

export default CthulhuProgress;

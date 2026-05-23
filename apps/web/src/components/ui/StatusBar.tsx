import { motion, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';
import { Tooltip } from '@components/ui/Tooltip';

interface StatusBarProps {
  label: string;
  current: number;
  max: number;
  color: 'red' | 'cyan' | 'gold';
  tooltip?: string;
}

const colorConfig = {
  red: {
    bg: '#8b2635',
    dim: 'var(--coc-blood-soft)',
    text: 'text-coc-blood',
  },
  cyan: {
    bg: '#3b82f6',
    dim: 'var(--coc-ether-soft)',
    text: 'text-coc-ether',
  },
  gold: {
    bg: '#c9a227',
    dim: 'var(--coc-gold-glow)',
    text: 'text-coc-gold',
  },
};

export function StatusBar({ label, current, max, color, tooltip }: StatusBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const isCritical = percentage < 30 && color === 'red';
  const isLow = percentage < 30;

  // 弹簧动画
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 120, damping: 20 });
  const [displayWidth, setDisplayWidth] = useState(0);

  useEffect(() => {
    motionVal.set(percentage);
  }, [percentage, motionVal]);

  useEffect(() => {
    const unsub = springVal.on('change', (v) => setDisplayWidth(v));
    return unsub;
  }, [springVal]);

  const cfg = colorConfig[color];

  const barContent = (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"
           style={{
             color: isLow ? cfg.bg : 'var(--coc-text-muted)',
             transition: 'color 0.3s ease',
           }}>
        <span>{label}</span>
        <motion.span
          key={`${current}/${max}`}
          initial={{ opacity: 0, y: -1 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {current}/{max}
        </motion.span>
      </div>
      <div
        className="h-2 bg-coc-bg rounded-full overflow-hidden"
        style={{
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            width: `${displayWidth}%`,
            background: cfg.bg,
            boxShadow: `0 0 6px ${cfg.bg}66`,
          }}
          animate={isCritical ? {
            opacity: [1, 0.6, 1],
          } : {}}
          transition={isCritical ? {
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          } : {}}
        />
      </div>
    </div>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{barContent}</Tooltip>;
  }
  return barContent;
}

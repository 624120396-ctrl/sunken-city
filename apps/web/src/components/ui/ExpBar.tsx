import { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'motion/react';

interface ExpBarProps {
  current: number;
  max: number;
  color?: string;
  showPercentage?: boolean;
}

export function ExpBar({ current, max, color = '#c9a227', showPercentage = true }: ExpBarProps) {
  const targetPercentage = Math.max(0, Math.min(100, max > 0 ? (current / max) * 100 : 0));
  const isNearFull = targetPercentage >= 90;

  // 弹簧动画驱动的宽度
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const [displayWidth, setDisplayWidth] = useState(0);

  useEffect(() => {
    motionVal.set(targetPercentage);
  }, [targetPercentage, motionVal]);

  useEffect(() => {
    const unsub = springVal.on('change', (v) => setDisplayWidth(v));
    return unsub;
  }, [springVal]);

  // 衍生色
  const glowColor = adjustBrightness(color, 30);
  const shadowColor = adjustBrightness(color, -40);

  return (
    <div className="w-full group">
      <div
        className="relative h-4 rounded-full overflow-hidden border-2"
        style={{
          borderColor: isNearFull ? `${color}88` : 'var(--coc-border)',
          boxShadow: isNearFull
            ? `0 0 8px 0px ${color}44`
            : `inset 0 2px 6px rgba(0,0,0,0.6)`,
          background: `
            linear-gradient(180deg, var(--coc-bg) 0%, var(--coc-bg-elevated) 100%),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 8px)
          `,
        }}
      >
        {/* 刻度符文 */}
        <div className="absolute inset-0 flex items-center justify-between px-2 opacity-15 pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="w-[1px] h-1.5"
              style={{
                background: `linear-gradient(180deg, transparent 0%, ${color} 50%, transparent 100%)`,
              }}
            />
          ))}
        </div>

        {/* 填充条 — motion spring */}
        <motion.div
          className="absolute top-0 left-0 h-full overflow-hidden"
          style={{
            width: `${displayWidth}%`,
            background: `linear-gradient(90deg, ${shadowColor} 0%, ${color} 40%, ${glowColor} 100%)`,
            boxShadow: `4px 0 10px -2px ${color}44`,
          }}
        >
          {/* 顶部熔融高光 */}
          <div
            className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
            }}
          />
        </motion.div>

        {/* 百分比文字 */}
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none">
            <motion.span
              key={Math.round(targetPercentage)}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] font-black tracking-widest uppercase"
              style={{
                color: isNearFull ? '#fff' : 'rgba(212,197,168,0.85)',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {Math.round(targetPercentage)}%
            </motion.span>
          </div>
        )}
      </div>
    </div>
  );
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return (
    '#' +
    (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
  );
}

interface ExpBarProps {
  current: number;
  max: number;
  color?: string;
  showPercentage?: boolean;
}

export function ExpBar({ current, max, color = '#c9a227', showPercentage = true }: ExpBarProps) {
  const percentage = Math.max(0, Math.min(100, max > 0 ? (current / max) * 100 : 0));
  const isNearFull = percentage >= 90;

  // 将主色转换为更深、更亮的两个衍生色
  const deepColor = color; // 保持原色作为基准
  const glowColor = adjustBrightness(color, 30); // 更亮的辉光色
  const shadowColor = adjustBrightness(color, -40); // 更深的阴影色

  return (
    <div className="w-full">
      {/* 注入克苏鲁主题自定义动画 */}
      <style>{`
        @keyframes eldritchWave1 {
          0% { transform: translate(-50%, -50%) rotate(0deg); border-radius: 40% 60% 55% 45% / 55% 45% 55% 45%; }
          50% { transform: translate(-50%, -50%) rotate(180deg); border-radius: 55% 45% 40% 60% / 45% 55% 45% 55%; }
          100% { transform: translate(-50%, -50%) rotate(360deg); border-radius: 40% 60% 55% 45% / 55% 45% 55% 45%; }
        }
        @keyframes eldritchWave2 {
          0% { transform: translate(-50%, -50%) rotate(0deg); border-radius: 45% 55% 50% 50% / 50% 40% 60% 50%; }
          50% { transform: translate(-50%, -50%) rotate(-180deg); border-radius: 55% 45% 45% 55% / 40% 50% 50% 60%; }
          100% { transform: translate(-50%, -50%) rotate(-360deg); border-radius: 45% 55% 50% 50% / 50% 40% 60% 50%; }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(300%) skewX(-20deg); }
        }
        @keyframes heartbeat {
          0%, 100% { box-shadow: 0 0 6px 0px ${color}66, inset 0 0 8px 0px ${color}22; transform: scale(1); }
          50% { box-shadow: 0 0 14px 2px ${color}aa, inset 0 0 12px 1px ${color}44; transform: scale(1.015); }
        }
        @keyframes emberDrift {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-6px) scale(1.2); opacity: 1; }
        }
      `}</style>

      <div
        className={[
          'relative h-4 rounded-full overflow-hidden border-2 transition-all duration-500',
          isNearFull ? 'border-white/20' : 'border-white/5',
        ].join(' ')}
        style={{
          borderColor: isNearFull ? `${color}cc` : `${color}44`,
          boxShadow: isNearFull
            ? `0 0 10px 1px ${color}77, inset 0 0 12px ${color}33`
            : `inset 0 2px 6px rgba(0,0,0,0.6)`,
          background: `
            linear-gradient(180deg, rgba(10,10,15,0.9) 0%, rgba(18,18,26,0.95) 100%),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 8px)
          `,
          animation: isNearFull ? 'heartbeat 1.8s ease-in-out infinite' : undefined,
        }}
      >
        {/* 背景刻度符文（古老仪器刻度感） */}
        <div className="absolute inset-0 flex items-center justify-between px-2 opacity-20 pointer-events-none">
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

        {/* 填充本体 */}
        <div
          className="absolute top-0 left-0 h-full transition-all duration-700 ease-out overflow-hidden"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${shadowColor} 0%, ${deepColor} 40%, ${glowColor} 100%)`,
            boxShadow: `4px 0 12px -2px ${color}66`,
          }}
        >
          {/* 深渊液面 - 主涌动 */}
          <div
            className="absolute top-1/2 left-1/2 w-[220%] h-[280%] opacity-30 mix-blend-overlay pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.45) 0%, transparent 55%)`,
              animation: 'eldritchWave1 6s linear infinite',
            }}
          />
          {/* 深渊液面 - 次涌动（反向） */}
          <div
            className="absolute top-1/2 left-1/2 w-[220%] h-[280%] opacity-25 mix-blend-overlay pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.5) 0%, transparent 50%)`,
              animation: 'eldritchWave2 4s linear infinite',
            }}
          />

          {/* 顶部熔融高光 */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)`,
            }}
          />

          {/* 斜向辉光扫过 */}
          <div
            className="absolute top-0 left-0 w-1/3 h-full opacity-40 pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)`,
              animation: 'shimmerSweep 3.5s ease-in-out infinite',
            }}
          />

          {/* 悬浮余烬微粒 */}
          {percentage > 15 && (
            <>
              <div
                className="absolute w-1 h-1 rounded-full pointer-events-none"
                style={{
                  left: '20%',
                  top: '10%',
                  background: glowColor,
                  filter: `blur(0.5px)`,
                  animation: 'emberDrift 2.2s ease-in-out infinite',
                }}
              />
              <div
                className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
                style={{
                  left: '60%',
                  top: '30%',
                  background: 'rgba(255,255,255,0.8)',
                  filter: `blur(0.3px)`,
                  animation: 'emberDrift 2.8s ease-in-out infinite 0.6s',
                }}
              />
              <div
                className="absolute w-1 h-1 rounded-full pointer-events-none"
                style={{
                  left: '85%',
                  top: '20%',
                  background: glowColor,
                  filter: `blur(0.5px)`,
                  animation: 'emberDrift 2.5s ease-in-out infinite 1.2s',
                }}
              />
            </>
          )}
        </div>

        {/* 百分比文字（内置） */}
        {showPercentage && (
          <div className="absolute inset-0 flex items-center justify-end pr-2">
            <span
              className="text-[10px] font-black tracking-widest uppercase drop-shadow"
              style={{
                color: isNearFull ? '#fff' : 'rgba(212,197,168,0.85)',
                textShadow: isNearFull ? `0 0 6px ${color}` : '0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// 简单的亮度调整辅助函数：hex → 亮度偏移 → hex
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

import React from 'react';

interface EldritchLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  variant?: 'blood' | 'gold' | 'madness';
  className?: string;
}

/**
 * EldritchLoader - 深渊加载动画 v1.1
 * 
 * 克苏鲁主题的加载动画，替代传统的转圈
 * 
 * @example
 * <EldritchLoader size="md" text="召唤中..." variant="blood" />
 */
export function EldritchLoader({
  size = 'md',
  text = '连接深渊...',
  variant = 'blood',
  className = '',
}: EldritchLoaderProps) {
  const sizeMap = {
    sm: { container: 'w-16 h-16', circle: 24, stroke: 2 },
    md: { container: 'w-24 h-24', circle: 36, stroke: 3 },
    lg: { container: 'w-32 h-32', circle: 48, stroke: 4 },
  };

  const colors = {
    blood: '#8b2635',
    gold: '#c9a227',
    madness: '#6b4c7a',
  };

  const { container, circle } = sizeMap[size];
  const color = colors[variant];

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* 加载动画容器 */}
      <div className={`${container} relative`}>
        {/* 外层符文环 */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          style={{ animationDuration: '8s' }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="0.5"
            strokeDasharray="10 20"
            opacity="0.3"
          />
        </svg>

        {/* 中层符文环 - 反向旋转 */}
        <svg
          className="absolute inset-0 w-full h-full animate-spin"
          style={{ animationDuration: '6s', animationDirection: 'reverse' }}
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            strokeDasharray="5 15"
            opacity="0.5"
          />
          {/* 符文标记 */}
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <circle
              key={i}
              cx={50 + 35 * Math.cos((angle * Math.PI) / 180)}
              cy={50 + 35 * Math.sin((angle * Math.PI) / 180)}
              r="2"
              fill={color}
              opacity="0.6"
            />
          ))}
        </svg>

        {/* 内层脉动环 */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
        >
          <circle
            cx="50"
            cy="50"
            r="25"
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            className="animate-pulse"
            opacity="0.7"
          />
        </svg>

        {/* 中心核心 - 呼吸效果 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="animate-breathe rounded-full"
            style={{
              width: circle * 0.4,
              height: circle * 0.4,
              background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
              opacity: 0.8,
            }}
          />
        </div>

        {/* 闪烁点 */}
        <div className="absolute inset-0">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full animate-pulse"
              style={{
                backgroundColor: color,
                top: `${20 + Math.random() * 60}%`,
                left: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 0.5}s`,
                opacity: 0.4,
              }}
            />
          ))}
        </div>
      </div>

      {/* 加载文字 */}
      {text && (
        <p className="text-sm font-rune text-coc-parchment-dim tracking-wider animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}

/**
 * HeartbeatLoader - 心跳式加载
 * 
 * 模拟紧张的心跳节奏
 */
export function HeartbeatLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="w-2 h-8 bg-coc-blood rounded-full animate-pulse"
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.8s',
          }}
        />
      ))}
    </div>
  );
}

/**
 * ScrollLoader - 卷轴展开式加载
 * 
 * 适合用于内容加载
 */
export function ScrollLoader({ text = '解读古籍中...', className = '' }: { text?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative w-48 h-12 bg-coc-surface rounded border border-coc-void overflow-hidden">
        {/* 卷轴纹理 */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(212, 197, 168, 0.1) 2px,
              rgba(212, 197, 168, 0.1) 4px
            )`,
          }}
        />
        
        {/* 展开动画 */}
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-coc-gold -translate-y-1/2"
          style={{
            animation: 'scrollUnroll 2s ease-in-out infinite',
          }}
        />
        
        {/* 两端卷轴 */}
        <div className="absolute left-0 top-0 bottom-0 w-3 bg-coc-mist border-r border-coc-void" />
        <div className="absolute right-0 top-0 bottom-0 w-3 bg-coc-mist border-l border-coc-void" />
      </div>
      
      {text && (
        <p className="text-xs font-rune text-coc-parchment-faded tracking-wider">{text}</p>
      )}
      
      <style>{`
        @keyframes scrollUnroll {
          0% {
            width: 0;
            left: 50%;
          }
          50% {
            width: 100%;
            left: 0;
          }
          100% {
            width: 0;
            left: 50%;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * RitualCircleLoader - 仪式圆环加载
 * 
 * 最华丽的加载效果，用于重要场景
 */
export function RitualCircleLoader({ size = 200, className = '' }: { size?: number; className?: string }) {
  const runes = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ', 'ᚷ', 'ᚹ', 'ᚺ', 'ᚾ', 'ᛁ', 'ᛃ'];

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* 外圈符文 */}
      <div
        className="absolute inset-0 animate-spin"
        style={{ animationDuration: '20s' }}
      >
        {runes.map((rune, i) => {
          const angle = (i / runes.length) * 360;
          const radius = size * 0.4;
          const x = size / 2 + radius * Math.cos((angle * Math.PI) / 180);
          const y = size / 2 + radius * Math.sin((angle * Math.PI) / 180);
          
          return (
            <span
              key={i}
              className="absolute text-coc-gold-dim font-rune text-xs"
              style={{
                left: x,
                top: y,
                transform: `translate(-50%, -50%) rotate(${angle + 90}deg)`,
                opacity: 0.4,
              }}
            >
              {rune}
            </span>
          );
        })}
      </div>

      {/* 中环 */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke="#8b2635"
          strokeWidth="0.5"
          strokeDasharray="5 5"
          className="animate-spin"
          style={{ animationDuration: '10s', animationDirection: 'reverse' }}
          opacity="0.5"
        />
        <circle
          cx="50"
          cy="50"
          r="20"
          fill="none"
          stroke="#c9a227"
          strokeWidth="1"
          className="animate-pulse"
          opacity="0.6"
        />
      </svg>

      {/* 中心 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl animate-breathe">🌊</div>
        </div>
      </div>
    </div>
  );
}

/**
 * SkeletonCard - 卡片骨架屏
 * 
 * 带有符文风格的骨架屏
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-coc-surface border border-coc-void rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-coc-abyss rounded animate-pulse" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-coc-abyss rounded w-3/4 animate-pulse" />
          <div className="h-3 bg-coc-abyss rounded w-1/2 animate-pulse" />
          <div className="h-3 bg-coc-abyss rounded w-5/6 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * TypewriterEffect - 打字机文字效果
 * 
 * 消息逐字出现效果
 */
export function TypewriterEffect({
  text,
  speed = 30,
  className = '',
  onComplete,
}: {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}) {
  const [displayText, setDisplayText] = React.useState('');
  const [isComplete, setIsComplete] = React.useState(false);

  React.useEffect(() => {
    if (!text) return;

    let index = 0;
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.slice(0, index + 1));
        index++;
      } else {
        setIsComplete(true);
        onComplete?.();
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 bg-coc-gold ml-0.5 animate-pulse" />
      )}
    </span>
  );
}

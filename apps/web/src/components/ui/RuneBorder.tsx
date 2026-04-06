import React from 'react';

interface RuneBorderProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gold' | 'blood' | 'madness';
  intensity?: 'subtle' | 'normal' | 'strong';
  showCorners?: boolean;
  showEdges?: boolean;
  animated?: boolean;
}

/**
 * RuneBorder - 符文边框组件 v1.1
 * 
 * 为卡片添加神秘符文装饰边框
 * 
 * @example
 * <RuneBorder variant="gold" intensity="normal" animated>
 *   <div>内容</div>
 * </RuneBorder>
 */
export function RuneBorder({
  children,
  className = '',
  variant = 'default',
  intensity = 'normal',
  showCorners = true,
  showEdges = true,
  animated = false,
}: RuneBorderProps) {
  // 颜色配置
  const colors = {
    default: {
      corner: '#d4c5a8',
      edge: '#2a2a35',
      glow: 'rgba(212, 197, 168, 0.1)',
    },
    gold: {
      corner: '#c9a227',
      edge: '#8b7355',
      glow: 'rgba(201, 162, 39, 0.2)',
    },
    blood: {
      corner: '#8b2635',
      edge: '#5c1a24',
      glow: 'rgba(139, 38, 53, 0.2)',
    },
    madness: {
      corner: '#6b4c7a',
      edge: '#3d2b47',
      glow: 'rgba(107, 76, 122, 0.2)',
    },
  };

  const theme = colors[variant];
  
  // 透明度根据 intensity 调整 - 增加基础透明度使边框更明显
  const opacityMap = {
    subtle: 0.35,
    normal: 0.55,
    strong: 0.85,
  };
  const opacity = opacityMap[intensity];

  return (
    <div className={`relative ${className}`}>
      {/* 内容层 */}
      <div className="relative z-10">{children}</div>

      {/* 角标装饰 */}
      {showCorners && (
        <>
          {/* 左上角 */}
          <svg
            className={`absolute -top-1 -left-1 w-8 h-8 pointer-events-none ${
              animated ? 'animate-rune-glow' : ''
            }`}
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M0 32 L0 0 L32 0"
              stroke={theme.corner}
              strokeWidth="1"
              opacity={opacity}
            />
            <circle cx="8" cy="8" r="2" fill={theme.corner} opacity={Math.min(1, opacity + 0.2)} />
            <path d="M4 4 L12 12" stroke={theme.corner} strokeWidth="0.5" opacity={Math.min(1, opacity + 0.1)} />
          </svg>

          {/* 右上角 */}
          <svg
            className={`absolute -top-1 -right-1 w-8 h-8 pointer-events-none ${
              animated ? 'animate-rune-glow' : ''
            }`}
            style={{ animationDelay: '0.5s' }}
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M32 32 L32 0 L0 0"
              stroke={theme.corner}
              strokeWidth="1"
              opacity={opacity}
            />
            <circle cx="24" cy="8" r="2" fill={theme.corner} opacity={Math.min(1, opacity + 0.2)} />
            <path d="M28 4 L20 12" stroke={theme.corner} strokeWidth="0.5" opacity={Math.min(1, opacity + 0.1)} />
          </svg>

          {/* 左下角 */}
          <svg
            className={`absolute -bottom-1 -left-1 w-8 h-8 pointer-events-none ${
              animated ? 'animate-rune-glow' : ''
            }`}
            style={{ animationDelay: '1s' }}
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M0 0 L0 32 L32 32"
              stroke={theme.corner}
              strokeWidth="1"
              opacity={opacity}
            />
            <circle cx="8" cy="24" r="2" fill={theme.corner} opacity={Math.min(1, opacity + 0.2)} />
            <path d="M4 28 L12 20" stroke={theme.corner} strokeWidth="0.5" opacity={Math.min(1, opacity + 0.1)} />
          </svg>

          {/* 右下角 */}
          <svg
            className={`absolute -bottom-1 -right-1 w-8 h-8 pointer-events-none ${
              animated ? 'animate-rune-glow' : ''
            }`}
            style={{ animationDelay: '1.5s' }}
            viewBox="0 0 32 32"
            fill="none"
          >
            <path
              d="M32 0 L32 32 L0 32"
              stroke={theme.corner}
              strokeWidth="1"
              opacity={opacity}
            />
            <circle cx="24" cy="24" r="2" fill={theme.corner} opacity={Math.min(1, opacity + 0.2)} />
            <path d="M28 28 L20 20" stroke={theme.corner} strokeWidth="0.5" opacity={Math.min(1, opacity + 0.1)} />
          </svg>
        </>
      )}

      {/* 边缘装饰线 */}
      {showEdges && (
        <>
          <div
            className="absolute top-0 left-8 right-8 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.edge}, transparent)`,
              opacity: opacity * 0.5,
            }}
          />
          <div
            className="absolute bottom-0 left-8 right-8 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${theme.edge}, transparent)`,
              opacity: opacity * 0.5,
            }}
          />
          <div
            className="absolute left-0 top-8 bottom-8 w-px"
            style={{
              background: `linear-gradient(180deg, transparent, ${theme.edge}, transparent)`,
              opacity: opacity * 0.5,
            }}
          />
          <div
            className="absolute right-0 top-8 bottom-8 w-px"
            style={{
              background: `linear-gradient(180deg, transparent, ${theme.edge}, transparent)`,
              opacity: opacity * 0.5,
            }}
          />
        </>
      )}

      {/* 微光效果 */}
      {animated && (
        <div
          className="absolute inset-0 pointer-events-none animate-rune-glow"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${theme.glow}, transparent 70%)`,
          }}
        />
      )}
    </div>
  );
}

/**
 * RuneSymbol - 独立符文符号
 */
interface RuneSymbolProps {
  symbol: 'eye' | 'moon' | 'star' | 'key' | 'gate' | 'blood';
  size?: number;
  className?: string;
  animated?: boolean;
}

export function RuneSymbol({ symbol, size = 24, className = '', animated = false }: RuneSymbolProps) {
  const symbols = {
    eye: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
    moon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    star: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
    key: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <circle cx="7.5" cy="15.5" r="5.5" />
        <path d="M21 2l-9.5 9.5" />
        <path d="M15 5l3 3" />
      </svg>
    ),
    gate: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M3 21h18M5 21V7l8-4 8 4v14" />
        <path d="M12 7v14" />
        <circle cx="9" cy="12" r="1" fill="currentColor" />
        <circle cx="15" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
    blood: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
        <path d="M12 8v8" strokeDasharray="2 2" />
      </svg>
    ),
  };

  return (
    <span
      className={`inline-flex items-center justify-center ${animated ? 'animate-breathe' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      {symbols[symbol]}
    </span>
  );
}

/**
 * DividerWithRunes - 符文分隔线
 */
interface DividerWithRunesProps {
  variant?: 'default' | 'gold' | 'blood';
  className?: string;
}

export function DividerWithRunes({ variant = 'default', className = '' }: DividerWithRunesProps) {
  const colors = {
    default: '#d4c5a8',
    gold: '#c9a227',
    blood: '#8b2635',
  };

  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      <div
        className="h-px flex-1"
        style={{
          background: `linear-gradient(90deg, transparent, ${colors[variant]})`,
          opacity: 0.3,
        }}
      />
      <RuneSymbol symbol="star" size={16} className={`text-coc-${variant}`} />
      <div
        className="h-px flex-1"
        style={{
          background: `linear-gradient(90deg, ${colors[variant]}, transparent)`,
          opacity: 0.3,
        }}
      />
    </div>
  );
}

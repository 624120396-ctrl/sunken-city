import { useRef, useState, useCallback } from 'react';
import { cn } from '@lib/utils';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** 卡牌宽度 */
  width?: string;
  /** 卡牌高度 */
  height?: string;
  /** 是否启用3D倾斜 */
  enabled?: boolean;
  /** 倾斜强度 (默认15) */
  tiltIntensity?: number;
  /** 光泽扫过动画 */
  glareEnabled?: boolean;
  /** 角落装饰 */
  cornerElements?: boolean;
  /** 扫描线效果 */
  scanLine?: boolean;
  /** 悬浮粒子 */
  particles?: boolean;
  /** 稀有度影响发光颜色 */
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

const rarityGlowColors: Record<string, string> = {
  common: 'rgba(139, 148, 158, 0.3)',
  rare: 'rgba(96, 165, 250, 0.3)',
  epic: 'rgba(192, 132, 252, 0.3)',
  legendary: 'rgba(201, 162, 39, 0.4)',
};

const rarityAccentColors: Record<string, string> = {
  common: '#8b949e',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#c9a227',
};

/**
 * 溺者之牌 - 3D倾斜追踪塔罗牌
 * 
 * 基于 Uiverse "cowardly-eagle-56" 赛博卡牌效果适配
 * 特性：
 * - 鼠标追踪3D倾斜（perspective 800px）
 * - 光泽扫过动画
 * - 角落符文装饰
 * - 稀有度对应发光颜色
 * - 深渊克苏鲁主题配色
 */
export function TiltCard({
  children,
  className,
  width = '100%',
  height = '100%',
  enabled = true,
  tiltIntensity = 15,
  glareEnabled = true,
  cornerElements = true,
  scanLine = true,
  particles = true,
  rarity = 'common',
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('rotateX(0deg) rotateY(0deg)');
  const [glareOpacity, setGlareOpacity] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      const rotateX = (0.5 - y) * tiltIntensity * 2;
      const rotateY = (x - 0.5) * tiltIntensity * 2;

      setTransform(`rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
      setGlareOpacity(1);
    },
    [enabled, tiltIntensity]
  );

  const handleMouseLeave = useCallback(() => {
    setTransform('rotateX(0deg) rotateY(0deg)');
    setGlareOpacity(0);
    setIsHovered(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const glowColor = rarityGlowColors[rarity] || rarityGlowColors.common;
  const accentColor = rarityAccentColors[rarity] || rarityAccentColors.common;

  return (
    <div
      className={cn('tilt-card-outer', className)}
      style={{ width, height, perspective: '800px' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
    >
      <div
        ref={cardRef}
        className="tilt-card-inner"
        style={{
          transform,
          transition: isHovered ? 'transform 125ms ease-in-out' : 'transform 400ms ease-out',
        }}
      >
        {/* 主内容 */}
        <div className="tilt-card-content">
          {children}
        </div>

        {/* 光泽扫过 */}
        {glareEnabled && (
          <div
            className="tilt-card-glare"
            style={{ opacity: glareOpacity }}
          />
        )}

        {/* 角落符文装饰 */}
        {cornerElements && (
          <div className="tilt-card-corners">
            <span style={{ borderColor: `${accentColor}40` }} />
            <span style={{ borderColor: `${accentColor}40` }} />
            <span style={{ borderColor: `${accentColor}40` }} />
            <span style={{ borderColor: `${accentColor}40` }} />
          </div>
        )}

        {/* 扫描线 */}
        {scanLine && isHovered && (
          <div className="tilt-card-scanline" style={{ background: `linear-gradient(to bottom, transparent, ${accentColor}15, transparent)` }} />
        )}

        {/* 发光背景 */}
        <div
          className="tilt-card-glow"
          style={{
            background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* 粒子 */}
        {particles && isHovered && (
          <div className="tilt-card-particles">
            {[...Array(6)].map((_, i) => (
              <span
                key={i}
                style={{
                  background: accentColor,
                  animationDelay: `${i * 0.3}s`,
                  left: `${20 + (i % 3) * 25}%`,
                  top: `${20 + Math.floor(i / 3) * 40}%`,
                }}
              />
            ))}
          </div>
        )}

        {/* 边框发光 */}
        <div
          className="tilt-card-border-glow"
          style={{
            boxShadow: isHovered
              ? `0 0 20px ${accentColor}30, inset 0 0 20px ${accentColor}15`
              : '0 0 10px rgba(0,0,0,0.3), inset 0 0 10px rgba(0,0,0,0.2)',
            transition: 'box-shadow 300ms ease',
          }}
        />
      </div>

      <style>{`
        .tilt-card-outer {
          cursor: pointer;
          position: relative;
        }
        
        .tilt-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          border-radius: 16px;
          overflow: hidden;
        }
        
        .tilt-card-content {
          position: relative;
          width: 100%;
          height: 100%;
          z-index: 2;
        }
        
        .tilt-card-border-glow {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          pointer-events: none;
          z-index: 3;
          border: 1px solid rgba(201, 162, 39, 0.15);
        }
        
        .tilt-card-glare {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            125deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(201, 162, 39, 0.03) 45%,
            rgba(201, 162, 39, 0.06) 50%,
            rgba(201, 162, 39, 0.03) 55%,
            rgba(255, 255, 255, 0) 100%
          );
          pointer-events: none;
          z-index: 4;
          transition: opacity 300ms ease;
        }
        
        .tilt-card-corners {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 4;
        }
        
        .tilt-card-corners span {
          position: absolute;
          width: 20px;
          height: 20px;
          border: 2px solid rgba(201, 162, 39, 0.2);
          transition: all 0.3s ease;
        }
        
        .tilt-card-outer:hover .tilt-card-corners span {
          border-color: rgba(201, 162, 39, 0.6);
          box-shadow: 0 0 8px rgba(201, 162, 39, 0.3);
        }
        
        .tilt-card-corners span:nth-child(1) {
          top: 12px;
          left: 12px;
          border-right: 0;
          border-bottom: 0;
          border-top-left-radius: 8px;
        }
        
        .tilt-card-corners span:nth-child(2) {
          top: 12px;
          right: 12px;
          border-left: 0;
          border-bottom: 0;
          border-top-right-radius: 8px;
        }
        
        .tilt-card-corners span:nth-child(3) {
          bottom: 12px;
          left: 12px;
          border-right: 0;
          border-top: 0;
          border-bottom-left-radius: 8px;
        }
        
        .tilt-card-corners span:nth-child(4) {
          bottom: 12px;
          right: 12px;
          border-left: 0;
          border-top: 0;
          border-bottom-right-radius: 8px;
        }
        
        .tilt-card-scanline {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          animation: tiltScanMove 2s linear infinite;
        }
        
        @keyframes tiltScanMove {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        
        .tilt-card-glow {
          position: absolute;
          inset: -20%;
          z-index: 1;
          pointer-events: none;
          filter: blur(20px);
          transition: opacity 0.3s ease;
        }
        
        .tilt-card-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 3;
          overflow: hidden;
        }
        
        .tilt-card-particles span {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 50%;
          opacity: 0;
          animation: tiltParticleFloat 2s ease-in-out infinite;
        }
        
        @keyframes tiltParticleFloat {
          0% {
            transform: translate(0, 0) scale(0);
            opacity: 0;
          }
          50% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            transform: translate(var(--tx, 20px), var(--ty, -20px)) scale(0);
            opacity: 0;
          }
        }
        
        .tilt-card-particles span:nth-child(1) { --tx: 15px; --ty: -25px; }
        .tilt-card-particles span:nth-child(2) { --tx: -20px; --ty: -15px; }
        .tilt-card-particles span:nth-child(3) { --tx: 25px; --ty: 20px; }
        .tilt-card-particles span:nth-child(4) { --tx: -15px; --ty: 25px; }
        .tilt-card-particles span:nth-child(5) { --tx: 20px; --ty: 10px; }
        .tilt-card-particles span:nth-child(6) { --tx: -25px; --ty: -20px; }
      `}</style>
    </div>
  );
}

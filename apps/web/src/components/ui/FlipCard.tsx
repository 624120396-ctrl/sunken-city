import { useState } from 'react';
import { cn } from '@lib/utils';

interface FlipCardProps {
  /** 正面内容 */
  front: React.ReactNode;
  /** 背面内容 */
  back: React.ReactNode;
  /** 宽度 */
  width?: string;
  /** 高度 */
  height?: string;
  /** 自定义类名 */
  className?: string;
  /** 是否默认翻转（受控） */
  flipped?: boolean;
  /** 翻转回调 */
  onFlip?: (flipped: boolean) => void;
  /** 是否禁用悬停自动翻转（默认 false = 悬停翻转） */
  disableHoverFlip?: boolean;
}

/**
 * 深渊3D翻转卡片
 * 
 * 基于 Uiverse Galaxy "tricky-robin-67" 效果适配
 * 特性：
 * - 悬停/点击触发 3D Y轴翻转
 * - 背面带旋转光轮（腐败金→血色渐变）
 * - 悬浮光球（blur + floating动画）
 * - preserve-3d + backface-visibility
 */
export function FlipCard({
  front,
  back,
  width = '100%',
  height = '320px',
  className,
  flipped: controlledFlipped,
  onFlip,
  disableHoverFlip = false,
}: FlipCardProps) {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const isFlipped = controlledFlipped !== undefined ? controlledFlipped : internalFlipped;

  const handleClick = () => {
    if (disableHoverFlip) {
      const next = !isFlipped;
      setInternalFlipped(next);
      onFlip?.(next);
    }
  };

  const handleMouseEnter = () => {
    if (!disableHoverFlip) {
      setInternalFlipped(true);
      onFlip?.(true);
    }
  };

  const handleMouseLeave = () => {
    if (!disableHoverFlip) {
      setInternalFlipped(false);
      onFlip?.(false);
    }
  };

  return (
    <div
      className={cn('flip-card-wrapper', className)}
      style={{ width, height }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D容器 */}
      <div
        className="flip-card-content"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* 正面 */}
        <div className="flip-card-face flip-card-front">
          {front}
        </div>

        {/* 背面 */}
        <div className="flip-card-face flip-card-back">
          {/* 旋转光轮背景 */}
          <div className="flip-card-glow-ring" />
          {/* 内容层 */}
          <div className="flip-card-back-content">
            {back}
          </div>
          {/* 悬浮光球 */}
          <div className="flip-card-orb orb-1" />
          <div className="flip-card-orb orb-2" />
          <div className="flip-card-orb orb-3" />
        </div>
      </div>

      {/* 样式注入 */}
      <style>{`
        .flip-card-wrapper {
          perspective: 1000px;
          cursor: pointer;
        }
        
        .flip-card-content {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 600ms cubic-bezier(0.22, 1, 0.36, 1);
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(139, 38, 53, 0.15),
                      0 4px 24px rgba(0, 0, 0, 0.4);
        }
        
        .flip-card-wrapper:hover .flip-card-content {
          box-shadow: 0 0 30px rgba(201, 162, 39, 0.2),
                      0 8px 32px rgba(0, 0, 0, 0.5);
        }
        
        .flip-card-face {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 12px;
          overflow: hidden;
        }
        
        /* 正面 */
        .flip-card-front {
          background: linear-gradient(145deg, #12121a 0%, #0a0a0f 100%);
          border: 1px solid #2a2a35;
        }
        
        /* 背面 */
        .flip-card-back {
          background: #0a0a0f;
          transform: rotateY(180deg);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #2a2a35;
        }
        
        /* 旋转光轮 */
        .flip-card-glow-ring {
          position: absolute;
          width: 160px;
          height: 160%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(201, 162, 39, 0.6),
            rgba(139, 38, 53, 0.8),
            rgba(201, 162, 39, 0.6),
            transparent
          );
          animation: flipCardRingRotate 5000ms infinite linear;
          pointer-events: none;
        }
        
        @keyframes flipCardRingRotate {
          0% { transform: rotateZ(0deg); }
          100% { transform: rotateZ(360deg); }
        }
        
        /* 背面内容层 */
        .flip-card-back-content {
          position: absolute;
          inset: 2px;
          background: linear-gradient(145deg, #12121a 0%, #0a0a0f 100%);
          border-radius: 10px;
          color: #d4c5a8;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 20px;
          z-index: 2;
        }
        
        /* 悬浮光球 */
        .flip-card-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(15px);
          pointer-events: none;
          z-index: 1;
        }
        
        .orb-1 {
          width: 90px;
          height: 90px;
          background: rgba(201, 162, 39, 0.4);
          left: 20%;
          top: 20%;
          animation: flipCardFloat 2600ms infinite linear;
        }
        
        .orb-2 {
          width: 120px;
          height: 120px;
          background: rgba(139, 38, 53, 0.35);
          left: 50%;
          top: 10%;
          animation: flipCardFloat 2600ms infinite linear;
          animation-delay: -800ms;
        }
        
        .orb-3 {
          width: 60px;
          height: 60px;
          background: rgba(201, 162, 39, 0.25);
          left: 70%;
          top: 60%;
          animation: flipCardFloat 2600ms infinite linear;
          animation-delay: -1800ms;
        }
        
        @keyframes flipCardFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(10px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </div>
  );
}

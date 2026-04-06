import { useEffect, useState } from 'react';

interface SanityEffectsProps {
  sanity: number;
  maxSanity: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * SanityEffects - SAN 值疯狂视觉效果 v1.1
 * 
 * 根据 SAN 值自动应用不同的疯狂视觉效果
 * - SAN > 50: 正常
 * - SAN 30-50: 轻微不安，边缘轻微扭曲
 * - SAN 10-30: 中度疯狂，视觉扭曲 + 偶尔闪屏
 * - SAN < 10: 深度疯狂，强烈扭曲 + 文字混乱 + 视觉干扰
 * 
 * @example
 * <SanityEffects sanity={25} maxSanity={99}>
 *   <CharacterSheet />
 * </SanityEffects>
 */
export function SanityEffects({ sanity, maxSanity, children, className = '' }: SanityEffectsProps) {
  const sanityPercent = (sanity / maxSanity) * 100;
  const [glitchActive, setGlitchActive] = useState(false);
  const [whisperText, setWhisperText] = useState('');

  // 疯狂低语文本
  const whispers = [
    '它们在看着...',
    '不要回头',
    '你听到了吗？',
    '群星归位之时...',
    '那不是人',
    '它们在墙里',
    '不要相信镜子',
    '时间不存在',
    '你已经死了',
    '这只是幻觉...',
  ];

  useEffect(() => {
    if (sanityPercent > 50) return;

    // 根据 SAN 值触发不同的疯狂效果
    const glitchInterval = setInterval(() => {
      const shouldGlitch = Math.random() < (1 - sanityPercent / 50) * 0.3;
      if (shouldGlitch) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 200 + Math.random() * 300);
      }
    }, 3000);

    // 随机显示低语
    const whisperInterval = setInterval(() => {
      const shouldWhisper = Math.random() < (1 - sanityPercent / 50) * 0.5;
      if (shouldWhisper) {
        const text = whispers[Math.floor(Math.random() * whispers.length)];
        setWhisperText(text);
        setTimeout(() => setWhisperText(''), 3000);
      }
    }, 8000);

    return () => {
      clearInterval(glitchInterval);
      clearInterval(whisperInterval);
    };
  }, [sanityPercent]);

  // 根据 SAN 值确定效果强度
  const getEffects = () => {
    if (sanityPercent > 50) return { filter: 'none', transform: 'none' };
    if (sanityPercent > 30) {
      // 轻微不安
      return {
        filter: `hue-rotate(${Math.sin(Date.now() / 1000) * 5}deg)`,
        transform: `translateX(${Math.sin(Date.now() / 2000) * 1}px)`,
      };
    }
    if (sanityPercent > 10) {
      // 中度疯狂
      return {
        filter: `hue-rotate(${Math.sin(Date.now() / 500) * 10}deg) contrast(1.1)`,
        transform: `translateX(${Math.sin(Date.now() / 1000) * 2}px) skewX(${Math.sin(Date.now() / 1500) * 0.5}deg)`,
      };
    }
    // 深度疯狂
    return {
      filter: `hue-rotate(${Math.sin(Date.now() / 300) * 15}deg) contrast(1.2) saturate(1.3)`,
      transform: `translateX(${Math.sin(Date.now() / 500) * 3}px) skewX(${Math.sin(Date.now() / 800) * 1}deg)`,
    };
  };

  return (
    <div className={`relative ${className}`}>
      {/* 主体内容 */}
      <div
        className={`transition-all duration-200 ${
          glitchActive ? 'animate-glitch' : ''
        }`}
        style={getEffects()}
      >
        {children}
      </div>

      {/* 疯狂叠加层 */}
      {sanityPercent <= 50 && (
        <div className="absolute inset-0 pointer-events-none">
          {/* 边缘暗化 */}
          <div 
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at center, transparent 40%, rgba(107, 76, 122, ${(50 - sanityPercent) / 100}) 100%)`,
            }}
          />

          {/* 噪点覆盖 */}
          {sanityPercent <= 30 && (
            <div 
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                animation: 'madnessFlicker 0.1s infinite',
              }}
            />
          )}

          {/* 扭曲效果 */}
          {sanityPercent <= 20 && (
            <div 
              className="absolute inset-0 animate-madness-flicker"
              style={{
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 38, 53, 0.03) 2px, rgba(139, 38, 53, 0.03) 4px)',
              }}
            />
          )}
        </div>
      )}

      {/* 疯狂低语 */}
      {whisperText && sanityPercent <= 30 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
          <span className="text-coc-madness-glow font-whisper text-lg italic 
                           animate-madness-flicker whitespace-nowrap"
                style={{ textShadow: '0 0 10px rgba(107, 76, 122, 0.5)' }}>
            {whisperText}
          </span>
        </div>
      )}

      {/* 闪屏效果 */}
      {glitchActive && sanityPercent <= 20 && (
        <div className="absolute inset-0 bg-coc-madness/10 animate-glitch-flash pointer-events-none z-40" />
      )}

      {/* 深度疯狂：视觉干扰 */}
      {sanityPercent <= 10 && (
        <>
          {/* 浮动眼睛 */}
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-6 h-6 rounded-full border border-coc-madness/30 
                       bg-coc-abyss/80 flex items-center justify-center animate-float"
              style={{
                top: `${20 + i * 30}%`,
                right: `${10 + i * 5}%`,
                animationDelay: `${i * 2}s`,
                animationDuration: '4s',
              }}
            >
              <div className="w-2 h-2 rounded-full bg-coc-blood animate-pulse" />
            </div>
          ))}

          {/* 边缘触须 */}
          <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
                style={{
                  background: 'linear-gradient(to top, rgba(107, 76, 122, 0.1), transparent)',
                  maskImage: 'repeating-linear-gradient(90deg, black 0px, black 20px, transparent 20px, transparent 40px)',
                }}
          />
        </>
      )}
    </div>
  );
}

/**
 * SanityMeter - SAN 值可视化仪表
 * 
 * 更直观的 SAN 值显示，带疯狂阈值标记
 */
export function SanityMeter({ 
  current, 
  max, 
  size = 'md',
  showLabel = true,
}: { 
  current: number; 
  max: number; 
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}) {
  const percent = (current / max) * 100;
  
  const sizeMap = {
    sm: { container: 'w-24 h-24', text: 'text-lg', label: 'text-xs' },
    md: { container: 'w-32 h-32', text: 'text-2xl', label: 'text-sm' },
    lg: { container: 'w-40 h-40', text: 'text-3xl', label: 'text-base' },
  };

  const getColor = () => {
    if (percent > 50) return '#c9a227'; // 金色
    if (percent > 30) return '#8b7355'; // 暗金
    if (percent > 10) return '#8b2635'; // 血红色
    return '#6b4c7a'; // 疯狂紫
  };

  const getStatus = () => {
    if (percent > 50) return '理智';
    if (percent > 30) return '不安';
    if (percent > 10) return '疯狂边缘';
    return '深度疯狂';
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className={`relative ${sizeMap[size].container}`}>
      {/* 背景圆环 */}
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#1a1a24"
          strokeWidth="8"
        />
        
        {/* 进度圆环 */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={getColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
          style={{
            filter: percent <= 30 ? 'drop-shadow(0 0 4px ' + getColor() + ')' : 'none',
          }}
        />

        {/* 阈值标记 - 50% */}
        <circle
          cx="50"
          cy="5"
          r="2"
          fill="#8b7355"
          opacity="0.5"
        />

        {/* 阈值标记 - 30% */}
        <circle
          cx="85"
          cy="35"
          r="2"
          fill="#8b2635"
          opacity="0.5"
        />
      </svg>

      {/* 中心文字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span 
          className={`${sizeMap[size].text} font-ritual font-bold`}
          style={{ color: getColor() }}
        >
          {current}
        </span>
        <span className={`${sizeMap[size].label} text-coc-parchment-faded`}>
          /{max}
        </span>
      </div>

      {/* 状态标签 */}
      {showLabel && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
          <span 
            className="text-xs font-rune px-2 py-0.5 rounded border"
            style={{ 
              color: getColor(), 
              borderColor: getColor() + '40',
              backgroundColor: getColor() + '10',
            }}
          >
            {getStatus()}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * GlitchText - 故障文字效果
 * 
 * 用于疯狂状态下的文字显示
 */
export function GlitchText({ 
  text, 
  className = '',
  intensity = 'medium',
}: { 
  text: string; 
  className?: string;
  intensity?: 'low' | 'medium' | 'high';
}) {
  const intensityMap = {
    low: { offset: 1, opacity: 0.3 },
    medium: { offset: 2, opacity: 0.5 },
    high: { offset: 4, opacity: 0.7 },
  };

  const { opacity } = intensityMap[intensity];

  return (
    <span className={`relative inline-block ${className}`}>
      {/* 原始文字 */}
      <span className="relative z-10">{text}</span>
      
      {/* 红色偏移层 */}
      <span 
        className="absolute top-0 left-0 -z-10 animate-glitch-red"
        style={{ 
          color: '#8b2635',
          opacity,
          clipPath: 'inset(0 0 50% 0)',
        }}
      >
        {text}
      </span>
      
      {/* 青色偏移层 */}
      <span 
        className="absolute top-0 left-0 -z-10 animate-glitch-cyan"
        style={{ 
          color: '#4ecdc4',
          opacity,
          clipPath: 'inset(50% 0 0 0)',
        }}
      >
        {text}
      </span>
    </span>
  );
}

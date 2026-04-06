import { useEffect, useRef } from 'react';

interface AbyssBackgroundProps {
  variant?: 'calm' | 'stirring' | 'madness';
  className?: string;
}

/**
 * AbyssBackground - 深渊流动背景 v1.1
 * 
 * 使用 Canvas 实现的动态深渊背景
 * 模拟深海中的微光、漂浮粒子、缓慢流动的黑暗
 * 
 * @example
 * <AbyssBackground variant="calm" />
 */
export function AbyssBackground({ variant = 'calm', className = '' }: AbyssBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    opacity: number;
    pulse: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 初始化粒子
    const particleCount = variant === 'madness' ? 150 : variant === 'stirring' ? 80 : 40;
    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: variant === 'madness' 
        ? (Math.random() - 0.5) * 1.5 
        : (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));

    // 颜色配置
    const colors = {
      calm: {
        bg: ['#0a0a0f', '#0d0d12', '#12121a'],
        particle: 'rgba(201, 162, 39, ', // 金色微光
        glow: 'rgba(139, 38, 53, 0.05)', // 暗红深渊
      },
      stirring: {
        bg: ['#0a0a0f', '#0d0d12', '#1a0f14'],
        particle: 'rgba(139, 38, 53, ', // 血色微光
        glow: 'rgba(107, 76, 122, 0.08)', // 疯狂紫
      },
      madness: {
        bg: ['#0a0a0f', '#120a10', '#1a0a14'],
        particle: 'rgba(107, 76, 122, ', // 疯狂紫
        glow: 'rgba(139, 38, 53, 0.1)', // 血色
      },
    }[variant];

    let time = 0;

    // 动画循环
    const animate = () => {
      time += 0.005;

      // 绘制背景渐变
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.5 + Math.sin(time) * 100,
        canvas.height * 0.3 + Math.cos(time * 0.7) * 50,
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        Math.max(canvas.width, canvas.height) * 0.8
      );
      
      gradient.addColorStop(0, colors.bg[0]);
      gradient.addColorStop(0.5, colors.bg[1]);
      gradient.addColorStop(1, colors.bg[2]);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制深渊光晕
      const glowGradient = ctx.createRadialGradient(
        canvas.width * 0.5,
        canvas.height * 0.8,
        0,
        canvas.width * 0.5,
        canvas.height * 0.8,
        canvas.height * 0.6
      );
      glowGradient.addColorStop(0, colors.glow);
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制粒子
      particlesRef.current.forEach((particle, i) => {
        // 更新位置
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.pulse += 0.02;

        // 边界处理
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // 绘制粒子
        const pulseOpacity = particle.opacity * (0.7 + 0.3 * Math.sin(particle.pulse));
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = colors.particle + pulseOpacity + ')';
        ctx.fill();

        // 绘制微光
        if (i % 5 === 0) {
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * 4, 0, Math.PI * 2);
          ctx.fillStyle = colors.particle + (pulseOpacity * 0.2) + ')';
          ctx.fill();
        }
      });

      // 绘制深海光线（从上往下）
      const rayCount = variant === 'madness' ? 5 : 3;
      for (let i = 0; i < rayCount; i++) {
        const rayX = canvas.width * (0.3 + (i / (rayCount - 1)) * 0.4) + Math.sin(time + i) * 50;
        const rayGradient = ctx.createLinearGradient(rayX, 0, rayX, canvas.height * 0.5);
        rayGradient.addColorStop(0, colors.particle + '0.05)');
        rayGradient.addColorStop(0.5, colors.particle + '0.02)');
        rayGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = rayGradient;
        ctx.fillRect(rayX - 20, 0, 40, canvas.height * 0.5);
      }

      // 疯狂模式：额外绘制扭曲效果
      if (variant === 'madness') {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        for (let i = 0; i < 3; i++) {
          const x = Math.sin(time * 2 + i * 2) * canvas.width * 0.3 + canvas.width * 0.5;
          const y = Math.cos(time * 1.5 + i) * canvas.height * 0.2 + canvas.height * 0.5;
          const radius = 100 + Math.sin(time + i) * 50;
          
          const madnessGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          madnessGradient.addColorStop(0, 'rgba(107, 76, 122, 0.1)');
          madnessGradient.addColorStop(1, 'transparent');
          
          ctx.fillStyle = madnessGradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{ opacity: 0.8 }}
    />
  );
}

/**
 * TentacleSilhouette - 触手剪影装饰
 * 
 * 用于页面边缘的克苏鲁触手装饰
 */
export function TentacleSilhouette({ position = 'bottom', className = '' }: { 
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}) {
  const rotations = {
    top: 'rotate-180',
    bottom: '',
    left: 'rotate-90',
    right: '-rotate-90',
  };

  return (
    <div 
      className={`absolute pointer-events-none opacity-10 ${rotations[position]} ${className}`}
      style={{
        [position === 'top' || position === 'bottom' ? 'left' : 'top']: '50%',
        [position === 'top' || position === 'bottom' ? 'transform' : 'transform']: 
          position === 'top' || position === 'bottom' 
            ? 'translateX(-50%)' 
            : 'translateY(-50%)',
        [position]: 0,
      }}
    >
      <svg
        width="400"
        height="100"
        viewBox="0 0 400 100"
        fill="none"
        className="text-coc-madness"
      >
        <defs>
          <linearGradient id="tentacleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.5" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* 主触手 */}
        <path
          d="M200 100 Q200 50 180 30 Q160 10 140 25 Q120 40 130 60 Q140 80 160 70"
          stroke="url(#tentacleGrad)"
          strokeWidth="8"
          fill="none"
          className="animate-pulse"
          style={{ animationDuration: '4s' }}
        />
        {/* 触手2 */}
        <path
          d="M200 100 Q210 60 230 40 Q250 20 270 35 Q290 50 280 70"
          stroke="url(#tentacleGrad)"
          strokeWidth="6"
          fill="none"
          className="animate-pulse"
          style={{ animationDuration: '5s', animationDelay: '0.5s' }}
        />
        {/* 触手3 */}
        <path
          d="M200 100 Q190 70 170 55 Q150 40 160 65"
          stroke="url(#tentacleGrad)"
          strokeWidth="4"
          fill="none"
          className="animate-pulse"
          style={{ animationDuration: '3s', animationDelay: '1s' }}
        />
      </svg>
    </div>
  );
}

/**
 * EyeOfTheAbyss - 深渊之眼
 * 
 * 会跟随鼠标移动的神秘眼睛
 */
export function EyeOfTheAbyss({ className = '' }: { className?: string }) {
  const eyeRef = useRef<HTMLDivElement>(null);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyeRef.current || !pupilRef.current) return;
      
      const rect = eyeRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const distance = Math.min(10, Math.hypot(e.clientX - centerX, e.clientY - centerY) / 20);
      
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      pupilRef.current.style.transform = `translate(${x}px, ${y}px)`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div 
      ref={eyeRef}
      className={`relative w-12 h-12 rounded-full border-2 border-coc-gold/30 
                  bg-coc-abyss flex items-center justify-center ${className}`}
    >
      <div className="absolute inset-0 rounded-full bg-radial-gradient from-coc-gold/10 to-transparent animate-pulse" />
      <div
        ref={pupilRef}
        className="w-4 h-4 rounded-full bg-coc-blood transition-transform duration-100"
        style={{ boxShadow: '0 0 10px rgba(139, 38, 53, 0.5)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-black absolute top-0.5 right-0.5" />
      </div>
    </div>
  );
}

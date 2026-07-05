import { animate, createTimeline, stagger, type Timeline, type JSAnimation } from 'animejs';

// ===== 深渊主题缓动函数 =====
export const abyssEasings = {
  // 弹簧效果 - 用于抽屉/弹窗
  drawerSpring: 'spring(1, 80, 10, 0)',
  // 骰子弹跳
  diceBounce: 'spring(1, 60, 8, 0)',
  // 消息滑入
  messageSlide: 'easeOutExpo',
  // 场景切换
  sceneTransition: 'easeInOutCubic',
  // 伤害飘字
  damageFloat: 'easeOutQuad',
  // 呼吸脉冲
  breathePulse: 'easeInOutSine',
} as const;

// ===== 深渊主题交错动画 =====
export const abyssStaggers = {
  // 新消息滑入
  messages: stagger(80),
  // 列表项入场
  listItems: stagger(60),
  // 线索揭示
  clues: stagger(120),
  // 骰子结果
  diceResults: stagger(100),
} as const;

// ===== 移动端降级配置 =====
export const mobileMotionConfig = {
  enableParticles: false,
  enableBackdropBlur: false,
  enableTextStroke: false,
  spring: { stiffness: 120, damping: 20, mass: 0.8 },
  maxConcurrentAnimations: 2,
  defaultDuration: 0.25,
  staggerDelay: 40,
} as const;

// ===== 桌面端配置 =====
export const desktopMotionConfig = {
  enableParticles: true,
  enableBackdropBlur: true,
  enableTextStroke: true,
  spring: { stiffness: 300, damping: 25, mass: 1 },
  maxConcurrentAnimations: 8,
  defaultDuration: 0.6,
  staggerDelay: 80,
} as const;

// ===== 检测设备 =====
export const isMobile = () =>
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
  || window.innerWidth < 768;

export const isTouch = () =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ===== 获取当前配置 =====
export const getMotionConfig = () =>
  isMobile() ? mobileMotionConfig : desktopMotionConfig;

// ===== 动画工厂函数 =====

/**
 * 抽屉滑入动画
 */
export function animateDrawer(
  element: HTMLElement,
  direction: 'left' | 'right' | 'bottom',
  open: boolean,
  onComplete?: () => void
) {
  // 底部抽屉使用 y 轴动画
  if (direction === 'bottom') {
    const fromY = open ? '100%' : '0%';
    const toY = open ? '0%' : '100%';

    return animate(element, {
      translateY: [fromY, toY],
      opacity: open ? [0, 1] : [1, 0],
      duration: getMotionConfig().defaultDuration,
      ease: abyssEasings.drawerSpring,
      ...(onComplete ? { onComplete } : {}),
    });
  }

  const fromX = open ? (direction === 'left' ? '-100%' : '100%') : '0%';
  const toX = open ? '0%' : direction === 'left' ? '-100%' : '100%';

  return animate(element, {
    translateX: [fromX, toX],
    opacity: open ? [0, 1] : [1, 0],
    duration: getMotionConfig().defaultDuration,
    ease: abyssEasings.drawerSpring,
    ...(onComplete ? { onComplete } : {}),
  });
}

/**
 * 消息滑入动画
 */
export function animateMessage(
  element: HTMLElement,
  index: number = 0
) {
  const config = getMotionConfig();

  return animate(element, {
    translateY: [20, 0],
    opacity: [0, 1],
    duration: config.defaultDuration,
    delay: index * config.staggerDelay,
    ease: abyssEasings.messageSlide,
  });
}

/**
 * 骰子弹跳动画
 */
export function animateDice(
  element: HTMLElement,
  onComplete?: () => void
) {
  return animate(element, {
    scale: [0.5, 1.2, 1],
    rotate: [0, 360],
    opacity: [0, 1],
    duration: 0.8,
    ease: abyssEasings.diceBounce,
    ...(onComplete ? { onComplete } : {}),
  });
}

/**
 * 伤害飘字动画
 */
export function animateDamage(
  element: HTMLElement,
  isCrit: boolean = false
) {
  return animate(element, {
    translateY: [-20, -60],
    opacity: [1, 0],
    scale: isCrit ? [1, 1.5, 1.2] : [1, 1.1, 1],
    duration: 1.2,
    ease: abyssEasings.damageFloat,
  });
}

/**
 * 场景切换过渡
 */
export function animateSceneTransition(
  element: HTMLElement,
  onComplete?: () => void
) {
  const config = getMotionConfig();

  // 移动端禁用 blur
  if (!config.enableBackdropBlur) {
    return animate(element, {
      opacity: [0, 1],
      duration: 0.4,
      ease: abyssEasings.sceneTransition,
      ...(onComplete ? { onComplete } : {}),
    });
  }

  return animate(element, {
    opacity: [0, 1],
    filter: ['blur(8px)', 'blur(0px)'],
    duration: 0.5,
    ease: abyssEasings.sceneTransition,
    ...(onComplete ? { onComplete } : {}),
  });
}

/**
 * 线索翻转动画
 */
export function animateClueReveal(
  element: HTMLElement,
  onComplete?: () => void
) {
  const config = getMotionConfig();

  // 移动端使用 scale 替代 rotateY
  if (!config.enableTextStroke) {
    return animate(element, {
      scale: [0.9, 1],
      opacity: [0, 1],
      duration: 0.4,
      ease: abyssEasings.messageSlide,
      ...(onComplete ? { onComplete } : {}),
    });
  }

  return animate(element, {
    rotateY: [0, 180],
    opacity: [0, 1],
    duration: 0.6,
    ease: abyssEasings.sceneTransition,
    ...(onComplete ? { onComplete } : {}),
  });
}

/**
 * 呼吸脉冲动画
 */
export function animateBreathe(
  element: HTMLElement,
  loop: boolean = true
) {
  return animate(element, {
    scale: [1, 1.05, 1],
    opacity: [1, 0.95, 1],
    duration: 4,
    ease: abyssEasings.breathePulse,
    loop,
  });
}

/**
 * NPC 打字机效果
 */
export function animateTypewriter(
  element: HTMLElement,
  text: string,
  onComplete?: () => void
) {
  const config = getMotionConfig();

  // 移动端整句淡入
  if (config.defaultDuration < 0.3) {
    element.textContent = text;
    return animate(element, {
      opacity: [0, 1],
      translateY: [5, 0],
      duration: 0.3,
      ease: abyssEasings.messageSlide,
      ...(onComplete ? { onComplete } : {}),
    });
  }

  // 桌面端逐字动画
  element.textContent = '';
  return animate(element, {
    text: text,
    duration: text.length * 30,
    ease: 'linear',
    ...(onComplete ? { onComplete } : {}),
  });
}

/**
 * 列表瀑布入场
 */
export function animateListStagger(
  elements: HTMLElement[],
  onComplete?: () => void
) {
  const config = getMotionConfig();

  return animate(elements, {
    translateY: [20, 0],
    opacity: [0, 1],
    duration: config.defaultDuration,
    delay: stagger(config.staggerDelay),
    ease: abyssEasings.messageSlide,
    ...(onComplete ? { onComplete } : {}),
  });
}

/**
 * 按钮按压反馈
 */
export function animateButtonPress(
  element: HTMLElement
) {
  return animate(element, {
    scale: [1, 0.98, 1],
    translateY: [0, 1, 0],
    duration: 0.15,
    ease: 'easeOutQuad',
  });
}

/**
 * 骨架屏 shimmer
 */
export function animateShimmer(
  element: HTMLElement,
  loop: boolean = true
) {
  return animate(element, {
    backgroundPosition: ['-200% 0', '200% 0'],
    duration: 1.5,
    ease: 'linear',
    loop,
  });
}

// ===== 时间线工具 =====

/**
 * 创建深渊主题时间线
 */
export function createAbyssTimeline(): Timeline {
  return createTimeline({
    defaults: {
      ease: abyssEasings.sceneTransition,
    },
  });
}

// ===== 性能监控 =====

let fps = 60;
let frameCount = 0;
let lastTime = performance.now();

export function startFpsMonitor(onLowFps?: () => void) {
  function measure() {
    frameCount++;
    const now = performance.now();
    if (now - lastTime >= 1000) {
      fps = frameCount;
      frameCount = 0;
      lastTime = now;

      if (fps < 45 && onLowFps) {
        onLowFps();
      }
    }
    requestAnimationFrame(measure);
  }
  requestAnimationFrame(measure);
}

export function getFps() {
  return fps;
}

// ===== 低功耗模式 =====
let lowPowerMode = false;

export function enableLowPowerMode() {
  lowPowerMode = true;
}

export function isLowPowerMode() {
  return lowPowerMode;
}

// ===== React 友好的动画钩子 =====

import { useEffect, useRef, useCallback } from 'react';

/**
 * 使用 anime.js 动画的 React Hook
 */
export function useAbyssAnimation<T extends HTMLElement>(
  animationFactory: (el: T) => JSAnimation | Timeline | void,
  deps: React.DependencyList = []
) {
  const ref = useRef<T>(null);
  const animationRef = useRef<JSAnimation | Timeline | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const animation = animationFactory(ref.current);
    if (animation) {
      animationRef.current = animation;
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.pause?.();
        animationRef.current = null;
      }
    };
  }, deps);

  return ref;
}

/**
 * 使用滚动触发动画的 Hook
 */
export function useScrollAnimation<T extends HTMLElement>(
  animationFactory: (el: T) => JSAnimation | Timeline | void,
  threshold: number = 0.1
) {
  const ref = useRef<T>(null);
  const triggeredRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !triggeredRef.current) {
            triggeredRef.current = true;
            animationFactory(el);
          }
        });
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

/**
 * 按钮点击动画 Hook
 */
export function useButtonAnimation<T extends HTMLElement = HTMLButtonElement>() {
  const ref = useRef<T>(null);

  const animate = useCallback(() => {
    if (ref.current) {
      animateButtonPress(ref.current);
    }
  }, []);

  return { ref, animate };
}

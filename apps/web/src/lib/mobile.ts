// ===== 移动端检测与适配工具 =====

export const isMobile = () =>
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)
  || window.innerWidth < 768;

export const isTouch = () =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0;

export const isLandscape = () =>
  window.innerWidth > window.innerHeight;

// ===== 安全区适配 =====
export function getSafeAreaInsets() {
  return {
    top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'),
    bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sab') || '0'),
    left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sal') || '0'),
    right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sar') || '0'),
  };
}

// ===== 虚拟键盘检测 =====
export function watchKeyboard(callback: (height: number) => void) {
  const visualViewport = window.visualViewport;
  if (!visualViewport) return () => {};

  const handler = () => {
    const height = window.innerHeight - visualViewport.height;
    callback(height);
  };

  visualViewport.addEventListener('resize', handler);
  return () => visualViewport.removeEventListener('resize', handler);
}

// ===== 长按 Hook =====
import { useEffect, useState, useCallback } from 'react';

export function useLongPress(callback: () => void, ms = 400) {
  const [startLongPress, setStartLongPress] = useState(false);

  useEffect(() => {
    if (!startLongPress) return;
    const timer = setTimeout(callback, ms);
    return () => clearTimeout(timer);
  }, [startLongPress, callback, ms]);

  return {
    onTouchStart: useCallback(() => setStartLongPress(true), []),
    onTouchEnd: useCallback(() => setStartLongPress(false), []),
    onTouchMove: useCallback(() => setStartLongPress(false), []),
    onMouseDown: useCallback(() => setStartLongPress(true), []),
    onMouseUp: useCallback(() => setStartLongPress(false), []),
    onMouseLeave: useCallback(() => setStartLongPress(false), []),
  };
}

// ===== 手势检测 Hook =====
export function useSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold: number = 50
) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;
    const absX = Math.abs(distanceX);
    const absY = Math.abs(distanceY);

    if (Math.max(absX, absY) < threshold) return;

    if (absX > absY) {
      if (distanceX > 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    } else {
      if (distanceY > 0) {
        onSwipeUp?.();
      } else {
        onSwipeDown?.();
      }
    }
  }, [touchStart, touchEnd, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

import { useRef } from 'react';
import { useScroll, useTransform, MotionValue } from 'motion/react';

interface ParallaxResult {
  ref: React.RefObject<HTMLDivElement | null>;
  y: MotionValue<number>;
}

export function useScrollParallax(speed: number = 0.5): ParallaxResult {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 500 * speed]);

  return { ref, y };
}

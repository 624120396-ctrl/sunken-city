import { useRef, useState, useCallback } from 'react';

interface MouseTiltResult {
  rotateX: number;
  rotateY: number;
  glow: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  handlers: {
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

export function useMouseTilt(maxTilt: number = 12): MouseTiltResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [glow, setGlow] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setRotateX(y * -maxTilt);
    setRotateY(x * maxTilt);
  }, [maxTilt]);

  const handleMouseEnter = useCallback(() => {
    setGlow(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setRotateX(0);
    setRotateY(0);
    setGlow(false);
  }, []);

  return {
    rotateX,
    rotateY,
    glow,
    containerRef,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}

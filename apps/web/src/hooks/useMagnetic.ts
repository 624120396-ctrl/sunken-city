import { useRef, useState, useCallback } from 'react';

interface MagneticResult {
  x: number;
  y: number;
  containerRef: React.RefObject<HTMLButtonElement | null>;
  handlers: {
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
  };
}

export function useMagnetic(strength: number = 0.3): MagneticResult {
  const containerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) * strength;
    const y = (e.clientY - top - height / 2) * strength;
    setPosition({ x, y });
  }, [strength]);

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  return {
    x: position.x,
    y: position.y,
    containerRef,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
  };
}

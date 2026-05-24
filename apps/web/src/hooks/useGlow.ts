import { useState, useCallback } from 'react';

interface GlowResult {
  glow: boolean;
  setGlow: (v: boolean) => void;
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

export function useGlow(): GlowResult {
  const [glow, setGlow] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setGlow(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setGlow(false);
  }, []);

  return {
    glow,
    setGlow,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}

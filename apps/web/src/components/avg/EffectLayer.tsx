import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Effect {
  type: 'fade' | 'dissolve' | 'wipe' | 'glitch' | 'ripple';
  duration: number;
}

interface EffectLayerProps {
  effect: Effect;
  onComplete: () => void;
  className?: string;
}

/**
 * 特效层 (Layer 5)
 * z-index: 500
 * 职责：转场特效、全屏特效（闪白、震动、粒子等）
 * pointer-events: none - 不阻挡用户交互
 */
const EffectLayer: React.FC<EffectLayerProps> = ({ effect, onComplete, className }) => {
  const variants = {
    fade: { 
      initial: { opacity: 1 }, 
      animate: { opacity: 0 } 
    },
    dissolve: { 
      initial: { opacity: 1, scale: 1 }, 
      animate: { opacity: 0, scale: 1.05 } 
    },
    wipe: { 
      initial: { clipPath: 'circle(150% at 50% 50%)' }, 
      animate: { clipPath: 'circle(0% at 50% 50%)' } 
    },
    glitch: { 
      initial: { x: 0, opacity: 1 }, 
      animate: { 
        x: [0, -10, 10, -5, 5, 0],
        opacity: [1, 0.8, 1, 0.9, 1]
      } 
    },
    ripple: { 
      initial: { scale: 1, opacity: 0.8 }, 
      animate: { scale: 3, opacity: 0 } 
    },
  };

  const currentVariant = variants[effect.type];

  return (
    <AnimatePresence onExitComplete={onComplete}>
      <motion.div
        className={`absolute inset-0 bg-black pointer-events-none ${className}`}
        initial={currentVariant.initial}
        animate={currentVariant.animate}
        exit={{ opacity: 0 }}
        transition={{ 
          duration: effect.duration / 1000,
          ease: effect.type === 'glitch' ? 'linear' : 'easeInOut'
        }}
        onAnimationComplete={onComplete}
      />
    </AnimatePresence>
  );
};

export default EffectLayer;

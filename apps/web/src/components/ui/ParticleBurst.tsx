import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ParticleBurstProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function ParticleBurst({ trigger, onComplete }: ParticleBurstProps) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * 360 + (Math.random() - 0.5) * 30,
    distance: 40 + Math.random() * 60,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 0.1,
    duration: 0.4 + Math.random() * 0.3,
  }));

  return (
    <AnimatePresence>
      {trigger && (
        <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 50 }}>
          {particles.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.distance;
            const ty = Math.sin(rad) * p.distance;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                animate={{
                  opacity: 0,
                  scale: 0,
                  x: tx,
                  y: ty,
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: 'easeOut',
                }}
                onAnimationComplete={p.id === 0 ? onComplete : undefined}
                className="absolute left-1/2 top-1/2 rounded-full bg-coc-gold"
                style={{
                  width: p.size,
                  height: p.size,
                  marginLeft: -p.size / 2,
                  marginTop: -p.size / 2,
                  boxShadow: '0 0 6px rgba(201, 162, 39, 0.6)',
                }}
              />
            );
          })}
        </div>
      )}
    </AnimatePresence>
  );
}

// Hook for easy use
export function useParticleBurst() {
  const [active, setActive] = useState(false);

  const burst = useCallback(() => {
    setActive(true);
    // Auto-reset after max animation duration
    setTimeout(() => setActive(false), 800);
  }, []);

  return { active, burst, ParticleBurst: () => <ParticleBurst trigger={active} onComplete={() => setActive(false)} /> };
}

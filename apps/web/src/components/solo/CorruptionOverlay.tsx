import { motion } from 'framer-motion';

interface CorruptionOverlayProps {
  corruption: number;
}

export function CorruptionOverlay({ corruption }: CorruptionOverlayProps) {
  const intensity = Math.min(corruption / 100, 1);
  if (intensity <= 0) return null;

  return (
    <>
      {/* 边缘血雾 */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-[35]"
        style={{
          background: `radial-gradient(circle at center, transparent 60%, rgba(124,58,237,${intensity * 0.35}) 100%)`,
        }}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 顶部暗角 */}
      <div
        className="fixed inset-0 pointer-events-none z-[35]"
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,${intensity * 0.5}) 0%, transparent 30%)`,
        }}
      />

      {/* 低频噪点/色偏层 */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-[35] mix-blend-overlay"
        style={{
          backgroundColor: `rgba(139, 92, 246, ${intensity * 0.12})`,
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />
    </>
  );
}

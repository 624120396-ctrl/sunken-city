import React from 'react';
import { motion } from 'framer-motion';

interface CgOverlayProps {
  cgId: string;
  onClose: () => void;
  className?: string;
}

/**
 * CG 全屏覆盖层 (Layer 2)
 * z-index: 300
 * 职责：在关键剧情节点显示全屏 CG 插图，点击关闭
 */
const CgOverlay: React.FC<CgOverlayProps> = ({ cgId, onClose, className }) => {
  return (
    <motion.div
      className={`absolute inset-0 flex items-center justify-center bg-black/95 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={onClose}
    >
      <motion.img
        src={`/assets/cg/${cgId}`}
        alt="CG"
        className="max-w-[95vw] max-h-[95vh] object-contain cursor-pointer"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <motion.p 
        className="absolute bottom-8 text-white/50 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        点击关闭
      </motion.p>
    </motion.div>
  );
};

export default CgOverlay;

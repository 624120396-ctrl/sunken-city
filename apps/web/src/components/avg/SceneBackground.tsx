import React from 'react';
import { motion } from 'framer-motion';

interface SceneBackgroundProps {
  backgroundId: string;
  className?: string;
}

/**
 * 场景背景层 (Layer 1)
 * z-index: 200
 * 职责：渲染场景背景图，支持淡入淡出过渡
 */
const SceneBackground: React.FC<SceneBackgroundProps> = ({ backgroundId, className }) => {
  return (
    <motion.div
      className={`absolute inset-0 ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <img
        src={`/assets/backgrounds/${backgroundId}`}
        alt="Scene"
        className="w-full h-full object-cover"
        onError={(e) => {
          // 如果背景图加载失败，使用默认背景色
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    </motion.div>
  );
};

export default SceneBackground;

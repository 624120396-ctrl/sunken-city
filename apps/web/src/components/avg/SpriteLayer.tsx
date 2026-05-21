import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Sprite {
  id: string;
  imageUrl: string;
  position: 'left' | 'center' | 'right' | { x: number; y: number };
  emotion: string;
  opacity: number;
  scale: number;
}

interface SpriteLayerProps {
  sprites: Sprite[];
  className?: string;
}

/**
 * 获取立绘位置样式
 */
const getPositionStyle = (position: Sprite['position']): React.CSSProperties => {
  if (typeof position === 'string') {
    switch (position) {
      case 'left':
        return { left: '5%', bottom: '10%' };
      case 'center':
        return { left: '50%', transform: 'translateX(-50%)', bottom: '8%' };
      case 'right':
        return { right: '5%', bottom: '10%' };
    }
  }
  return { left: `${position.x}%`, bottom: `${position.y}%` };
};

/**
 * 角色立绘层 (Layer 3)
 * z-index: 400
 * 职责：渲染角色立绘，支持多角色同时显示、表情切换、入退场动画
 */
const SpriteLayer: React.FC<SpriteLayerProps> = ({ sprites, className }) => {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <AnimatePresence mode="wait">
        {sprites.map((sprite) => (
          <motion.div
            key={sprite.id}
            className="absolute"
            style={getPositionStyle(sprite.position)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: sprite.opacity, scale: sprite.scale }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <img
              src={sprite.imageUrl}
              alt={sprite.id}
              className="h-auto max-h-[75vh] object-contain drop-shadow-2xl"
              style={{ maxWidth: '45vw' }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default SpriteLayer;

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SceneBackground from './SceneBackground';
import SpriteLayer from './SpriteLayer';
import CgOverlay from './CgOverlay';
import StoryDialogBox from './StoryDialogBox';
import EffectLayer from './EffectLayer';

export interface WorldState {
  backgroundId: string;
  cgId?: string;
  sprites: Sprite[];
  dialog: DialogData | null;
  effect?: {
    type: 'fade' | 'dissolve' | 'wipe' | 'glitch' | 'ripple';
    duration: number;
  };
  filter?: string;
}

export interface Sprite {
  id: string;
  imageUrl: string;
  position: 'left' | 'center' | 'right' | { x: number; y: number };
  emotion: string;
  opacity: number;
  scale: number;
}

export interface DialogData {
  speaker: string;
  avatarUrl: string;
  text: string;
  textColor: string;
}

interface SoloPlayerPageProps {
  initialWorldState?: WorldState;
}

/**
 * 六层 AVG 渲染管线示例组件
 * 
 * 层级结构（从下到上）：
 * - z-0:   SceneBackground (场景背景)
 * - z-5:   FilterLayer (全局滤镜 - 通过 CSS filter 实现)
 * - z-10:  SpriteLayer (角色立绘)
 * - z-20:  CgOverlay (CG全屏层)
 * - z-30:  StoryDialogBox (对话框 - UI层)
 * - z-40:  EffectLayer (转场特效)
 */
const SoloPlayerPage: React.FC<SoloPlayerPageProps> = ({ 
  initialWorldState 
}) => {
  const defaultState: WorldState = {
    backgroundId: 'default',
    sprites: [],
    dialog: null,
  };

  const [worldState, setWorldState] = useState<WorldState>(initialWorldState || defaultState);
  const [filterStyle] = useState<string>('none');

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* L0: 场景背景 */}
      <div className="absolute inset-0 z-0">
        <SceneBackground backgroundId={worldState.backgroundId} />
      </div>
      
      {/* L1: 全局滤镜层 */}
      {filterStyle !== 'none' && (
        <motion.div 
          className="absolute inset-0 z-[5] pointer-events-none"
          style={{ 
            backdropFilter: filterStyle,
            WebkitBackdropFilter: filterStyle 
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
      
      {/* L2: 角色立绘层 */}
      <div className="absolute inset-0 z-10">
        <SpriteLayer sprites={worldState.sprites} />
      </div>
      
      {/* L3: CG 全屏层 */}
      {worldState.cgId && (
        <div className="absolute inset-0 z-20">
          <CgOverlay
            cgId={worldState.cgId}
            onClose={() => setWorldState(prev => ({ ...prev, cgId: undefined }))}
          />
        </div>
      )}
      
      {/* L4: UI 层 (对话框) */}
      {worldState.dialog && (
        <div className="absolute inset-0 z-30 pointer-events-none">
          <StoryDialogBox 
            dialog={worldState.dialog} 
            onFinish={() => {}} 
            className="pointer-events-auto"
          />
        </div>
      )}
      
      {/* L5: 特效层 */}
      {worldState.effect && (
        <div className="absolute inset-0 z-40">
          <EffectLayer
            effect={worldState.effect}
            onComplete={() => setWorldState(prev => ({ ...prev, effect: undefined }))}
          />
        </div>
      )}
    </div>
  );
};

export default SoloPlayerPage;

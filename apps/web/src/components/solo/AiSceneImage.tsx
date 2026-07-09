import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AiSceneImageProps {
  src?: string | null;
  alt?: string;
  fallbackPrompt?: string;
}

export function AiSceneImage({ src, alt = '场景图', fallbackPrompt }: AiSceneImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="solo-scene-image relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40">
      <AnimatePresence mode="wait">
        {!loaded && !error && (
          <motion.div
            key="placeholder"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="text-center space-y-2 px-4">
              <div className="w-10 h-10 mx-auto rounded-full border-2 border-white/20 border-t-amber-400 animate-spin" />
              <p className="text-xs text-slate-400">{fallbackPrompt || '场景氛围渲染中...'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {src && !error && (
        <motion.img
          key={src}
          src={src}
          alt={alt}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: loaded ? 1 : 0, scale: loaded ? 1 : 1.02 }}
          transition={{ duration: 0.8 }}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {!src && error && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
          场景图暂时无法显示
        </div>
      )}
    </div>
  );
}

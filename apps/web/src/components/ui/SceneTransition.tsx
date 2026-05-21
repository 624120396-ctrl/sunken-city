import { useEffect, useRef, useState } from 'react';
import { cn } from '@lib/utils';
import { animateSceneTransition } from '@lib/animation';

interface SceneTransitionProps {
  children: React.ReactNode;
  sceneKey: string;
  className?: string;
  onTransitionComplete?: () => void;
}

export function SceneTransition({
  children,
  sceneKey,
  className,
  onTransitionComplete,
}: SceneTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [currentScene, setCurrentScene] = useState(sceneKey);
  const [displayContent, setDisplayContent] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (sceneKey !== currentScene && !isTransitioning) {
      setIsTransitioning(true);

      // 先淡出当前场景
      if (ref.current) {
        ref.current.style.opacity = '0';
        ref.current.style.filter = 'blur(4px)';
        
        setTimeout(() => {
          setCurrentScene(sceneKey);
          setDisplayContent(children);
          
          // 淡入新场景
          requestAnimationFrame(() => {
            if (ref.current) {
              animateSceneTransition(ref.current, () => {
                setIsTransitioning(false);
                onTransitionComplete?.();
              });
            }
          });
        }, 300);
      }
    }
  }, [sceneKey, currentScene, isTransitioning, children, onTransitionComplete]);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-300',
        className
      )}
      style={{
        opacity: isTransitioning ? 0 : 1,
        filter: isTransitioning ? 'blur(4px)' : 'blur(0px)',
      }}
    >
      {displayContent}
    </div>
  );
}

/**
 * 页面级过渡组件（用于路由切换）
 */
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTransitioning(true);
    
    if (ref.current) {
      ref.current.style.opacity = '0';
      
      setTimeout(() => {
        setDisplayChildren(children);
        
        requestAnimationFrame(() => {
          if (ref.current) {
            animateSceneTransition(ref.current, () => {
              setIsTransitioning(false);
            });
          }
        });
      }, 200);
    }
  }, [location.pathname, children]);

  return (
    <div
      ref={ref}
      className="min-h-[100dvh]"
      style={{
        opacity: isTransitioning ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {displayChildren}
    </div>
  );
}

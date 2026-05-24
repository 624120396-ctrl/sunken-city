import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BG_MAP: Record<string, string> = {
  // 默认全局羊皮纸背景
  default: '/bg-vellum.png',
};

export function usePageBackground() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    let bg = BG_MAP.default;

    // 精确匹配
    if (BG_MAP[path]) {
      bg = BG_MAP[path];
    } else {
      // 前缀匹配
      for (const [prefix, url] of Object.entries(BG_MAP)) {
        if (path.startsWith(prefix) && prefix !== 'default') {
          bg = url;
          break;
        }
      }
    }

    document.body.style.backgroundImage = `url('${bg}')`;

    return () => {
      // cleanup if needed
    };
  }, [location.pathname]);
}

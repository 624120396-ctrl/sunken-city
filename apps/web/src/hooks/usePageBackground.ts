import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@stores/auth.store';

// 可用的全局背景映射
export const BG_OPTIONS: Record<string, { name: string; url: string }> = {
  'bg-vellum': { name: '羊皮纸', url: '/bg-vellum.png' },
  'bg-sunken': { name: '沉没之城', url: '/bg-sunken.png' },
  'bg-ocean-blue': { name: '深海蓝', url: '/bg-ocean-blue.png' },
  'bg-ruins-beige': { name: '废墟米', url: '/bg-ruins-beige.png' },
  'bg-deep-sea': { name: '深海遗迹', url: '/bg-deep-sea.png' },
  'bg-underwater-city': { name: '水下城邦', url: '/bg-underwater-city.png' },
  'bg-void-runes': { name: '虚空符文', url: '/bg-void-runes.png' },
};

export const DEFAULT_BG = '/bg-sunken.png';

export function usePageBackground() {
  const location = useLocation();
  const { user } = useAuthStore();

  useEffect(() => {
    // 用户偏好优先
    const userBg = user?.preferredBackground;
    const bg = userBg && BG_OPTIONS[userBg] ? BG_OPTIONS[userBg].url : DEFAULT_BG;

    document.body.style.backgroundImage = `url('${bg}')`;

    return () => {
      // cleanup if needed
    };
  }, [location.pathname, user?.preferredBackground]);
}

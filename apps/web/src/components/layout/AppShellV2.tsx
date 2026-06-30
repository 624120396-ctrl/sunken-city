import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { AppBackground } from '@components/background/AppBackground';
import { cn } from '@lib/utils';
import { useLayoutStore } from '@stores/layout.store';
import { MobileNavV2 } from './MobileNavV2';
import { SideNavV2 } from './SideNavV2';
import { TopNav } from './TopNav';

interface AppShellV2Props {
  children: ReactNode;
}

export function AppShellV2({ children }: AppShellV2Props) {
  const { sidebarCollapsed, isMobile, setMobile, toggleSidebar } = useLayoutStore();

  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [setMobile]);

  return (
    <div className="relative isolate min-h-[100dvh] text-[var(--coc-text-primary)]">
      <AppBackground />
      <TopNav />
      {!isMobile && <SideNavV2 collapsed={sidebarCollapsed} onToggle={toggleSidebar} />}
      <main
        className={cn(
          'fixed bottom-0 right-0 top-14 z-0 overflow-auto transition-all',
          isMobile
            ? 'left-0 px-3 pb-[calc(4.25rem+env(safe-area-inset-bottom))] pt-3'
            : sidebarCollapsed
              ? 'left-14 p-5'
              : 'left-56 p-5'
        )}
      >
        {children}
      </main>
      {isMobile && <MobileNavV2 />}
    </div>
  );
}

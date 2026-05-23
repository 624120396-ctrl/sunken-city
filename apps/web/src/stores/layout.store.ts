import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  isMobile: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobile: (v: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      isMobile: false,

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleMobileSidebar: () => set((s) => ({ sidebarMobileOpen: !s.sidebarMobileOpen })),
      setMobile: (v) => set({ isMobile: v }),
    }),
    {
      name: 'coc-layout',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);

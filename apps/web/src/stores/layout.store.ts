import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  isMobile: boolean;
  roomLeftPanelCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobile: (v: boolean) => void;
  toggleRoomLeftPanel: () => void;
  setRoomLeftPanelCollapsed: (v: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      sidebarMobileOpen: false,
      isMobile: false,

    roomLeftPanelCollapsed: false,

      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      toggleMobileSidebar: () => set((s) => ({ sidebarMobileOpen: !s.sidebarMobileOpen })),
      setMobile: (v) => set({ isMobile: v }),
      toggleRoomLeftPanel: () => set((s) => ({ roomLeftPanelCollapsed: !s.roomLeftPanelCollapsed })),
      setRoomLeftPanelCollapsed: (v) => set({ roomLeftPanelCollapsed: v }),
    }),
    {
      name: 'coc-layout',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed, roomLeftPanelCollapsed: state.roomLeftPanelCollapsed }),
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  displayId?: number;
  email: string;
  nickname: string;
  avatarUrl?: string;
  exp: number;
  displayedTitleKey: string | null;
  displayedTitleName?: string;
  rankName?: string;
  isAdmin: boolean;
  coins: number;
  stardust: number;
  equippedFrame?: string;
  frameUrl?: string;
  preferredBackground?: string | null;
  rank?: {
    level: number;
    name: string;
    icon: string;
    color: string;
  };
  displayBadge?: {
    type: 'rank' | 'title';
    name: string;
    icon: string;
    color: string;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => set({
        user,
        token,
        isAuthenticated: true,
      }),

      clearAuth: () => set({
        user: null,
        token: null,
        isAuthenticated: false,
      }),

      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null,
      })),
    }),
    {
      name: 'coc-auth-storage',
      version: 1,
      migrate: (persistedState: any) => {
        if (persistedState?.user) {
          const clean = (url?: string) => (url ? url.replace('http://43.254.167.183', '') : url);
          persistedState.user.avatarUrl = clean(persistedState.user.avatarUrl);
          persistedState.user.frameUrl = clean(persistedState.user.frameUrl);
        }
        return persistedState;
      },
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
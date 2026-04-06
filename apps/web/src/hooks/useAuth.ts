import { useAuthStore } from '@stores/auth.store';

export function useAuth() {
  const { token, isAuthenticated } = useAuthStore();
  
  return {
    isAuthenticated,
    token,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
}
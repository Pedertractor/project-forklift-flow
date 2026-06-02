import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/auth.store';

/** Limpa cache do React Query e sessão persistida (localStorage). */
export function performLogout(): void {
  queryClient.clear();
  useAuthStore.getState().logout();
}

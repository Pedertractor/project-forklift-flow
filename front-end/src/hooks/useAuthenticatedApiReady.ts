import { ENV } from '@/constants/env';
import { useAuthStore } from '@/store/auth.store';
import { useSessionRole } from '@/hooks/useAuthMe';

/** API pronta: JWT presente e perfil sincronizado com `GET /auth/me`. */
export function useAuthenticatedApiReady(): boolean {
  const token = useAuthStore((s) => s.token);
  const { isBootstrapping } = useSessionRole();
  return Boolean(ENV.API_URL && token && !isBootstrapping);
}

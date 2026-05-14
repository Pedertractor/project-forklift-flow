import { useMutation } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import type { LoginPayload } from '@/schemas/auth.schema';
import { loginWithPassword } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginWithPassword(payload),
    onSuccess: ({ token, user, requiresPasswordChange }) => {
      if (token) {
        setSession({ token, user, requiresPasswordChange });
        if (requiresPasswordChange) {
          toast.info('Defina uma nova senha para acessar o sistema.');
        } else {
          toast.success('Login realizado.');
        }
      }
    },
    onError: toastApiError,
  });
}

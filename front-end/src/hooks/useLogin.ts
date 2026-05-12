import { useMutation } from '@tanstack/react-query';
import { loginWithPassword } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import type { LoginPayload } from '@/schemas/auth.schema';

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginWithPassword(payload),
    onSuccess: ({ token, user }) => {
      setSession(token, user);
    },
  });
}

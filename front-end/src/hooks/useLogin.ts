import { useMutation } from '@tanstack/react-query';
import { loginWithPassword } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import type { LoginPayload } from '@/schemas/auth.schema';

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginWithPassword(payload),
    onSuccess: (user) => {
      setUser(user);
    },
  });
}

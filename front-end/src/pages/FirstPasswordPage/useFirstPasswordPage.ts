import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '@/lib/toast';
import { toastApiError } from '@/lib/toast-helpers';
import { firstPasswordSchema, type FirstPasswordForm } from '@/schemas/first-password.schema';
import { changeOwnPassword } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { resolvePostLoginPath } from '@/lib/route-access';

type FirstPasswordLocationState = { from?: { pathname?: string } } | null | undefined;

export function useFirstPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  const form = useForm<FirstPasswordForm>({
    resolver: zodResolver(firstPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const mut = useMutation({
    mutationFn: (data: FirstPasswordForm) =>
      changeOwnPassword({ newPassword: data.newPassword.trim() }),
    onSuccess: (newToken) => {
      const u = useAuthStore.getState().user;
      if (u) {
        setSession({ token: newToken, user: u, requiresPasswordChange: false });
      }
      toast.success('Senha atualizada com sucesso.');
      const role = useAuthStore.getState().user?.role;
      const fromPath = (location.state as FirstPasswordLocationState)?.from?.pathname;
      navigate(resolvePostLoginPath(fromPath, role), { replace: true });
    },
    onError: toastApiError,
  });

  function onSubmit(data: FirstPasswordForm) {
    mut.mutate(data);
  }

  return {
    user,
    form,
    onSubmit: form.handleSubmit(onSubmit),
    mut,
  };
}

export type FirstPasswordPageViewModel = ReturnType<typeof useFirstPasswordPage>;

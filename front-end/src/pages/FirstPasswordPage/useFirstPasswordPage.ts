import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { changeOwnPassword } from '@/services/auth.service';
import { firstPasswordSchema, type FirstPasswordForm } from '@/schemas/first-password.schema';
import { useAuthStore } from '@/store/auth.store';

export function useFirstPasswordPage() {
  const navigate = useNavigate();
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
      navigate('/', { replace: true });
    },
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

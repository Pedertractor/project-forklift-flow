import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { shouldClearSessionAfterMeFailure } from '@/hooks/useAuthMe';
import { fetchAuthMe } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { mapLoginUserToAppUser } from '@/types/auth-api.types';
import { resolvePostLoginPath } from '@/lib/route-access';

const loginBootstrapQueryKey = ['auth', 'me', 'login-bootstrap'] as const;

type LoginLocationState = { from?: { pathname?: string } } | null | undefined;

export function useLoginPage(): { isRestoringSession: boolean } {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const syncSessionFromProfile = useAuthStore((s) => s.syncSessionFromProfile);
  const logout = useAuthStore((s) => s.logout);

  const fromState = (location.state as LoginLocationState)?.from?.pathname;
  const fromPath = fromState ?? '/';

  const bootstrapQuery = useQuery({
    queryKey: [...loginBootstrapQueryKey, token ?? ''],
    queryFn: fetchAuthMe,
    enabled: Boolean(token),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (!bootstrapQuery.isSuccess || !bootstrapQuery.data || !token) {
      return;
    }
    const mapped = mapLoginUserToAppUser(bootstrapQuery.data);
    syncSessionFromProfile(mapped, bootstrapQuery.data.firstAccess);
    if (bootstrapQuery.data.firstAccess) {
      navigate('/definir-senha', { replace: true });
      return;
    }
    navigate(resolvePostLoginPath(fromPath, mapped.role), { replace: true });
  }, [
    bootstrapQuery.isSuccess,
    bootstrapQuery.data,
    token,
    syncSessionFromProfile,
    navigate,
    fromPath,
  ]);

  useEffect(() => {
    if (!bootstrapQuery.isError || !token) {
      return;
    }
    const message = bootstrapQuery.error instanceof Error ? bootstrapQuery.error.message : '';
    if (!shouldClearSessionAfterMeFailure(message)) {
      return;
    }
    logout();
  }, [bootstrapQuery.isError, bootstrapQuery.error, token, logout]);

  const isRestoringSession =
    Boolean(token) &&
    (bootstrapQuery.isPending ||
      bootstrapQuery.isFetching ||
      bootstrapQuery.isSuccess);

  return { isRestoringSession };
}

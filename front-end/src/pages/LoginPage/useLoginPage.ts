import { useQuery } from '@tanstack/react-query';
import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  authMeQueryKeyBase,
  shouldClearSessionAfterMeFailure,
} from '@/hooks/useAuthMe';
import { performLogout } from '@/lib/auth-session';
import { fetchAuthMe } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { mapLoginUserToAppUser } from '@/types/auth-api.types';
import { resolvePostLoginPath } from '@/lib/route-access';

type LoginLocationState = { from?: { pathname?: string } } | null | undefined;

export function useLoginPage(): { isRestoringSession: boolean } {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const syncSessionFromProfile = useAuthStore((s) => s.syncSessionFromProfile);

  const fromState = (location.state as LoginLocationState)?.from?.pathname;
  const fromPath = fromState ?? '/';

  const bootstrapQuery = useQuery({
    queryKey: [...authMeQueryKeyBase, token ?? ''],
    queryFn: fetchAuthMe,
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: false,
  });

  useLayoutEffect(() => {
    if (!bootstrapQuery.isSuccess || !bootstrapQuery.data || !token) {
      return;
    }
    const mapped = mapLoginUserToAppUser(bootstrapQuery.data);
    syncSessionFromProfile(
      mapped,
      bootstrapQuery.data.firstAccess,
      bootstrapQuery.data.token,
    );
  }, [
    bootstrapQuery.isSuccess,
    bootstrapQuery.data,
    token,
    syncSessionFromProfile,
  ]);

  useEffect(() => {
    if (!bootstrapQuery.isSuccess || !bootstrapQuery.data || !token) {
      return;
    }
    const mapped = mapLoginUserToAppUser(bootstrapQuery.data);
    if (bootstrapQuery.data.firstAccess) {
      navigate('/definir-senha', { replace: true });
      return;
    }
    navigate(resolvePostLoginPath(fromPath, mapped.role), { replace: true });
  }, [
    bootstrapQuery.isSuccess,
    bootstrapQuery.data,
    token,
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
    performLogout();
  }, [bootstrapQuery.isError, bootstrapQuery.error, token]);

  const isRestoringSession =
    Boolean(token) &&
    (bootstrapQuery.isPending ||
      bootstrapQuery.isFetching ||
      bootstrapQuery.isSuccess);

  return { isRestoringSession };
}

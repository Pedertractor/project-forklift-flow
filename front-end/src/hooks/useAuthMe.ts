import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAuthMe } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { mapLoginUserToAppUser } from '@/types/auth-api.types';

/** Prefix for `GET /auth/me` cache; full key includes the token segment. */
export const authMeQueryKeyBase = ['auth', 'me'] as const;

function shouldClearSessionAfterMeFailure(message: string): boolean {
  return (
    message === 'Nao autorizado' ||
    message.includes('Token invalido') ||
    message === 'Usuario nao encontrado.'
  );
}

/**
 * Keeps session aligned with the server (`GET /auth/me`): role, sector, first-access flag.
 * Runs while a JWT exists (private routes). Clears session on definitive auth failures.
 */
export function useAuthMe() {
  const token = useAuthStore((s) => s.token);
  const syncSessionFromProfile = useAuthStore((s) => s.syncSessionFromProfile);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const query = useQuery({
    queryKey: [...authMeQueryKeyBase, token ?? ''],
    queryFn: fetchAuthMe,
    enabled: Boolean(token),
    staleTime: 120_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }
    syncSessionFromProfile(mapLoginUserToAppUser(query.data), query.data.firstAccess);
  }, [query.data, syncSessionFromProfile]);

  useEffect(() => {
    if (!query.isError || query.error == null) {
      return;
    }
    if (!useAuthStore.getState().token) {
      return;
    }
    const message = query.error instanceof Error ? query.error.message : '';
    if (!shouldClearSessionAfterMeFailure(message)) {
      return;
    }
    logout();
    navigate('/login', { replace: true });
  }, [query.isError, query.error, logout, navigate]);

  return query;
}

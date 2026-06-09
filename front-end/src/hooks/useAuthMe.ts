import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { performLogout } from '@/lib/auth-session';
import { fetchAuthMe } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { mapLoginUserToAppUser } from '@/types/auth-api.types';

/** Prefix for `GET /auth/me` cache; full key includes the token segment. */
export const authMeQueryKeyBase = ['auth', 'me'] as const;

export function shouldClearSessionAfterMeFailure(message: string): boolean {
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const previousTokenRef = useRef<string | null>(token);

  const query = useQuery({
    queryKey: [...authMeQueryKeyBase, token ?? ''],
    queryFn: fetchAuthMe,
    enabled: Boolean(token),
    /** Perfil muda raramente; evita bloquear a UI a cada reload/navegação. */
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  useEffect(() => {
    if (!query.data) {
      return;
    }
    syncSessionFromProfile(
      mapLoginUserToAppUser(query.data),
      query.data.firstAccess,
      query.data.token,
    );
    if (query.data.token && query.data.token !== previousTokenRef.current) {
      previousTokenRef.current = query.data.token;
      void queryClient.invalidateQueries();
    }
  }, [query.data, queryClient, syncSessionFromProfile]);

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
    performLogout();
    navigate('/login', { replace: true });
  }, [query.isError, query.error, navigate]);

  return query;
}

/**
 * Papel efetivo da sessão: prioriza `GET /auth/me` para não usar role desatualizada do localStorage.
 */
export function useSessionRole(): {
  role: string | undefined;
  /** Aguardando primeira resposta de `/auth/me` com JWT presente. */
  isBootstrapping: boolean;
} {
  const token = useAuthStore((s) => s.token);
  const storeUser = useAuthStore((s) => s.user);
  const meQuery = useAuthMe();

  return {
    role: meQuery.data?.role ?? storeUser?.role,
    isBootstrapping: Boolean(token) && !meQuery.isFetched,
  };
}
